import type { PlanTier } from "@kaptano/db";
import { PLAN_PRICES_XAF, SUBSCRIPTION_PERIOD_DAYS } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";

export function subscriptionExpiresAtFromNow(days: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export async function setTenantStatus(tenantId: string, status: "active" | "inactive") {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { status },
  });
}

export async function promoteTenantPlan(
  tenantId: string,
  planTier: PlanTier,
  subscriptionDays = SUBSCRIPTION_PERIOD_DAYS
) {
  const isFree = planTier === "FREE";

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planTier,
      subscriptionStatus: isFree ? "TRIALING" : "ACTIVE",
      subscriptionExpiresAt: isFree
        ? null
        : subscriptionExpiresAtFromNow(subscriptionDays),
    },
  });
}

export async function recordCashPayment(
  tenantId: string,
  planTier: Exclude<PlanTier, "FREE">,
  options?: { amount?: number; subscriptionDays?: number }
) {
  const amount = options?.amount ?? PLAN_PRICES_XAF[planTier] ?? 0;
  const subscriptionDays = options?.subscriptionDays ?? SUBSCRIPTION_PERIOD_DAYS;
  const transactionId = `cash-${tenantId.slice(0, 8)}-${Date.now()}`;

  const [payment, tenant] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        tenantId,
        transactionId,
        planTier,
        amount,
        currency: "XAF",
        status: "SUCCESS",
        paidAt: new Date(),
        operatorId: "ESPECES",
      },
    }),
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        planTier,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: subscriptionExpiresAtFromNow(subscriptionDays),
        status: "active",
      },
    }),
  ]);

  return { payment, tenant };
}
