import { WASENDER_WEBHOOK_EVENTS } from "@kaptano/shared";
import { WasenderAPIError } from "wasenderapi";
import { createAccountWasenderClient } from "./create-client";
import { SharedWhatsappApiError } from "./shared-session";

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
    });
  } catch (err) {
    if (err instanceof WasenderAPIError) {
      throw new SharedWhatsappApiError(`WhatsApp: ${err.apiMessage}`, err.statusCode);
    }
    throw err;
  }
}
