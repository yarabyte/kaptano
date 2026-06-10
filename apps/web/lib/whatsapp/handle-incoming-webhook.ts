import type { IncomingMessageKey } from "@kaptano/db";
import {
  findTenantIdByIncomingKey,
  handleIncomingWhatsappWebhook,
  normalizeIncomingWebhookData,
  updateIncomingMessageMedia,
} from "@kaptano/db";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { SHARED_WHATSAPP_SESSION_ID } from "@/lib/whatsapp/resolve-session";
import { prisma } from "@/lib/prisma";
import { runInBackground } from "@/lib/background-task";
import {
  archiveIncomingMediaToStorage,
  decryptIncomingMedia,
} from "@/lib/whatsapp/incoming-message-media";

async function resolveApiKeyEncrypted(
  tenantId: string
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      planTier: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      whatsappSession: { select: { apiKeyEncrypted: true } },
    },
  });

  if (!tenant) return null;

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  if (usesSharedWhatsapp(tier)) {
    const shared = await prisma.sharedWhatsappSession.findUnique({
      where: { id: SHARED_WHATSAPP_SESSION_ID },
      select: { apiKeyEncrypted: true },
    });
    return shared?.apiKeyEncrypted ?? null;
  }

  return tenant.whatsappSession?.apiKeyEncrypted ?? null;
}

async function processIncomingMedia(
  tenantId: string,
  recordId: string,
  key: IncomingMessageKey,
  messageType: string,
  mediaPayload: Record<string, unknown>,
  mimeType: string | null,
  fileName: string | null
): Promise<void> {
  const apiKeyEncrypted = await resolveApiKeyEncrypted(tenantId);
  if (!apiKeyEncrypted) return;

  const publicUrl = await decryptIncomingMedia(
    apiKeyEncrypted,
    key,
    messageType,
    mediaPayload
  );

  if (!key.id || !mimeType) {
    await updateIncomingMessageMedia(recordId, { mediaPublicUrl: publicUrl });
    return;
  }

  const archived = await archiveIncomingMediaToStorage(
    tenantId,
    key.id,
    publicUrl,
    mimeType,
    fileName
  );

  await updateIncomingMessageMedia(recordId, {
    mediaPublicUrl: archived.signedUrl,
    mediaStoragePath: archived.storagePath,
  });
}

export async function handleIncomingMessageWebhookEvent(
  data: unknown,
  tenantId: string
): Promise<void> {
  const result = await handleIncomingWhatsappWebhook(data, tenantId);
  if (!result?.needsMediaDecrypt || !result.mediaPayload) return;

  const normalized = normalizeIncomingWebhookData(data);
  if (!normalized) return;

  const recordId = result.id;
  const { key } = normalized;
  const parsedMime =
    typeof result.mediaPayload.mimetype === "string"
      ? result.mediaPayload.mimetype
      : null;
  const parsedName =
    typeof result.mediaPayload.fileName === "string"
      ? result.mediaPayload.fileName
      : null;

  runInBackground(async () => {
    try {
      await processIncomingMedia(
        tenantId,
        recordId,
        key,
        result.messageType,
        result.mediaPayload!,
        parsedMime,
        parsedName
      );
    } catch (err) {
      console.error("[incoming-message/media]", err);
    }
  });
}

export async function handleSharedIncomingMessageWebhookEvent(
  data: unknown
): Promise<void> {
  const normalized = normalizeIncomingWebhookData(data);
  if (!normalized) {
    console.warn("[incoming-message/shared] payload non reconnu", data);
    return;
  }

  if (normalized.key.fromMe) return;

  const tenantId = await findTenantIdByIncomingKey(normalized.key);
  if (!tenantId) {
    console.warn("[incoming-message/shared] lead introuvable pour", normalized.key);
    return;
  }

  await handleIncomingMessageWebhookEvent(data, tenantId);
}
