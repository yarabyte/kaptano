import { cache } from "react";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import type { PlanTier, SessionStatus, SubscriptionStatus } from "@kaptano/db";
import { prisma } from "@/lib/prisma";
import { getCachedTenant } from "@/lib/tenant";
import { SHARED_WHATSAPP_SESSION_ID } from "./constants";

export { SHARED_WHATSAPP_SESSION_ID };

export type WhatsappMode = "shared" | "own";

export type ResolvedWhatsappSession = {
  status: SessionStatus;
  phoneNumber: string | null;
  whatsappMode: WhatsappMode;
  effectivePlanTier: PlanTier;
};

export type ResolvedWhatsappCredentials = {
  apiKeyEncrypted: string | null;
  status: SessionStatus;
  phoneNumber: string | null;
  isShared: boolean;
  effectivePlanTier: PlanTier;
};

export const getResolvedWhatsappSession = cache(
  async (tenantId: string): Promise<ResolvedWhatsappSession> => {
    const [tenant, shared, own] = await Promise.all([
      getCachedTenant(tenantId),
      prisma.sharedWhatsappSession.findUnique({
        where: { id: SHARED_WHATSAPP_SESSION_ID },
      }),
      prisma.whatsappSession.findUnique({ where: { tenantId } }),
    ]);

    const tier = effectivePlanTier(
      tenant.planTier,
      tenant.subscriptionStatus,
      tenant.subscriptionExpiresAt
    );

    if (usesSharedWhatsapp(tier)) {
      return {
        status: shared?.status ?? "DISCONNECTED",
        phoneNumber: shared?.phoneNumber ?? null,
        whatsappMode: "shared",
        effectivePlanTier: tier,
      };
    }

    return {
      status: own?.status ?? "DISCONNECTED",
      phoneNumber: own?.phoneNumber ?? null,
      whatsappMode: "own",
      effectivePlanTier: tier,
    };
  }
);

export async function resolveWhatsappCredentials(
  tenantId: string
): Promise<ResolvedWhatsappCredentials> {
  const [tenant, shared, own] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
    }),
    prisma.whatsappSession.findUnique({ where: { tenantId } }),
  ]);

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  if (usesSharedWhatsapp(tier)) {
    return {
      apiKeyEncrypted: shared?.apiKeyEncrypted ?? null,
      status: shared?.status ?? "DISCONNECTED",
      phoneNumber: shared?.phoneNumber ?? null,
      isShared: true,
      effectivePlanTier: tier,
    };
  }

  return {
    apiKeyEncrypted: own?.apiKeyEncrypted ?? null,
    status: own?.status ?? "DISCONNECTED",
    phoneNumber: own?.phoneNumber ?? null,
    isShared: false,
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
