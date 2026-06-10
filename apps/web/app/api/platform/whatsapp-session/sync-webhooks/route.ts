import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncWasenderWebhookEvents } from "@/lib/wasender/sync-webhook-events";
import { getSharedWebhookUrl } from "@/lib/wasender/webhook-url";
import { SHARED_WHATSAPP_SESSION_ID } from "@/lib/whatsapp/resolve-session";

export async function POST() {
  await requirePlatformAdmin();

  const session = await prisma.sharedWhatsappSession.findUnique({
    where: { id: SHARED_WHATSAPP_SESSION_ID },
  });

  if (!session?.wasenderSessionId) {
    return NextResponse.json(
      { error: "Session WhatsApp partagée non configurée" },
      { status: 404 }
    );
  }

  await syncWasenderWebhookEvents(
    session.wasenderSessionId,
    getSharedWebhookUrl()
  );

  return NextResponse.json({ ok: true });
}
