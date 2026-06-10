import express from "express";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { encrypt } from "./lib/crypto";
import { wasender } from "./wasender/client";
import { startSendWorker } from "./queues/sendQueue";
import {
  countEligibleLeads,
  getBatchProgress,
  getTenantSendStats,
  runManualDispatch,
} from "./jobs/manualDispatch";
import {
  scheduleSubscriptionExpiry,
  startExpiryWorker,
} from "./jobs/subscriptionExpiryCron";
import {
  handleSharedWasenderWebhook,
  handleWasenderWebhook,
} from "./webhooks/wasender";
import {
  SHARED_WHATSAPP_SESSION_ID,
} from "./whatsapp/resolveSession";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";

const app = express();
const PORT = Number(process.env.WORKER_PORT ?? 8080);
const WORKER_URL = process.env.WORKER_URL ?? `http://localhost:${PORT}`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function appWebhookUrl(path: string): string {
  return `${APP_URL.replace(/\/$/, "")}${path}`;
}

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/whatsapp/sessions/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { phoneNumber } = req.body as { phoneNumber?: string };

  if (!phoneNumber) {
    res.status(400).json({
      error: "Numéro de téléphone requis (format international, ex. +237670000000)",
    });
    return;
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(404).json({ error: "Tenant introuvable" });
      return;
    }

    const tier = effectivePlanTier(
      tenant.planTier,
      tenant.subscriptionStatus,
      tenant.subscriptionExpiresAt
    );

    if (usesSharedWhatsapp(tier)) {
      res.status(403).json({
        error:
          "Votre plan utilise le numéro WhatsApp partagé Kaptano. Passez au plan Growth pour connecter votre propre numéro.",
      });
      return;
    }

    const webhookUrl = appWebhookUrl(`/api/webhooks/wasender/${tenantId}`);

    const sessionData = await wasender.createSession(
      webhookUrl,
      phoneNumber,
      tenant.name
    );
    const qrData = await wasender.getSessionQr(sessionData.id);
    const initialStatus = qrData.alreadyConnected ? "CONNECTED" : "PENDING";

    const session = await prisma.whatsappSession.upsert({
      where: { tenantId },
      create: {
        tenantId,
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? phoneNumber,
        status: initialStatus,
        lastConnectedAt: qrData.alreadyConnected ? new Date() : undefined,
      },
      update: {
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? phoneNumber,
        status: initialStatus,
        lastConnectedAt: qrData.alreadyConnected ? new Date() : undefined,
      },
    });

    res.json({
      session: { id: session.id, status: session.status },
      qrCode: qrData.qr,
      alreadyConnected: qrData.alreadyConnected ?? false,
      webhookUrl,
    });
  } catch (err) {
    logger.error({ err, tenantId }, "Session creation failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.post("/webhooks/wasender/:tenantId", (req, res) => {
  void handleWasenderWebhook(req, res);
});

app.post("/webhooks/wasender/shared", (req, res) => {
  void handleSharedWasenderWebhook(req, res);
});

app.get("/whatsapp/shared-session", async (_req, res) => {
  try {
    const session = await prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
    });

    res.json({
      session: session
        ? {
            status: session.status,
            phoneNumber: session.phoneNumber,
            lastConnectedAt: session.lastConnectedAt,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.post("/whatsapp/shared-session", async (req, res) => {
  const { phoneNumber } = req.body as { phoneNumber?: string };

  if (!phoneNumber) {
    res.status(400).json({
      error: "Numéro de téléphone requis (format international, ex. +237670000000)",
    });
    return;
  }

  try {
    const webhookUrl = appWebhookUrl("/api/webhooks/wasender/shared");

    const sessionData = await wasender.createSession(
      webhookUrl,
      phoneNumber,
      "Kaptano — numéro partagé"
    );
    const qrData = await wasender.getSessionQr(sessionData.id);

    const session = await prisma.sharedWhatsappSession.upsert({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
      create: {
        id: SHARED_WHATSAPP_SESSION_ID,
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? phoneNumber,
        status: "PENDING",
      },
      update: {
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? phoneNumber,
        status: "PENDING",
      },
    });

    res.json({
      session: { id: session.id, status: session.status, phoneNumber: session.phoneNumber },
      qrCode: qrData.qr,
      webhookUrl,
    });
  } catch (err) {
    logger.error({ err }, "Shared session creation failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.get("/whatsapp/dispatch/:tenantId/preview", async (req, res) => {
  const { tenantId } = req.params;
  const standId = req.query.standId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  try {
    const [eligible, stats] = await Promise.all([
      countEligibleLeads(tenantId, { standId, from, to }),
      getTenantSendStats(tenantId),
    ]);
    res.json({ eligible, remainingToday: stats.remainingToday });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.post("/whatsapp/dispatch/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const { standId, from, to } = req.body as {
    standId?: string;
    from?: string;
    to?: string;
  };

  try {
    const result = await runManualDispatch(tenantId, { standId, from, to });
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.get("/whatsapp/dispatch/:tenantId/:batchId", async (req, res) => {
  const { tenantId, batchId } = req.params;

  try {
    const progress = await getBatchProgress(tenantId, batchId);
    if (!progress) {
      res.status(404).json({ error: "Campagne introuvable" });
      return;
    }
    res.json(progress);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

app.get("/whatsapp/stats/:tenantId", async (req, res) => {
  try {
    const stats = await getTenantSendStats(req.params.tenantId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur serveur",
    });
  }
});

async function bootstrap() {
  startSendWorker();
  startExpiryWorker();
  await scheduleSubscriptionExpiry();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Kaptano worker started");
  });
}

bootstrap().catch((err) => {
  logger.error(err, "Worker bootstrap failed");
  process.exit(1);
});
