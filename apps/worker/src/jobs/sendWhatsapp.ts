import {
  WHATSAPP_MESSAGE_TEMPLATE,
  DAILY_SEND_CAP,
  getFirstName,
  applyMessagePlaceholders,
  parseWhatsappMessageConfig,
  type WhatsappMessageType,
  type MessagePlaceholderVars,
} from "@kaptano/shared";
import type { Prisma } from "@kaptano/db";
import { prisma } from "../lib/prisma";
import { decrypt } from "../lib/crypto";
import { wasender, type WasenderOutboundMessage } from "../wasender/client";
import { resolveWhatsappCredentials } from "../whatsapp/resolveSession";
import { logger } from "../lib/logger";
import type { SendJobData } from "../queues/sendQueue";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function processSendJob(data: SendJobData): Promise<void> {
  const job = await prisma.messageJob.findUnique({
    where: { id: data.messageJobId },
    include: {
      lead: {
        include: {
          stand: { include: { catalog: true } },
        },
      },
      tenant: {
        include: {
          whatsappSession: true,
          catalogs: { where: { isDefault: true }, take: 1 },
        },
      },
    },
  });

  if (!job) {
    logger.warn({ messageJobId: data.messageJobId }, "MessageJob introuvable");
    return;
  }

  if (!job.lead.optInConsent) {
    logger.warn({ leadId: job.leadId }, "Lead sans opt-in — envoi annulé");
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: "Pas de consentement opt-in" },
    });
    return;
  }

  const tenant = job.tenant;
  const credentials = await resolveWhatsappCredentials(job.tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError: credentials.isShared
          ? "Numéro WhatsApp partagé non disponible"
          : "Session WhatsApp non connectée",
      },
    });
    return;
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
    return;
  }

  const catalog =
    job.lead.stand?.catalog ?? tenant?.catalogs[0] ?? null;

  const placeholders: MessagePlaceholderVars = {
    prenom: getFirstName(job.lead.fullName),
    entreprise: job.lead.company ?? tenant?.name ?? "",
    lien: `${APP_URL}/r/${job.id}`,
  };

  const messageType = tenant?.whatsappMessageType ?? "TEXT";
  if (messageType !== "TEXT" && !tenant?.whatsappMessageConfig) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError: "Configuration du message WhatsApp incomplète",
      },
    });
    return;
  }

  let pollSnapshot: Prisma.InputJsonValue | undefined;
  if (messageType === "POLL") {
    const pollConfig = parseWhatsappMessageConfig(
      "POLL",
      tenant?.whatsappMessageConfig ?? {}
    ) as { question: string; options: string[]; multiSelect?: boolean };
    pollSnapshot = {
      question: pollConfig.question,
      options: pollConfig.options,
      multiSelect: pollConfig.multiSelect,
    };
  }

  await prisma.messageJob.update({
    where: { id: job.id },
    data: {
      status: "SENDING",
      attempts: { increment: 1 },
      isPoll: messageType === "POLL",
      pollSnapshot,
    },
  });

  let outbound: WasenderOutboundMessage;
  try {
    outbound = buildOutboundMessage(
      messageType,
      tenant?.whatsappMessageConfig ?? null,
      job.lead.whatsappNumber,
      placeholders,
      catalog?.publicUrl ?? null,
      catalog?.name ?? "catalogue.pdf"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Configuration invalide";
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: message },
    });
    return;
  }

  try {
    const apiKey = decrypt(credentials.apiKeyEncrypted);
    const result = await wasender.send(apiKey, outbound);

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

function buildOutboundMessage(
  messageType: WhatsappMessageType,
  rawConfig: Prisma.JsonValue | null,
  to: string,
  placeholders: MessagePlaceholderVars,
  catalogUrl: string | null,
  catalogName: string
): WasenderOutboundMessage {
  const config = parseWhatsappMessageConfig(
    messageType,
    rawConfig ?? {}
  );

  switch (messageType) {
    case "IMAGE": {
      const imageConfig = config as {
        text?: string;
        imageUrl: string;
      };
      if (!imageConfig.imageUrl) {
        throw new Error("URL d'image manquante dans la configuration");
      }
      return {
        kind: "image",
        to,
        imageUrl: imageConfig.imageUrl,
        text: imageConfig.text
          ? applyMessagePlaceholders(imageConfig.text, placeholders)
          : undefined,
      };
    }
    case "DOCUMENT": {
      const docConfig = config as {
        text?: string;
        documentUrl?: string;
        fileName?: string;
        useCatalog?: boolean;
      };
      const documentUrl = docConfig.useCatalog
        ? catalogUrl
        : docConfig.documentUrl;
      if (!documentUrl) {
        throw new Error(
          docConfig.useCatalog
            ? "Aucun catalogue disponible pour l'envoi"
            : "URL de document manquante dans la configuration"
        );
      }
      return {
        kind: "document",
        to,
        documentUrl,
        fileName: docConfig.fileName ?? catalogName,
        text: docConfig.text
          ? applyMessagePlaceholders(docConfig.text, placeholders)
          : undefined,
      };
    }
    case "POLL": {
      const pollConfig = config as {
        question: string;
        options: string[];
        multiSelect?: boolean;
      };
      return {
        kind: "poll",
        to,
        poll: {
          question: applyMessagePlaceholders(pollConfig.question, placeholders),
          options: pollConfig.options.map((option) =>
            applyMessagePlaceholders(option, placeholders)
          ),
          multiSelect: pollConfig.multiSelect ?? false,
        },
      };
    }
    default: {
      const textConfig = config as { text?: string };
      const template = textConfig.text ?? WHATSAPP_MESSAGE_TEMPLATE;
      return {
        kind: "text",
        to,
        text: applyMessagePlaceholders(template, placeholders),
      };
    }
  }
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
