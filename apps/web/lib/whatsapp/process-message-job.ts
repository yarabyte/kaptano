import {
  DAILY_SEND_CAP,
  LEAD_CAPTURE_THANK_YOU_TEMPLATE,
  applyMessagePlaceholders,
  getFirstName,
  type WhatsappMessageType,
} from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import {
  buildOutboundMessage,
  sendOutboundMessage,
  type WasenderOutboundMessage,
} from "@/lib/whatsapp/outbound";
import { resolveWhatsappCredentials } from "@/lib/whatsapp/resolve-session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function processMessageJob(messageJobId: string): Promise<void> {
  const job = await prisma.messageJob.findUnique({
    where: { id: messageJobId },
    include: {
      lead: {
        include: {
          stand: { include: { catalog: true } },
        },
      },
      tenant: {
        include: {
          catalogs: { where: { isDefault: true }, take: 1 },
        },
      },
    },
  });

  if (!job) {
    throw new Error("MessageJob introuvable");
  }

  if (!job.lead.optInConsent) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: "Pas de consentement opt-in" },
    });
    throw new Error("Pas de consentement opt-in");
  }

  const credentials = await resolveWhatsappCredentials(job.tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
    const lastError = credentials.isShared
      ? "Numéro WhatsApp partagé non disponible"
      : "Session WhatsApp non connectée";
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError },
    });
    throw new Error(lastError);
  }

  const todayCount = await prisma.messageJob.count({
    where: {
      tenantId: job.tenantId,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      sentAt: { gte: startOfDay(new Date()) },
    },
  });

  if (todayCount >= DAILY_SEND_CAP) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: "Plafond quotidien atteint" },
    });
    throw new Error("Plafond quotidien atteint");
  }

  await prisma.messageJob.update({
    where: { id: job.id },
    data: { status: "SENDING", attempts: { increment: 1 } },
  });

  const tenant = job.tenant;
  const catalog = job.lead.stand?.catalog ?? tenant?.catalogs[0] ?? null;

  const placeholders = {
    prenom: getFirstName(job.lead.fullName),
    entreprise: job.lead.company ?? tenant?.name ?? "",
    lien: `${APP_URL.replace(/\/$/, "")}/r/${job.id}`,
  };

  const messageType = (tenant?.whatsappMessageType ?? "TEXT") as WhatsappMessageType;
  if (messageType !== "TEXT" && !tenant?.whatsappMessageConfig) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError: "Configuration du message WhatsApp incomplète",
      },
    });
    throw new Error("Configuration du message WhatsApp incomplète");
  }

  const catalogUrl = catalog?.publicUrl ?? null;
  let outbound: WasenderOutboundMessage;

  try {
    if (messageType === "DOCUMENT" && !catalogUrl) {
      outbound = {
        kind: "text",
        to: job.lead.whatsappNumber,
        text: applyMessagePlaceholders(LEAD_CAPTURE_THANK_YOU_TEMPLATE, placeholders),
      };
    } else {
      outbound = buildOutboundMessage(
        messageType,
        tenant?.whatsappMessageConfig ?? null,
        job.lead.whatsappNumber,
        placeholders,
        catalogUrl,
        catalog?.name ?? "catalogue.pdf"
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Configuration invalide";
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: message },
    });
    throw err;
  }

  try {
    const result = await sendOutboundMessage(job.tenantId, outbound);
    await prisma.messageJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        wasenderMessageId: result.message_id,
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const attempts = job.attempts + 1;
    await prisma.messageJob.update({
      where: { id: job.id },
      data: {
        status: attempts >= 3 ? "FAILED" : "QUEUED",
        lastError: message,
      },
    });
    throw err;
  }
}
