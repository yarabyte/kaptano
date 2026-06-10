import type { Prisma } from "@kaptano/db";
import { DAILY_SEND_CAP } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";

export type ManualDispatchFilters = {
  standId?: string;
  from?: string;
  to?: string;
};

export function buildEligibleLeadsWhere(
  tenantId: string,
  filters?: ManualDispatchFilters
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    tenantId,
    optInConsent: true,
    messageJobs: { none: {} },
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
    where: buildEligibleLeadsWhere(tenantId, filters),
  });
}

export async function getLeadWhatsAppSummary(
  tenantId: string,
  filters?: ManualDispatchFilters
): Promise<{
  totalWithOptIn: number;
  alreadyContacted: number;
  eligible: number;
}> {
  const baseWhere: Prisma.LeadWhereInput = {
    tenantId,
    optInConsent: true,
  };

  if (filters?.standId) {
    baseWhere.standId = filters.standId;
  }

  if (filters?.from || filters?.to) {
    baseWhere.capturedAt = {};
    if (filters.from) baseWhere.capturedAt.gte = new Date(filters.from);
    if (filters.to) baseWhere.capturedAt.lte = new Date(filters.to);
  }

  const [totalWithOptIn, alreadyContacted, eligible] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.count({
      where: {
        ...baseWhere,
        messageJobs: { some: {} },
      },
    }),
    countEligibleLeads(tenantId, filters),
  ]);

  return { totalWithOptIn, alreadyContacted, eligible };
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

  function toMap(groups: { status: string; _count: { _all: number } }[]) {
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
