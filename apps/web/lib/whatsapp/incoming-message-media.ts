import { CATALOG_BUCKET } from "@kaptano/shared";
import type { IncomingMessageKey } from "@kaptano/db";
import { createSessionWasenderClient } from "@/lib/wasender/create-client";
import { decrypt } from "@/lib/crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type DecryptMediaResponse = {
  success?: boolean;
  publicUrl?: string;
  data?: { publicUrl?: string; url?: string };
};

function extensionForMime(mime: string, fileName?: string | null): string {
  if (fileName?.includes(".")) {
    return fileName.slice(fileName.lastIndexOf("."));
  }

  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "audio/ogg": ".ogg",
    "application/pdf": ".pdf",
  };

  return map[mime] ?? "";
}

function buildDecryptPayload(
  key: IncomingMessageKey,
  messageType: string,
  mediaPayload: Record<string, unknown>
): object {
  const messageKey = key.id ? { id: key.id } : {};
  const mediaKey =
    messageType === "IMAGE"
      ? "imageMessage"
      : messageType === "VIDEO"
        ? "videoMessage"
        : messageType === "AUDIO"
          ? "audioMessage"
          : messageType === "DOCUMENT"
            ? "documentMessage"
            : messageType === "STICKER"
              ? "stickerMessage"
              : null;

  if (!mediaKey) {
    throw new Error(`Type média non pris en charge : ${messageType}`);
  }

  return {
    messages: {
      key: messageKey,
      message: {
        [mediaKey]: mediaPayload,
      },
    },
  };
}

export async function decryptIncomingMedia(
  apiKeyEncrypted: string,
  key: IncomingMessageKey,
  messageType: string,
  mediaPayload: Record<string, unknown>
): Promise<string> {
  const client = createSessionWasenderClient(decrypt(apiKeyEncrypted));
  const payload = buildDecryptPayload(key, messageType, mediaPayload);
  const { response } = await client.decryptMediaFile(payload);
  const body = response as DecryptMediaResponse;
  const publicUrl = body.publicUrl ?? body.data?.publicUrl ?? body.data?.url;

  if (!publicUrl) {
    throw new Error("Réponse decrypt-media sans publicUrl");
  }

  return publicUrl;
}

export async function archiveIncomingMediaToStorage(
  tenantId: string,
  messageId: string,
  publicUrl: string,
  mimeType: string,
  fileName?: string | null
): Promise<{ storagePath: string; signedUrl: string }> {
  const res = await fetch(publicUrl);
  if (!res.ok) {
    throw new Error(`Téléchargement média échoué (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = extensionForMime(mimeType, fileName);
  const safeName = (fileName ?? `media${ext}`).replace(/[^\w.\-]+/g, "_");
  const storagePath = `${tenantId}/incoming-media/${messageId}-${safeName}`;
  const supabase = createSupabaseServiceClient();

  const { error: uploadError } = await supabase.storage
    .from(CATALOG_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(CATALOG_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message ?? "URL signée indisponible");
  }

  return { storagePath, signedUrl: signedData.signedUrl };
}
