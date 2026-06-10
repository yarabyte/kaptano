import type { Request, Response } from "express";
import type { SessionStatus, MessageStatus } from "@kaptano/db";
import {
  dispatchWebhookEvent,
  verifyWasenderWebhookSignature,
  WasenderWebhookEventType,
  WasenderAPIError,
  WEBHOOK_SIGNATURE_HEADER,
} from "wasenderapi";
import {
  handleMessageSentWebhook,
  handlePollResultsWebhook,
} from "@kaptano/db";
import { prisma } from "../lib/prisma";
import { SHARED_WHATSAPP_SESSION_ID } from "../whatsapp/resolveSession";
import { logger } from "../lib/logger";

export async function handleWasenderWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const tenantId = String(req.params.tenantId ?? "");
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenantId" });
    return;
  }

  const session = await prisma.whatsappSession.findUnique({
    where: { tenantId },
  });

  if (!session?.webhookSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string | undefined;
  if (!verifyWasenderWebhookSignature(signature, session.webhookSecret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({ ok: true });

  let event;
  try {
    event = dispatchWebhookEvent(req.body);
  } catch (err) {
    const message =
      err instanceof WasenderAPIError ? err.apiMessage : "Invalid payload";
    logger.warn({ tenantId, message }, "Webhook payload invalide");
    return;
  }

  try {
    switch (event.event) {
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
      case WasenderWebhookEventType.MessageSent: {
        if (!Array.isArray(event.data)) {
          await handleMessageSentWebhook(event.data, tenantId);
        }
        const messageId = event.data.key?.id;
        const updateStatus = event.data.status;
        if (!messageId) break;
        await updateMessageJobStatus(tenantId, messageId, updateStatus);
        break;
      }
      case WasenderWebhookEventType.PollResults: {
        if (!Array.isArray(event.data)) {
          await handlePollResultsWebhook(event.data, event.timestamp, tenantId);
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
    }
  } catch (err) {
    logger.error({ err, tenantId, event: event.event }, "Webhook processing error");
  }
}

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
  if (updateStatus.toLowerCase() === "read" || updateStatus.toLowerCase() === "played") {
    updateData.readAt = new Date();
  }

  await prisma.messageJob.updateMany({
    where: tenantId
      ? { wasenderMessageId: messageId, tenantId }
      : { wasenderMessageId: messageId },
    data: updateData,
  });
}

export async function handleSharedWasenderWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const session = await prisma.sharedWhatsappSession.findUnique({
    where: { id: SHARED_WHATSAPP_SESSION_ID },
  });

  if (!session?.webhookSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string | undefined;
  if (!verifyWasenderWebhookSignature(signature, session.webhookSecret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({ ok: true });

  let event;
  try {
    event = dispatchWebhookEvent(req.body);
  } catch (err) {
    const message =
      err instanceof WasenderAPIError ? err.apiMessage : "Invalid payload";
    logger.warn({ message }, "Shared webhook payload invalide");
    return;
  }

  try {
    switch (event.event) {
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
        await prisma.sharedWhatsappSession.update({
          where: { id: SHARED_WHATSAPP_SESSION_ID },
          data: {
            status: statusMap[status.toLowerCase()] ?? "DISCONNECTED",
            lastConnectedAt:
              status.toLowerCase() === "connected" ? new Date() : undefined,
          },
        });
        break;
      }
      case WasenderWebhookEventType.MessageSent: {
        if (!Array.isArray(event.data)) {
          await handleMessageSentWebhook(event.data);
        }
        const messageId = event.data.key?.id;
        const updateStatus = event.data.status;
        if (!messageId) break;
        await updateMessageJobStatus("", messageId, updateStatus);
        break;
      }
      case WasenderWebhookEventType.PollResults: {
        if (!Array.isArray(event.data)) {
          await handlePollResultsWebhook(event.data, event.timestamp);
        }
        break;
      }
      case WasenderWebhookEventType.MessagesUpdate: {
        const entries = Array.isArray(event.data) ? event.data : [event.data];
        for (const entry of entries) {
          const messageId = entry.key?.id;
          const updateStatus = entry.update?.status;
          if (!messageId || !updateStatus) continue;
          await updateMessageJobStatus("", messageId, updateStatus);
        }
        break;
      }
    }
  } catch (err) {
    logger.error({ err, event: event.event }, "Shared webhook processing error");
  }
}
