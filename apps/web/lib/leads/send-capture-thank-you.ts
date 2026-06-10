import { prisma } from "@/lib/prisma";
import { getTenantDailySendCap } from "@/lib/whatsapp/rate-limits";
import { processMessageJob } from "@/lib/whatsapp/process-message-job";

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

  const tenantDailyCap = await getTenantDailySendCap();
  if (todaySent >= tenantDailyCap) {
    return { sent: false, error: "Plafond quotidien d'envois WhatsApp atteint" };
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });

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

  try {
    await processMessageJob(messageJob.id);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec envoi WhatsApp";
    return { sent: false, error: message };
  }
}
