import type { ManualDispatchFilters } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { getTenantDailySendCap } from "@/lib/whatsapp/rate-limits";
import {
  buildEligibleLeadsWhere,
  getTodaySentCount,
} from "@/lib/whatsapp/dispatch-stats";
import { processMessageJob } from "@/lib/whatsapp/process-message-job";
import { resolveWhatsappCredentials } from "@/lib/whatsapp/resolve-session";

export async function runManualDispatch(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<{ batchId: string; totalCount: number; sent: number; failed: number }> {
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

  const leads = await prisma.lead.findMany({
    where: buildEligibleLeadsWhere(tenantId, filters),
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

  let sent = 0;
  let failed = 0;

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

    try {
      await processMessageJob(messageJob.id);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await prisma.dispatchBatch.update({
    where: { id: batch.id },
    data: {
      status: failed === leads.length ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
    },
  });

  return { batchId: batch.id, totalCount: leads.length, sent, failed };
}
