import { prisma } from "@/lib/prisma";

const tenantListSelect = {
  whatsappSession: { select: { status: true, phoneNumber: true } },
  _count: { select: { leads: true, users: true, stands: true } },
} as const;

export async function loadPlatformTenants(limit = 200) {
  return prisma.tenant.findMany({
    include: tenantListSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function loadPlatformFailedJobs(limit = 50) {
  return prisma.messageJob.findMany({
    where: { status: "FAILED" },
    include: {
      lead: { select: { fullName: true, whatsappNumber: true } },
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function loadPlatformPayments(limit = 50) {
  return prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { tenant: { select: { name: true, slug: true } } },
  });
}

export async function loadPlatformOverview() {
  const [tenants, failedJobs, totalLeads, recentPayments, planGroups] =
    await Promise.all([
      prisma.tenant.findMany({
        include: tenantListSelect,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      loadPlatformFailedJobs(8),
      prisma.lead.count(),
      loadPlatformPayments(5),
      prisma.tenant.groupBy({
        by: ["planTier"],
        _count: { _all: true },
      }),
    ]);

  const planCounts = planGroups.reduce(
    (acc, g) => {
      acc[g.planTier] = g._count._all;
      return acc;
    },
    {} as Record<string, number>
  );

  const tenantCount = Object.values(planCounts).reduce((a, b) => a + b, 0);

  return {
    tenants,
    failedJobs,
    totalLeads,
    recentPayments,
    planCounts,
    stats: {
      tenants: tenantCount,
      totalLeads,
      failedJobs: failedJobs.length,
      payments: recentPayments.length,
    },
  };
}
