import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import type { PlanTier, SessionStatus, SubscriptionStatus } from "@kaptano/db";
import { prisma } from "@/lib/prisma";

export const SHARED_WHATSAPP_SESSION_ID = "default";

export type WhatsappMode = "shared" | "own";

export type ResolvedWhatsappSession = {
  status: SessionStatus;
  phoneNumber: string | null;
  whatsappMode: WhatsappMode;
  effectivePlanTier: PlanTier;
};

export async function getResolvedWhatsappSession(
  tenantId: string
): Promise<ResolvedWhatsappSession> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  if (usesSharedWhatsapp(tier)) {
    const shared = await prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
    });

    return {
      status: shared?.status ?? "DISCONNECTED",
      phoneNumber: shared?.phoneNumber ?? null,
      whatsappMode: "shared",
      effectivePlanTier: tier,
    };
  }

  const own = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  return {
    status: own?.status ?? "DISCONNECTED",
    phoneNumber: own?.phoneNumber ?? null,
    whatsappMode: "own",
    effectivePlanTier: tier,
  };
}

export function tenantUsesSharedWhatsapp(
  planTier: PlanTier,
  subscriptionStatus: SubscriptionStatus,
  subscriptionExpiresAt: Date | null
): boolean {
  return usesSharedWhatsapp(
    effectivePlanTier(planTier, subscriptionStatus, subscriptionExpiresAt)
  );
}
