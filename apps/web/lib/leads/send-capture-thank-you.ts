import {
  assertLeadDailyMessageQuota,
  countLeadMessageJobsToday,
  startOfLocalDay,
} from "@kaptano/db";
import { prisma } from "@/lib/prisma";
import { getTenantDailySendCap } from "@/lib/whatsapp/rate-limits";
import { processMessageJob } from "@/lib/whatsapp/process-message-job";
import { runInBackground } from "@/lib/background-task";

export type CaptureThankYouResult = {
  queued: boolean;
  messageJobId?: string;
  skipped?: boolean;
  error?: string;
};

/** Crée le MessageJob sans attendre l'envoi WhatsApp (rapide). */
export async function queueCaptureThankYou(
  tenantId: string,
  leadId: string
): Promise<CaptureThankYouResult> {
  const [jobsToday, todaySent, tenantDailyCap, lead] = await Promise.all([
    countLeadMessageJobsToday(leadId),
    prisma.messageJob.count({
      where: {
        tenantId,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        sentAt: { gte: startOfLocalDay() },
      },
    }),
    getTenantDailySendCap(),
    prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { id: true, optInConsent: true },
    }),
  ]);

  if (jobsToday > 0) {
    const captureJobToday = await prisma.messageJob.findFirst({
      where: {
        leadId,
        dispatchBatchId: null,
        createdAt: { gte: startOfLocalDay() },
      },
      select: { id: true },
    });
    if (captureJobToday) {
      return { queued: false, skipped: true };
    }
  }

  try {
    await assertLeadDailyMessageQuota(leadId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quota journalier lead atteint";
    return { queued: false, error: message };
  }

  if (todaySent >= tenantDailyCap) {
    return { queued: false, error: "Plafond quotidien d'envois WhatsApp atteint" };
  }

  if (!lead?.optInConsent) {
    return { queued: false, skipped: true };
  }

  const messageJob = await prisma.messageJob.create({
    data: {
      tenantId,
      leadId: lead.id,
      status: "QUEUED",
      scheduledFor: new Date(),
    },
  });

  return { queued: true, messageJobId: messageJob.id };
}

/** Met le message de remerciement en file et l'envoie en arrière-plan. */
export async function scheduleCaptureThankYou(
  tenantId: string,
  leadId: string
): Promise<CaptureThankYouResult> {
  const result = await queueCaptureThankYou(tenantId, leadId);

  if (result.messageJobId) {
    const jobId = result.messageJobId;
    runInBackground(async () => {
      try {
        await processMessageJob(jobId);
      } catch (err) {
        console.error("[capture-thank-you]", err);
      }
    });
  }

  return result;
}
