import { prisma } from "@/lib/prisma";
import {
  getPlatformWhatsappLimits,
  isRateLimitErrorMessage,
} from "@/lib/whatsapp/rate-limits";

const SENT_STATUSES = ["SENT", "DELIVERED", "READ"] as const;

function startOfDay(d = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function loadPlatformRateLimitDashboard() {
  const limits = await getPlatformWhatsappLimits();
  const dayStart = startOfDay();
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);

  const [
    todayGlobalSent,
    lastMinuteSent,
    lastHourSent,
    sendingNow,
    queuedNow,
    failedJobs,
    recentSends,
    tenantGroups,
  ] = await Promise.all([
    prisma.messageJob.count({
      where: {
        status: { in: [...SENT_STATUSES] },
        sentAt: { gte: dayStart },
      },
    }),
    prisma.messageJob.count({
      where: {
        status: { in: [...SENT_STATUSES] },
        sentAt: { gte: oneMinuteAgo },
      },
    }),
    prisma.messageJob.count({
      where: {
        status: { in: [...SENT_STATUSES] },
        sentAt: { gte: oneHourAgo },
      },
    }),
    prisma.messageJob.count({ where: { status: "SENDING" } }),
    prisma.messageJob.count({ where: { status: "QUEUED" } }),
    prisma.messageJob.findMany({
      where: { status: "FAILED" },
      select: { lastError: true },
      take: 200,
      orderBy: { createdAt: "desc" },
    }),
    prisma.messageJob.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 25,
      include: {
        tenant: { select: { name: true, slug: true, planTier: true } },
        lead: { select: { fullName: true, whatsappNumber: true } },
      },
    }),
    prisma.messageJob.groupBy({
      by: ["tenantId"],
      where: {
        status: { in: [...SENT_STATUSES] },
        sentAt: { gte: dayStart },
      },
      _count: { _all: true },
      orderBy: { _count: { tenantId: "desc" } },
      take: 20,
    }),
  ]);

  const rateLimitFailures = failedJobs.filter((j) =>
    isRateLimitErrorMessage(j.lastError)
  ).length;

  const tenantIds = tenantGroups.map((g) => g.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, slug: true, planTier: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const tenantBreakdown = tenantGroups.map((g) => ({
    tenant: tenantMap.get(g.tenantId),
    sentToday: g._count._all,
  }));

  const msSinceLastSend = limits.lastSharedSendAt
    ? Date.now() - limits.lastSharedSendAt.getTime()
    : null;

  return {
    limits,
    stats: {
      todayGlobalSent,
      lastMinuteSent,
      lastHourSent,
      sendingNow,
      queuedNow,
      rateLimitFailures,
      msSinceLastSend,
    },
    recentSends,
    tenantBreakdown,
  };
}
