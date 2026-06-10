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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type CaptureThankYouResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

export async function sendCaptureThankYou(
  tenantId: string,
  leadId: string
): Promise<CaptureThankYouResult> {
  const existingJob = await prisma.messageJob.findUnique({
    where: { leadId },
  });
  if (existingJob) {
    return { sent: false, skipped: true };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySent = await prisma.messageJob.count({
    where: {
      tenantId,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      sentAt: { gte: startOfDay },
    },
  });

  if (todaySent >= DAILY_SEND_CAP) {
    return { sent: false, error: "Plafond quotidien d'envois WhatsApp atteint" };
  }

  const [lead, tenant] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        stand: { include: { catalog: true } },
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        whatsappMessageType: true,
        whatsappMessageConfig: true,
        catalogs: { where: { isDefault: true }, take: 1 },
      },
    }),
  ]);

  if (!lead?.optInConsent) {
    return { sent: false, skipped: true };
  }

  const messageJob = await prisma.messageJob.create({
    data: {
      tenantId,
      leadId: lead.id,
      status: "QUEUED",
      scheduledFor: new Date(),
    },
  });

  const catalog =
    lead.stand?.catalog ?? tenant.catalogs[0] ?? null;

  const placeholders = {
    prenom: getFirstName(lead.fullName),
    entreprise: lead.company ?? tenant.name,
    lien: `${APP_URL.replace(/\/$/, "")}/r/${messageJob.id}`,
  };

  try {
    const messageType = tenant.whatsappMessageType as WhatsappMessageType;
    const catalogUrl = catalog?.publicUrl ?? null;
    let outbound: WasenderOutboundMessage;

    if (messageType === "DOCUMENT" && !catalogUrl) {
      outbound = {
        kind: "text",
        to: lead.whatsappNumber,
        text: applyMessagePlaceholders(LEAD_CAPTURE_THANK_YOU_TEMPLATE, placeholders),
      };
    } else {
      outbound = buildOutboundMessage(
        messageType,
        tenant.whatsappMessageConfig,
        lead.whatsappNumber,
        placeholders,
        catalogUrl,
        catalog?.name ?? "catalogue.pdf"
      );
    }

    const result = await sendOutboundMessage(tenantId, outbound);

    await prisma.messageJob.update({
      where: { id: messageJob.id },
      data: {
        status: "SENT",
        wasenderMessageId: result.message_id,
        sentAt: new Date(),
        lastError: null,
      },
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec envoi WhatsApp";
    await prisma.messageJob.update({
      where: { id: messageJob.id },
      data: {
        status: "FAILED",
        lastError: message,
      },
    });
    return { sent: false, error: message };
  }
}
