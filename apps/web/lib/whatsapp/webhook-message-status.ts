import { applyWasenderWebhookMessageStatus } from "@kaptano/db";
import {
  dispatchWebhookEvent,
  WasenderWebhookEventType,
} from "wasenderapi";

type DispatchedWebhookEvent = ReturnType<typeof dispatchWebhookEvent>;

function asArray<T>(data: T | T[]): T[] {
  return Array.isArray(data) ? data : [data];
}

export async function processWasenderMessageStatusEvents(
  event: DispatchedWebhookEvent,
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
