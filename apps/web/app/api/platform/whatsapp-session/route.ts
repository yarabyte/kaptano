import { NextResponse } from "next/server";
import type { SessionStatus } from "@kaptano/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  connectAndGetSharedSessionQr,
  createSharedWhatsappSession,
  getSharedWebhookUrl,
} from "@/lib/wasender/shared-session";
import { syncWasenderWebhookEvents } from "@/lib/wasender/sync-webhook-events";
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

  const phoneNumber = body.phoneNumber.trim();

  try {
    const webhookUrl = getSharedWebhookUrl();
    const existing = await prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
    });

    let wasenderSessionId = existing?.wasenderSessionId ?? null;
    let createResult: Awaited<ReturnType<typeof createSharedWhatsappSession>> | null =
      null;

    if (!wasenderSessionId) {
      createResult = await createSharedWhatsappSession(webhookUrl, phoneNumber);
      wasenderSessionId = createResult.id;
    } else {
      await syncWasenderWebhookEvents(wasenderSessionId, webhookUrl);
    }

    const connection = await connectAndGetSharedSessionQr(wasenderSessionId);

    const dbStatus: SessionStatus = connection.alreadyConnected
      ? "CONNECTED"
      : "PENDING";

    const session = await prisma.sharedWhatsappSession.upsert({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
      create: {
        id: SHARED_WHATSAPP_SESSION_ID,
        wasenderSessionId,
        apiKeyEncrypted: encrypt(createResult!.api_key),
        webhookSecret: createResult!.webhook_secret,
        phoneNumber: createResult!.phone_number ?? phoneNumber,
        status: dbStatus,
        lastConnectedAt: connection.alreadyConnected ? new Date() : undefined,
      },
      update: {
        ...(createResult
          ? {
              wasenderSessionId,
              apiKeyEncrypted: encrypt(createResult.api_key),
              webhookSecret: createResult.webhook_secret,
              phoneNumber: createResult.phone_number ?? phoneNumber,
            }
          : { phoneNumber }),
        status: dbStatus,
        lastConnectedAt: connection.alreadyConnected ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        phoneNumber: session.phoneNumber,
      },
      qrCode: connection.qrCode,
      alreadyConnected: connection.alreadyConnected,
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
