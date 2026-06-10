import { WASENDER_WEBHOOK_EVENTS } from "@kaptano/shared";
import { WasenderAPIError } from "wasenderapi";
import { createAccountWasenderClient } from "./create-client";

const ACCOUNT_TOKEN = process.env.WASENDER_ACCOUNT_TOKEN ?? "";

export async function syncWasenderWebhookEvents(
  wasenderSessionId: string,
  webhookUrl: string
): Promise<void> {
  if (!ACCOUNT_TOKEN) {
    throw new Error("WASENDER_ACCOUNT_TOKEN manquant");
  }

  const client = createAccountWasenderClient(ACCOUNT_TOKEN);

  try {
    await client.updateWhatsAppSession(Number(wasenderSessionId), {
      webhook_url: webhookUrl,
      webhook_enabled: true,
      webhook_events: [...WASENDER_WEBHOOK_EVENTS],
      read_incoming_messages: true,
    } as Parameters<typeof client.updateWhatsAppSession>[1]);
  } catch (err) {
    if (err instanceof WasenderAPIError) {
      throw new Error(`WhatsApp: ${err.apiMessage}`);
    }
    throw err;
  }
}
