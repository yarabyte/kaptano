import type { ManualDispatchFilters } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { getTenantDailySendCap } from "@/lib/whatsapp/rate-limits";
import {
  buildEligibleLeadsWhere,
  getTodaySentCount,
} from "@/lib/whatsapp/dispatch-stats";
import { processMessageJob } from "@/lib/whatsapp/process-message-job";
import { resolveWhatsappCredentials } from "@/lib/whatsapp/resolve-session";

export type ManualDispatchStartResult = {
  batchId: string;
  totalCount: number;
  messageJobIds: string[];
};

async function assertDispatchReady(tenantId: string) {
  const credentials = await resolveWhatsappCredentials(tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
    throw new Error(
      credentials.isShared
        ? "Numéro WhatsApp partagé non disponible — contactez le support"
        : "Session WhatsApp non connectée"
    );
  }

  const tenantDailyCap = await getTenantDailySendCap();
  const todaySent = await getTodaySentCount(tenantId);
  const remaining = tenantDailyCap - todaySent;

  if (remaining <= 0) {
    throw new Error(`Plafond quotidien d'envois atteint (${tenantDailyCap})`);
  }

  return remaining;
}

/** Crée le batch et les jobs, retourne immédiatement (envoi en arrière-plan). */
export async function startManualDispatch(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<ManualDispatchStartResult> {
  const remaining = await assertDispatchReady(tenantId);

  const leads = await prisma.lead.findMany({
    where: await buildEligibleLeadsWhere(tenantId, filters),
    orderBy: { capturedAt: "asc" },
    take: remaining,
  });

  if (leads.length === 0) {
    throw new Error("Aucun lead éligible à l'envoi");
  }

  const batch = await prisma.dispatchBatch.create({
    data: {
      tenantId,
      totalCount: leads.length,
      filters: filters ?? undefined,
      status: "RUNNING",
    },
  });

  const messageJobIds: string[] = [];

  for (const lead of leads) {
    const messageJob = await prisma.messageJob.create({
      data: {
        tenantId,
        leadId: lead.id,
        dispatchBatchId: batch.id,
        status: "QUEUED",
        scheduledFor: new Date(),
      },
    });
    messageJobIds.push(messageJob.id);
  }

  return {
    batchId: batch.id,
    totalCount: leads.length,
    messageJobIds,
  };
}

/** Traite les jobs d'un batch (appelé en arrière-plan après la réponse HTTP). */
export async function processManualDispatchBatch(
  tenantId: string,
  batchId: string,
  messageJobIds: string[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const messageJobId of messageJobIds) {
    try {
      await processMessageJob(messageJobId);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error("[manual-dispatch]", { tenantId, batchId, messageJobId, err });
    }
  }

  await prisma.dispatchBatch.update({
    where: { id: batchId },
    data: {
      status: failed === messageJobIds.length ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
    },
  });

  return { sent, failed };
}
