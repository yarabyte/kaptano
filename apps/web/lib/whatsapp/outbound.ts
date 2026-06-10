import { WasenderAPIError } from "wasenderapi";
import type { Prisma } from "@kaptano/db";
import {
  WHATSAPP_MESSAGE_TEMPLATE,
  applyMessagePlaceholders,
  parseWhatsappMessageConfig,
  type MessagePlaceholderVars,
  type WhatsappMessageType,
} from "@kaptano/shared";
import { decrypt } from "@/lib/crypto";
import { createSessionWasenderClient } from "@/lib/wasender/create-client";
import { parseRateLimitHeaders, recordRateLimitSnapshot } from "./rate-limits";
import { resolveWhatsappCredentials } from "./resolve-session";

const BASE_URL =
  process.env.WASENDER_API_BASE ?? "https://www.wasenderapi.com/api";

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

function extractMessageId(response: unknown): string {
  const data = response as {
    data?: { msgId?: number | string; message_id?: string };
  };
  const msgId = data.data?.msgId ?? data.data?.message_id;
  if (msgId == null) {
    throw new Error("Réponse Wasender sans identifiant de message");
  }
  return String(msgId);
}

export function buildOutboundMessage(
  messageType: WhatsappMessageType,
  rawConfig: Prisma.JsonValue | null,
  to: string,
  placeholders: MessagePlaceholderVars,
  catalogUrl: string | null,
  catalogName: string
): WasenderOutboundMessage {
  const config = parseWhatsappMessageConfig(messageType, rawConfig ?? {});

  switch (messageType) {
    case "IMAGE": {
      const imageConfig = config as { text?: string; imageUrl: string };
      if (!imageConfig.imageUrl) {
        throw new Error("URL d'image manquante dans la configuration");
      }
      return {
        kind: "image",
        to,
        imageUrl: imageConfig.imageUrl,
        text: imageConfig.text
          ? applyMessagePlaceholders(imageConfig.text, placeholders)
          : undefined,
      };
    }
    case "DOCUMENT": {
      const docConfig = config as {
        text?: string;
        documentUrl?: string;
        fileName?: string;
        useCatalog?: boolean;
      };
      const documentUrl = docConfig.useCatalog ? catalogUrl : docConfig.documentUrl;
      if (!documentUrl) {
        throw new Error(
          docConfig.useCatalog
            ? "Aucun catalogue disponible pour l'envoi"
            : "URL de document manquante dans la configuration"
        );
      }
      return {
        kind: "document",
        to,
        documentUrl,
        fileName: docConfig.fileName ?? catalogName,
        text: docConfig.text
          ? applyMessagePlaceholders(docConfig.text, placeholders)
          : undefined,
      };
    }
    case "POLL": {
      const pollConfig = config as {
        question: string;
        options: string[];
        multiSelect?: boolean;
      };
      return {
        kind: "poll",
        to,
        poll: {
          question: applyMessagePlaceholders(pollConfig.question, placeholders),
          options: pollConfig.options.map((option) =>
            applyMessagePlaceholders(option, placeholders)
          ),
          multiSelect: pollConfig.multiSelect ?? false,
        },
      };
    }
    default: {
      const textConfig = config as { text?: string };
      const template = textConfig.text ?? WHATSAPP_MESSAGE_TEMPLATE;
      return {
        kind: "text",
        to,
        text: applyMessagePlaceholders(template, placeholders),
      };
    }
  }
}

export async function sendOutboundMessage(
  tenantId: string,
  message: WasenderOutboundMessage
): Promise<{ message_id: string }> {
  const credentials = await resolveWhatsappCredentials(tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
    throw new Error(
      credentials.isShared
        ? "Numéro WhatsApp partagé non disponible"
        : "Session WhatsApp non connectée"
    );
  }

  const apiKey = decrypt(credentials.apiKeyEncrypted);
  const client = createSessionWasenderClient(apiKey);

  try {
    switch (message.kind) {
      case "text": {
        const { response } = await client.sendText({
          to: message.to,
          text: message.text,
        });
        return { message_id: extractMessageId(response) };
      }
      case "image": {
        const { response } = await client.sendImage({
          to: message.to,
          text: message.text,
          imageUrl: message.imageUrl,
        });
        return { message_id: extractMessageId(response) };
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
        return { message_id: extractMessageId(response) };
      }
      case "poll": {
        const res = await fetch(`${BASE_URL}/send-message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            to: message.to,
            poll: message.poll,
          }),
        });

        const snapshot = parseRateLimitHeaders(res.headers);
        if (snapshot) {
          void recordRateLimitSnapshot(snapshot).catch(() => undefined);
        }

        const body = (await res.json()) as {
          success?: boolean;
          message?: string;
          retry_after?: number;
          data?: { msgId?: number | string; message_id?: string };
        };

        if (!res.ok || body.success === false) {
          throw new WasenderAPIError(
            body.message ?? "Échec envoi sondage",
            res.status
          );
        }

        return { message_id: extractMessageId(body) };
      }
    }
  } catch (err) {
    if (err instanceof WasenderAPIError) {
      throw new Error(`Wasender: ${err.apiMessage}`);
    }
    throw err;
  }
}
