import { NextResponse } from "next/server";
import type { SessionStatus } from "@kaptano/db";
import {
  dispatchWebhookEvent,
  verifyWasenderWebhookSignature,
  WasenderWebhookEventType,
  WasenderAPIError,
  WEBHOOK_SIGNATURE_HEADER,
} from "wasenderapi";
import { prisma } from "@/lib/prisma";
import { SHARED_WHATSAPP_SESSION_ID } from "@/lib/whatsapp/resolve-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await prisma.sharedWhatsappSession.findUnique({
    where: { id: SHARED_WHATSAPP_SESSION_ID },
  });

  if (!session?.webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
  if (!verifyWasenderWebhookSignature(signature, session.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = dispatchWebhookEvent(await request.json());
  } catch (err) {
    const message =
      err instanceof WasenderAPIError ? err.apiMessage : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.event === WasenderWebhookEventType.SessionStatus) {
    const status = event.data.status;
    const statusMap: Record<string, SessionStatus> = {
      connected: "CONNECTED",
      disconnected: "DISCONNECTED",
      expired: "EXPIRED",
      need_scan: "PENDING",
      connecting: "PENDING",
      logged_out: "DISCONNECTED",
      error: "DISCONNECTED",
    };

    await prisma.sharedWhatsappSession.update({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
      data: {
        status: statusMap[status.toLowerCase()] ?? "DISCONNECTED",
        lastConnectedAt:
          status.toLowerCase() === "connected" ? new Date() : undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
