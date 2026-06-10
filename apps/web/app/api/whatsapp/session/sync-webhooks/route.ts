import { NextResponse } from "next/server";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncWasenderWebhookEvents } from "@/lib/wasender/sync-webhook-events";
import {
  getSharedWebhookUrl,
  getTenantWebhookUrl,
} from "@/lib/wasender/webhook-url";
import { SHARED_WHATSAPP_SESSION_ID } from "@/lib/whatsapp/resolve-session";

export async function POST() {
  const ctx = await requireTenantContext();

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId },
  });

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  if (usesSharedWhatsapp(tier)) {
    const shared = await prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
    });

    if (!shared?.wasenderSessionId) {
      return NextResponse.json(
        { error: "Session WhatsApp partagée non configurée" },
        { status: 404 }
      );
    }

    await syncWasenderWebhookEvents(
      shared.wasenderSessionId,
      getSharedWebhookUrl()
    );

    return NextResponse.json({ ok: true, mode: "shared" });
  }

  const session = await prisma.whatsappSession.findUnique({
    where: { tenantId: ctx.tenantId },
  });

  if (!session?.wasenderSessionId) {
    return NextResponse.json(
      { error: "Aucune session WhatsApp connectée" },
      { status: 404 }
    );
  }

  await syncWasenderWebhookEvents(
    session.wasenderSessionId,
    getTenantWebhookUrl(ctx.tenantId)
  );

  return NextResponse.json({ ok: true, mode: "own" });
}
