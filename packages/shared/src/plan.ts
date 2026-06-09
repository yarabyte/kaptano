export const PLAN_TIERS = ["FREE", "STARTER", "GROWTH", "SCALE"] as const;
export type PlanTierName = (typeof PLAN_TIERS)[number];

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
] as const;
export type SubscriptionStatusName = (typeof SUBSCRIPTION_STATUSES)[number];

/** Plans utilisant le numéro WhatsApp partagé de la plateforme */
export const SHARED_WHATSAPP_PLAN_TIERS: PlanTierName[] = ["FREE", "STARTER"];

/** Limite de stands / QR codes par plan (null = illimité) */
export const PLAN_STAND_LIMITS: Record<PlanTierName, number | null> = {
  FREE: 1,
  STARTER: 1,
  GROWTH: null,
  SCALE: null,
};

export function getStandLimit(planTier: PlanTierName): number | null {
  return PLAN_STAND_LIMITS[planTier] ?? null;
}

export function effectivePlanTier(
  planTier: PlanTierName,
  subscriptionStatus: SubscriptionStatusName,
  subscriptionExpiresAt: Date | null
): PlanTierName {
  if (planTier === "FREE") return "FREE";

  const expired =
    subscriptionExpiresAt !== null && subscriptionExpiresAt < new Date();

  if (
    subscriptionStatus === "CANCELED" ||
    subscriptionStatus === "PAST_DUE" ||
    expired
  ) {
    return "FREE";
  }

  return planTier;
}

export function usesSharedWhatsapp(planTier: PlanTierName): boolean {
  return SHARED_WHATSAPP_PLAN_TIERS.includes(planTier);
}
