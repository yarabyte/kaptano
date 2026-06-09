import type { SessionStatus } from "@kaptano/db";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { prisma } from "../lib/prisma";

export const SHARED_WHATSAPP_SESSION_ID = "default";

export type ResolvedWhatsappCredentials = {
  apiKeyEncrypted: string | null;
  status: SessionStatus;
  phoneNumber: string | null;
  isShared: boolean;
  effectivePlanTier: string;
};

export async function resolveWhatsappCredentials(
  tenantId: string
): Promise<ResolvedWhatsappCredentials> {
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
      apiKeyEncrypted: shared?.apiKeyEncrypted ?? null,
      status: shared?.status ?? "DISCONNECTED",
      phoneNumber: shared?.phoneNumber ?? null,
      isShared: true,
      effectivePlanTier: tier,
    };
  }

  const own = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  return {
    apiKeyEncrypted: own?.apiKeyEncrypted ?? null,
    status: own?.status ?? "DISCONNECTED",
    phoneNumber: own?.phoneNumber ?? null,
    isShared: false,
    effectivePlanTier: tier,
  };
}

export async function assertWhatsappConnected(tenantId: string): Promise<void> {
  const creds = await resolveWhatsappCredentials(tenantId);
  if (!creds.apiKeyEncrypted || creds.status !== "CONNECTED") {
    throw new Error(
      creds.isShared
        ? "Numéro WhatsApp partagé non disponible — contactez le support"
        : "Session WhatsApp non connectée"
    );
  }
}
