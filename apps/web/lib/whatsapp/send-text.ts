import { WasenderAPIError } from "wasenderapi";
import { decrypt } from "@/lib/crypto";
import { createSessionWasenderClient } from "@/lib/wasender/create-client";
import { resolveWhatsappCredentials } from "./resolve-session";

export async function sendWhatsappText(
  tenantId: string,
  to: string,
  text: string
): Promise<void> {
  const credentials = await resolveWhatsappCredentials(tenantId);
  if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
    throw new Error(
      credentials.isShared
        ? "Numéro WhatsApp partagé non disponible — contactez le support"
        : "Session WhatsApp non connectée — connectez votre numéro dans les paramètres"
    );
  }

  const apiKey = decrypt(credentials.apiKeyEncrypted);
  const client = createSessionWasenderClient(apiKey);

  try {
    await client.sendText({ to, text });
  } catch (err) {
    if (err instanceof WasenderAPIError) {
      throw new Error(`Wasender: ${err.apiMessage}`);
    }
    throw err;
  }
}
