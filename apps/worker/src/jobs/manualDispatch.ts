import type { Prisma } from "@kaptano/db";
import { getLeadIdsAtDailyMessageCap } from "@kaptano/db";
import type { ManualDispatchFilters } from "@kaptano/shared";
import {
  DAILY_SEND_CAP,
  MANUAL_SEND_JITTER_MIN_MS,
  MANUAL_SEND_JITTER_MAX_MS,
} from "@kaptano/shared";
import { prisma } from "../lib/prisma";
import { enqueueSendJob } from "../queues/sendQueue";
import { assertWhatsappConnected } from "../whatsapp/resolveSession";
import { logger } from "../lib/logger";

function randomManualJitter(): number {
  return (
    MANUAL_SEND_JITTER_MIN_MS +
    Math.floor(
      Math.random() * (MANUAL_SEND_JITTER_MAX_MS - MANUAL_SEND_JITTER_MIN_MS)
    )
  );
}

export async function buildEligibleLeadsWhere(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<Prisma.LeadWhereInput> {
  const atCap = await getLeadIdsAtDailyMessageCap(tenantId);

  const where: Prisma.LeadWhereInput = {
    tenantId,
    optInConsent: true,
    ...(atCap.length > 0 ? { id: { notIn: atCap } } : {}),
  };

  if (filters?.standId) {
    where.standId = filters.standId;
  }

  if (filters?.from || filters?.to) {
    where.capturedAt = {};
    if (filters.from) where.capturedAt.gte = new Date(filters.from);
    if (filters.to) where.capturedAt.lte = new Date(filters.to);
  }

  return where;
}

export async function countEligibleLeads(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<number> {
  return prisma.lead.count({
    where: await buildEligibleLeadsWhere(tenantId, filters),
  });
}

export async function getTodaySentCount(tenantId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.messageJob.count({
    where: {
      tenantId,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      sentAt: { gte: startOfDay },
    },
  });
}

export async function runManualDispatch(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<{ batchId: string; totalCount: number }> {
  await assertWhatsappConnected(tenantId);

  const todaySent = await getTodaySentCount(tenantId);
  const remaining = DAILY_SEND_CAP - todaySent;

  if (remaining <= 0) {
    throw new Error("Plafond quotidien d'envois atteint (200)");
  }

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

  let cumulativeDelay = 0;

  for (const lead of leads) {
    cumulativeDelay += randomManualJitter();
    const scheduledFor = new Date(Date.now() + cumulativeDelay);

    const messageJob = await prisma.messageJob.create({
      data: {
        tenantId,
        leadId: lead.id,
        dispatchBatchId: batch.id,
        status: "QUEUED",
        scheduledFor,
      },
    });

    await enqueueSendJob(
      { messageJobId: messageJob.id, tenantId },
      cumulativeDelay
    );
  }

  logger.info(
    { tenantId, batchId: batch.id, count: leads.length },
    "Manual dispatch started"
  );

  return { batchId: batch.id, totalCount: leads.length };
}

export type BatchProgress = {
  batchId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  total: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progress: number;
  startedAt: string;
  completedAt: string | null;
};

export async function getBatchProgress(
  tenantId: string,
  batchId: string
): Promise<BatchProgress | null> {
  const batch = await prisma.dispatchBatch.findFirst({
    where: { id: batchId, tenantId },
  });

  if (!batch) return null;

  const groups = await prisma.messageJob.groupBy({
    by: ["status"],
    where: { dispatchBatchId: batchId, tenantId },
    _count: { _all: true },
  });

  const counts = {
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };

  for (const g of groups) {
    const n = g._count._all;
    switch (g.status) {
      case "QUEUED":
        counts.queued = n;
        break;
      case "SENDING":
        counts.sending = n;
        break;
      case "SENT":
        counts.sent = n;
        break;
      case "DELIVERED":
        counts.delivered = n;
        break;
      case "READ":
        counts.read = n;
        break;
      case "FAILED":
        counts.failed = n;
        break;
    }
  }

  const terminal = counts.sent + counts.delivered + counts.read + counts.failed;
  const progress =
    batch.totalCount > 0 ? Math.round((terminal / batch.totalCount) * 100) : 0;

  const isComplete = counts.queued === 0 && counts.sending === 0;

  if (isComplete && batch.status === "RUNNING") {
    await prisma.dispatchBatch.update({
      where: { id: batchId },
      data: {
        status: counts.failed === batch.totalCount ? "FAILED" : "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  const updated = isComplete
    ? await prisma.dispatchBatch.findUnique({ where: { id: batchId } })
    : batch;

  return {
    batchId: batch.id,
    status: updated?.status ?? batch.status,
    total: batch.totalCount,
    ...counts,
    progress: isComplete ? 100 : progress,
    startedAt: batch.startedAt.toISOString(),
    completedAt: updated?.completedAt?.toISOString() ?? null,
  };
}

export async function getTenantSendStats(tenantId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [allTime, today, catalogClicks, lastBatch] = await Promise.all([
    prisma.messageJob.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.messageJob.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: startOfDay } },
      _count: { _all: true },
    }),
    prisma.messageJob.count({
      where: { tenantId, catalogClickedAt: { not: null } },
    }),
    prisma.dispatchBatch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalCount: true,
        createdAt: true,
        completedAt: true,
      },
    }),
  ]);

  function toMap(
    groups: { status: string; _count: { _all: number } }[]
  ): Record<string, number> {
    const map: Record<string, number> = {};
    for (const g of groups) map[g.status] = g._count._all;
    return map;
  }

  const all = toMap(allTime);
  const todayMap = toMap(today);

  return {
    allTime: {
      total: Object.values(all).reduce((a, b) => a + b, 0),
      queued: all.QUEUED ?? 0,
      sending: all.SENDING ?? 0,
      sent: all.SENT ?? 0,
      delivered: all.DELIVERED ?? 0,
      read: all.READ ?? 0,
      failed: all.FAILED ?? 0,
      catalogClicks,
    },
    today: {
      total: Object.values(todayMap).reduce((a, b) => a + b, 0),
      sent: (todayMap.SENT ?? 0) + (todayMap.DELIVERED ?? 0) + (todayMap.READ ?? 0),
      delivered: todayMap.DELIVERED ?? 0,
      read: todayMap.READ ?? 0,
      failed: todayMap.FAILED ?? 0,
    },
    remainingToday: Math.max(
      0,
      DAILY_SEND_CAP -
        ((todayMap.SENT ?? 0) + (todayMap.DELIVERED ?? 0) + (todayMap.READ ?? 0))
    ),
    lastBatch,
  };
}
