import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Récupère le tenant une seule fois par requête. Plusieurs helpers
 * (résumé d'usage, session WhatsApp, quotas…) ont besoin du même tenant ;
 * `cache()` garantit qu'on ne refait pas la requête à chaque appel — ce qui
 * compte particulièrement avec un pooler configuré en `connection_limit=1`
 * où les requêtes se sérialisent.
 */
export const getCachedTenant = cache((tenantId: string) =>
  prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
);
