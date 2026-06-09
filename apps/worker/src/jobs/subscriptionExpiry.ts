import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/** Désactive les abonnements expirés (CinetPay = paiement mensuel manuel) */
export async function expireSubscriptions(): Promise<void> {
  const now = new Date();

  const expired = await prisma.tenant.updateMany({
    where: {
      subscriptionExpiresAt: { lt: now },
      subscriptionStatus: "ACTIVE",
      planTier: { not: "FREE" },
    },
    data: {
      subscriptionStatus: "PAST_DUE",
    },
  });

  if (expired.count > 0) {
    logger.info({ count: expired.count }, "Abonnements expirés marqués PAST_DUE");
  }
}
