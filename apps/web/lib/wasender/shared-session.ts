import QRCode from "qrcode";
import { WasenderAPIError } from "wasenderapi";
import { createAccountWasenderClient } from "./create-client";

const ACCOUNT_TOKEN = process.env.WASENDER_ACCOUNT_TOKEN ?? "";

const WEBHOOK_EVENTS = [
  "session.status",
  "message.sent",
  "messages.update",
  "qrcode.updated",
  "poll.results",
];

export type SessionCreateResult = {
  id: string;
  api_key: string;
  webhook_secret: string;
  phone_number?: string;
};

type SessionWithSecrets = {
  api_key?: string;
  webhook_secret?: string;
};

export type ConnectQrResult = {
  qrCode: string | null;
  status: string;
  alreadyConnected: boolean;
};

function getAccountClient() {
  if (!ACCOUNT_TOKEN) {
    throw new Error(
      "WASENDER_ACCOUNT_TOKEN manquant. Configurez-le sur Vercel (Settings → Environment Variables)."
    );
  }
  return createAccountWasenderClient(ACCOUNT_TOKEN);
}

function handleError(err: unknown): never {
  if (err instanceof WasenderAPIError) {
    if (
      err.statusCode === 401 &&
      err.apiMessage.toLowerCase().includes("personal access token")
    ) {
      throw new Error(
        "Token API WhatsApp invalide ou expiré. Vérifiez la configuration du compte plateforme."
      );
    }
    throw new Error(`WhatsApp: ${err.apiMessage}`);
  }
  throw err;
}

async function toQrImage(qr: string): Promise<string> {
  if (qr.startsWith("data:") || qr.startsWith("http://") || qr.startsWith("https://")) {
    return qr;
  }
  return QRCode.toDataURL(qr, { width: 280, margin: 2 });
}

export async function createSharedWhatsappSession(
  webhookUrl: string,
  phoneNumber: string
): Promise<SessionCreateResult> {
  const client = getAccountClient();

  try {
    const { response } = await client.createWhatsAppSession({
      name: "Kaptano — numéro partagé",
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
        "Réponse API WhatsApp incomplète (clés de session manquantes)"
      );
    }

    return {
      id: String(data.id),
      api_key: apiKey,
      webhook_secret: webhookSecret,
      phone_number: data.phone_number,
    };
  } catch (err) {
    handleError(err);
  }
}

export async function connectAndGetSharedSessionQr(
  sessionId: string
): Promise<ConnectQrResult> {
  const client = getAccountClient();

  try {
    const { response: connectResponse } = await client.connectWhatsAppSession(
      Number(sessionId),
      true
    );
    const connectData = connectResponse.data;
    const status = String(connectData.status ?? "PENDING");

    if (status.toUpperCase() === "CONNECTED") {
      return { qrCode: null, status, alreadyConnected: true };
    }

    if (connectData.qrCode) {
      return {
        qrCode: await toQrImage(connectData.qrCode),
        status,
        alreadyConnected: false,
      };
    }

    const { response } = await client.getWhatsAppSessionQRCode(Number(sessionId));
    return {
      qrCode: await toQrImage(response.data.qrCode),
      status,
      alreadyConnected: false,
    };
  } catch (err) {
    handleError(err);
  }
}

export { getSharedWebhookUrl } from "./webhook-url";
