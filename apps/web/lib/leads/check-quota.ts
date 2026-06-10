import { cache } from "react";
import { PLAN_QUOTAS, effectivePlanTier, getStandLimit } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/utils";
import type { PlanTier, SubscriptionStatus } from "@kaptano/db";

export { effectivePlanTier };

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly quota: number,
    public readonly used: number
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class StandQuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly limit: number,
    public readonly used: number
  ) {
    super(message);
    this.name = "StandQuotaExceededError";
  }
}

export async function getStandQuotaSummary(tenantId: string) {
  const [tenant, used] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.stand.count({ where: { tenantId } }),
  ]);

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );
  const limit = getStandLimit(tier);

  return {
    effectiveTier: tier,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    isAtLimit: limit !== null && used >= limit,
  };
}

export async function assertStandQuota(tenantId: string): Promise<void> {
  const summary = await getStandQuotaSummary(tenantId);

  if (summary.isAtLimit && summary.limit !== null) {
    throw new StandQuotaExceededError(
      `Limite de ${summary.limit} stand atteinte sur le plan ${summary.effectiveTier}. Passez au plan Growth pour créer plusieurs stands.`,
      summary.limit,
      summary.used
    );
  }
}

export async function assertLeadQuota(tenantId: string): Promise<void> {
  const period = getCurrentPeriod();

  const [tenant, usage] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.usageRecord.findUnique({
      where: { tenantId_period: { tenantId, period } },
    }),
  ]);

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );
  const quota = PLAN_QUOTAS[tier] ?? 0;
  const used = usage?.leadsCount ?? 0;

  if (used >= quota) {
    throw new QuotaExceededError(
      `Quota mensuel atteint (${used}/${quota} leads). Passez à un plan supérieur.`,
      quota,
      used
    );
  }
}

export const getTenantUsageSummary = cache(async (tenantId: string) => {
  const period = getCurrentPeriod();
  const [tenant, usage] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.usageRecord.findUnique({
      where: { tenantId_period: { tenantId, period } },
    }),
  ]);

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );
  const quota = PLAN_QUOTAS[tier] ?? 0;
  const used = usage?.leadsCount ?? 0;

  return {
    planTier: tenant.planTier,
    effectiveTier: tier,
    subscriptionStatus: tenant.subscriptionStatus,
    subscriptionExpiresAt: tenant.subscriptionExpiresAt,
    quota,
    used,
    remaining: Math.max(0, quota - used),
    isAtLimit: used >= quota,
    period,
  };
});
