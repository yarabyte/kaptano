import { WasenderAPIError, type Wasender } from "wasenderapi";
import {
  createAccountWasenderClient,
  createSessionWasenderClient,
} from "./create-client";
import { logger } from "../lib/logger";

const BASE_URL =
  process.env.WASENDER_API_BASE ?? "https://www.wasenderapi.com/api";
const ACCOUNT_TOKEN = process.env.WASENDER_ACCOUNT_TOKEN ?? "";

const WEBHOOK_EVENTS = [
  "session.status",
  "message.sent",
  "messages.update",
  "qrcode.updated",
  "poll.results",
];

type SessionCreateResult = {
  id: string;
  api_key: string;
  webhook_secret: string;
  phone_number?: string;
};

type SessionWithSecrets = {
  api_key?: string;
  webhook_secret?: string;
};

export type WasenderOutboundMessage =
  | { kind: "text"; to: string; text: string }
  | { kind: "image"; to: string; text?: string; imageUrl: string }
  | {
      kind: "document";
      to: string;
      text?: string;
      documentUrl: string;
      fileName?: string;
    }
  | {
      kind: "poll";
      to: string;
      poll: {
        question: string;
        options: string[];
        multiSelect?: boolean;
      };
    };

export class WasenderClient {
  private getAccountClient(): Wasender {
    if (!ACCOUNT_TOKEN) {
      throw new Error("WASENDER_ACCOUNT_TOKEN manquant dans .env");
    }
    return createAccountWasenderClient(ACCOUNT_TOKEN);
  }

  private getSessionClient(apiKey: string): Wasender {
    return createSessionWasenderClient(apiKey);
  }

  private extractMessageId(response: unknown): string {
    const data = response as {
      data?: { msgId?: number | string; message_id?: string };
    };
    const msgId = data.data?.msgId ?? data.data?.message_id;
    if (msgId == null) {
      throw new Error("Réponse Wasender sans identifiant de message");
    }
    return String(msgId);
  }

  private handleError(err: unknown, context: Record<string, unknown>): never {
    if (err instanceof WasenderAPIError) {
      logger.error(
        { ...context, status: err.statusCode, message: err.apiMessage },
        "WaSender API error"
      );
      if (
        err.statusCode === 401 &&
        err.apiMessage.toLowerCase().includes("personal access token")
      ) {
        throw new Error(
          "Token Wasender invalide ou expiré. Générez un nouveau Personal Access Token sur wasenderapi.com (Profil → Personal Access Token) et mettez à jour WASENDER_ACCOUNT_TOKEN dans .env"
        );
      }
      throw new Error(`WaSender: ${err.apiMessage}`);
    }
    throw err;
  }

  async createSession(
    webhookUrl: string,
    phoneNumber: string,
    name: string
  ): Promise<SessionCreateResult> {
    const client = this.getAccountClient();

    try {
      const { response } = await client.createWhatsAppSession({
        name,
        phone_number: phoneNumber,
        account_protection: true,
        log_messages: true,
        webhook_url: webhookUrl,
        webhook_enabled: true,
        webhook_events: WEBHOOK_EVENTS,
      });

      const data = response.data as typeof response.data & SessionWithSecrets;
      const apiKey = data.api_key;
      const webhookSecret = data.webhook_secret;

      if (!apiKey || !webhookSecret) {
        throw new Error(
          "Réponse Wasender incomplète (api_key ou webhook_secret manquant)"
        );
      }

      return {
        id: String(data.id),
        api_key: apiKey,
        webhook_secret: webhookSecret,
        phone_number: data.phone_number,
      };
    } catch (err) {
      this.handleError(err, { action: "createSession" });
    }
  }

  async getSessionQr(sessionId: string): Promise<{ qr: string | null; alreadyConnected?: boolean }> {
    const client = this.getAccountClient();

    try {
      const { response: connectResponse } = await client.connectWhatsAppSession(
        Number(sessionId),
        true
      );
      const connectData = connectResponse.data;

      if (connectData.status === "CONNECTED") {
        return { qr: null, alreadyConnected: true };
      }

      if (connectData.qrCode) {
        return { qr: connectData.qrCode };
      }

      const { response } = await client.getWhatsAppSessionQRCode(Number(sessionId));
      return { qr: response.data.qrCode };
    } catch (err) {
      this.handleError(err, { action: "getSessionQr", sessionId });
    }
  }

  async send(sessionToken: string, message: WasenderOutboundMessage) {
    const client = this.getSessionClient(sessionToken);

    try {
      switch (message.kind) {
        case "text": {
          const { response } = await client.sendText({
            to: message.to,
            text: message.text,
          });
          return { message_id: this.extractMessageId(response) };
        }
        case "image": {
          const { response } = await client.sendImage({
            to: message.to,
            text: message.text,
            imageUrl: message.imageUrl,
          });
          return { message_id: this.extractMessageId(response) };
        }
        case "document": {
          const payload: {
            to: string;
            text?: string;
            documentUrl: string;
            fileName?: string;
          } = {
            to: message.to,
            documentUrl: message.documentUrl,
          };
          if (message.text) payload.text = message.text;
          if (message.fileName) payload.fileName = message.fileName;

          const { response } = await client.sendDocument(payload);
          return { message_id: this.extractMessageId(response) };
        }
        case "poll": {
          const res = await fetch(`${BASE_URL}/send-message`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              to: message.to,
              poll: message.poll,
            }),
          });

          const body = (await res.json()) as {
            success?: boolean;
            message?: string;
            data?: { msgId?: number | string; message_id?: string };
          };

          if (!res.ok || body.success === false) {
            throw new WasenderAPIError(
              body.message ?? "Échec envoi sondage",
              res.status
            );
          }

          return { message_id: this.extractMessageId(body) };
        }
      }
    } catch (err) {
      this.handleError(err, { action: "send", kind: message.kind, to: message.to });
    }
  }

  /** @deprecated Utiliser send() */
  async sendMessage(
    sessionToken: string,
    to: string,
    text: string
  ): Promise<{ message_id: string }> {
    return this.send(sessionToken, { kind: "text", to, text });
  }
}

export const wasender = new WasenderClient();
