import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncWasenderWebhookEvents } from "@/lib/wasender/sync-webhook-events";
import { isSharedSessionNotFound } from "@/lib/wasender/shared-session";
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

  try {
    await syncWasenderWebhookEvents(
      session.wasenderSessionId,
      getSharedWebhookUrl()
    );
  } catch (err) {
    if (isSharedSessionNotFound(err)) {
      return NextResponse.json(
        {
          error:
            "La session WhatsApp partagée n'existe plus côté wasender. Régénérez le QR code pour la recréer.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Échec de la synchronisation des webhooks",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
