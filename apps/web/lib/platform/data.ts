import { prisma } from "@/lib/prisma";

export async function loadPlatformTenants() {
  return prisma.tenant.findMany({
    include: {
      whatsappSession: { select: { status: true, phoneNumber: true } },
      _count: { select: { leads: true, users: true, stands: true } },
    },
    orderBy: { createdAt: "desc" },
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
  const tenants = await loadPlatformTenants();

  const [failedJobs, totalLeads, recentPayments] = await Promise.all([
    loadPlatformFailedJobs(8),
    prisma.lead.count(),
    loadPlatformPayments(5),
  ]);

  const planCounts = tenants.reduce(
    (acc, t) => {
      acc[t.planTier] = (acc[t.planTier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    tenants,
    failedJobs,
    totalLeads,
    recentPayments,
    planCounts,
    stats: {
      tenants: tenants.length,
      totalLeads,
      failedJobs: failedJobs.length,
      payments: recentPayments.length,
    },
  };
}
