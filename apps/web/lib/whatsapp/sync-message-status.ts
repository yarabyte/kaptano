import {
  applyWasenderMessageInfoToJob,
  listMessageJobsForStatusSync,
} from "@kaptano/db";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { runInBackground } from "@/lib/background-task";
import { fetchWasenderMessageInfo } from "@/lib/whatsapp/wasender-message-info";
import { resolveWhatsappCredentials } from "@/lib/whatsapp/resolve-session";

export async function syncMessageJobStatus(messageJobId: string): Promise<void> {
  const job = await prisma.messageJob.findUnique({
    where: { id: messageJobId },
    select: { id: true, tenantId: true, wasenderMessageId: true },
  });

  if (!job?.wasenderMessageId || !/^\d+$/.test(job.wasenderMessageId)) return;

  const credentials = await resolveWhatsappCredentials(job.tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") return;

  const apiKey = decrypt(credentials.apiKeyEncrypted);
  const info = await fetchWasenderMessageInfo(apiKey, job.wasenderMessageId);
  if (info) {
    await applyWasenderMessageInfoToJob(job.id, info);
  }
}

export async function syncRecentMessageStatuses(tenantId: string): Promise<void> {
  const credentials = await resolveWhatsappCredentials(tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") return;

  const apiKey = decrypt(credentials.apiKeyEncrypted);
  const jobs = await listMessageJobsForStatusSync(tenantId, 25);

  for (const job of jobs) {
    if (!job.wasenderMessageId || !/^\d+$/.test(job.wasenderMessageId)) continue;
    try {
      const info = await fetchWasenderMessageInfo(apiKey, job.wasenderMessageId);
      if (info) {
        await applyWasenderMessageInfoToJob(job.id, info);
      }
    } catch (err) {
      console.error("[sync-message-status]", { jobId: job.id, err });
    }
  }
}

export function scheduleMessageJobStatusSync(messageJobId: string): void {
  runInBackground(async () => {
    try {
      await syncMessageJobStatus(messageJobId);
    } catch (err) {
      console.error("[sync-message-status/job]", { messageJobId, err });
    }
  });
}

export function scheduleRecentMessageStatusSync(tenantId: string): void {
  runInBackground(async () => {
    try {
      await syncRecentMessageStatuses(tenantId);
    } catch (err) {
      console.error("[sync-message-status/recent]", { tenantId, err });
    }
  });
}
