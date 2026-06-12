import type { Request, Response } from "express";
import type { SessionStatus } from "@kaptano/db";
import {
  applyWasenderWebhookMessageStatus,
  handleMessageSentWebhook,
} from "@kaptano/db";
import {
  dispatchWebhookEvent,
  verifyWasenderWebhookSignature,
  WasenderWebhookEventType,
  WasenderAPIError,
  WEBHOOK_SIGNATURE_HEADER,
} from "wasenderapi";
import { prisma } from "../lib/prisma";
import { SHARED_WHATSAPP_SESSION_ID } from "../whatsapp/resolveSession";
import { logger } from "../lib/logger";

function asArray<T>(data: T | T[]): T[] {
  return Array.isArray(data) ? data : [data];
}

async function processMessageStatusEvents(
  event: ReturnType<typeof dispatchWebhookEvent>,
  tenantId?: string
): Promise<void> {
  switch (event.event) {
    case WasenderWebhookEventType.MessageSent: {
      if (Array.isArray(event.data)) break;
      const messageId = event.data.key?.id;
      const updateStatus = event.data.status;
      if (messageId) {
        await applyWasenderWebhookMessageStatus(tenantId, messageId, updateStatus);
      }
      break;
    }
    case WasenderWebhookEventType.MessagesUpdate: {
      for (const entry of asArray(event.data)) {
        const messageId = entry.key?.id;
        const updateStatus = entry.update?.status;
        if (!messageId || updateStatus == null) continue;
        await applyWasenderWebhookMessageStatus(tenantId, messageId, updateStatus);
      }
      break;
    }
    case WasenderWebhookEventType.MessageReceiptUpdate: {
      for (const entry of asArray(event.data)) {
        const messageId = entry.key?.id;
        const updateStatus = entry.receipt?.status;
        if (!messageId || !updateStatus) continue;
        await applyWasenderWebhookMessageStatus(tenantId, messageId, updateStatus);
      }
      break;
    }
  }
}

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
        await processMessageStatusEvents(event, tenantId);
        break;
      }
      case WasenderWebhookEventType.MessagesUpdate:
      case WasenderWebhookEventType.MessageReceiptUpdate: {
        await processMessageStatusEvents(event, tenantId);
        break;
      }
    }
  } catch (err) {
    logger.error({ err, tenantId, event: event.event }, "Webhook processing error");
  }
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
    res.status(401).json({ error: "Unauthorized" });
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
        await processMessageStatusEvents(event);
        break;
      }
      case WasenderWebhookEventType.MessagesUpdate:
      case WasenderWebhookEventType.MessageReceiptUpdate: {
        await processMessageStatusEvents(event);
        break;
      }
    }
  } catch (err) {
    logger.error({ err, event: event.event }, "Shared webhook processing error");
  }
}
