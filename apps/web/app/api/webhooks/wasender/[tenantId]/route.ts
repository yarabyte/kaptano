import { NextResponse } from "next/server";
import type { MessageStatus, SessionStatus } from "@kaptano/db";
import {
  dispatchWebhookEvent,
  verifyWasenderWebhookSignature,
  WasenderWebhookEventType,
  WasenderAPIError,
  WEBHOOK_SIGNATURE_HEADER,
} from "wasenderapi";
import { prisma } from "@/lib/prisma";
import { handleMessageSentWebhook } from "@/lib/whatsapp/poll-results";

export const dynamic = "force-dynamic";

async function updateMessageJobStatus(
  tenantId: string,
  messageId: string,
  updateStatus: string | undefined
): Promise<void> {
  if (!updateStatus) return;

  const statusMap: Record<string, MessageStatus> = {
    delivered: "DELIVERED",
    read: "READ",
    played: "READ",
    sent: "SENT",
    failed: "FAILED",
    error: "FAILED",
    pending: "SENT",
    in_progress: "SENT",
  };

  const mapped = statusMap[updateStatus.toLowerCase()];
  if (!mapped) return;

  const updateData: {
    status: MessageStatus;
    deliveredAt?: Date;
    readAt?: Date;
  } = { status: mapped };

  if (updateStatus.toLowerCase() === "delivered") {
    updateData.deliveredAt = new Date();
  }
  if (
    updateStatus.toLowerCase() === "read" ||
    updateStatus.toLowerCase() === "played"
  ) {
    updateData.readAt = new Date();
  }

  await prisma.messageJob.updateMany({
    where: { wasenderMessageId: messageId, tenantId },
    data: updateData,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = params.tenantId;

  const session = await prisma.whatsappSession.findUnique({
    where: { tenantId },
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

  try {
    switch (event.event) {
      case WasenderWebhookEventType.MessageSent: {
        const data = event.data;
        if (!Array.isArray(data)) {
          await handleMessageSentWebhook(
            data as { key?: { id?: string; remoteJid?: string; fromMe?: boolean } },
            tenantId
          );
          const messageId = data.key?.id;
          const updateStatus = data.status;
          if (messageId) {
            await updateMessageJobStatus(tenantId, messageId, updateStatus);
          }
        }
        break;
      }
      case WasenderWebhookEventType.MessagesUpdate: {
        const entries = Array.isArray(event.data) ? event.data : [event.data];
        for (const entry of entries) {
          const messageId = entry.key?.id;
          const updateStatus = entry.update?.status;
          if (!messageId || !updateStatus) continue;
          await updateMessageJobStatus(tenantId, messageId, updateStatus);
        }
        break;
      }
      case WasenderWebhookEventType.SessionStatus: {
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

        await prisma.whatsappSession.update({
          where: { tenantId },
          data: {
            status: statusMap[status.toLowerCase()] ?? "DISCONNECTED",
            lastConnectedAt:
              status.toLowerCase() === "connected" ? new Date() : undefined,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook/tenant] processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
