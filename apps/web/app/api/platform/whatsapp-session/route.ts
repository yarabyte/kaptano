import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  createSharedWhatsappSession,
  getSharedSessionQr,
  getSharedWebhookUrl,
} from "@/lib/wasender/shared-session";
import { SHARED_WHATSAPP_SESSION_ID } from "@/lib/whatsapp/resolve-session";

export async function GET() {
  await requirePlatformAdmin();

  const session = await prisma.sharedWhatsappSession.findUnique({
    where: { id: SHARED_WHATSAPP_SESSION_ID },
  });

  return NextResponse.json({
    session: session
      ? {
          status: session.status,
          phoneNumber: session.phoneNumber,
          lastConnectedAt: session.lastConnectedAt,
        }
      : null,
  });
}

export async function POST(request: Request) {
  await requirePlatformAdmin();
  const body = (await request.json()) as { phoneNumber?: string };

  if (!body.phoneNumber?.trim()) {
    return NextResponse.json(
      { error: "Numéro de téléphone requis (format international, ex. +237670000000)" },
      { status: 400 }
    );
  }

  try {
    const webhookUrl = getSharedWebhookUrl();
    const sessionData = await createSharedWhatsappSession(
      webhookUrl,
      body.phoneNumber.trim()
    );
    const qrCode = await getSharedSessionQr(sessionData.id);

    const session = await prisma.sharedWhatsappSession.upsert({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
      create: {
        id: SHARED_WHATSAPP_SESSION_ID,
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? body.phoneNumber.trim(),
        status: "PENDING",
      },
      update: {
        wasenderSessionId: sessionData.id,
        apiKeyEncrypted: encrypt(sessionData.api_key),
        webhookSecret: sessionData.webhook_secret,
        phoneNumber: sessionData.phone_number ?? body.phoneNumber.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        phoneNumber: session.phoneNumber,
      },
      qrCode,
      webhookUrl,
    });
  } catch (err) {
    console.error("[platform/whatsapp-session]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la création de la session WhatsApp",
      },
      { status: 500 }
    );
  }
}
