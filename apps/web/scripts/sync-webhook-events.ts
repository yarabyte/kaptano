import { prisma } from "@kaptano/db";
import { syncWasenderWebhookEvents } from "../lib/wasender/sync-webhook-events";
import {
  getSharedWebhookUrl,
  getTenantWebhookUrl,
} from "../lib/wasender/webhook-url";
import { SHARED_WHATSAPP_SESSION_ID } from "../lib/whatsapp/constants";

async function main() {
  const shared = await prisma.sharedWhatsappSession.findUnique({
    where: { id: SHARED_WHATSAPP_SESSION_ID },
  });

  if (shared?.wasenderSessionId) {
    await syncWasenderWebhookEvents(
      shared.wasenderSessionId,
      getSharedWebhookUrl()
    );
    console.log(`✓ Session partagée ${shared.wasenderSessionId}`);
  } else {
    console.log("— Session partagée absente, ignorée");
  }

  const tenantSessions = await prisma.whatsappSession.findMany({
    where: { wasenderSessionId: { not: null } },
    select: { tenantId: true, wasenderSessionId: true },
  });

  for (const session of tenantSessions) {
    if (!session.wasenderSessionId) continue;
    await syncWasenderWebhookEvents(
      session.wasenderSessionId,
      getTenantWebhookUrl(session.tenantId)
    );
    console.log(`✓ Tenant ${session.tenantId} → session ${session.wasenderSessionId}`);
  }

  console.log(`Terminé (${tenantSessions.length} session(s) tenant)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
