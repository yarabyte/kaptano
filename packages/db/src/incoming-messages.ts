import type { IncomingWhatsappMessageType, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { jidToPhone } from "./poll-results";

export type IncomingMessageKey = {
  id?: string;
  fromMe?: boolean;
  remoteJid?: string;
  cleanedSenderPn?: string;
  senderPn?: string;
};

export type IncomingMessageContent = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  messageBody?: string;
  imageMessage?: Record<string, unknown>;
  videoMessage?: Record<string, unknown>;
  audioMessage?: Record<string, unknown>;
  documentMessage?: Record<string, unknown>;
  stickerMessage?: Record<string, unknown>;
  contactMessage?: { displayName?: string; vcard?: string };
  locationMessage?: {
    degreesLatitude?: number;
    degreesLongitude?: number;
    name?: string;
    address?: string;
  };
};

export type NormalizedIncomingMessage = {
  key: IncomingMessageKey;
  message?: IncomingMessageContent;
  messageBody?: string;
  pushName?: string;
  messageTimestamp?: number;
};

export type ParsedIncomingContent = {
  messageType: IncomingWhatsappMessageType;
  textBody: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaPayload: Record<string, unknown> | null;
};

/** Normalise les payloads Wasender (`data.key` ou `data.messages`). */
export function normalizeIncomingWebhookData(
  data: unknown
): NormalizedIncomingMessage | null {
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const messages = root.messages;

  if (messages && typeof messages === "object") {
    if (Array.isArray(messages)) {
      const first = messages[0];
      return first ? normalizeIncomingWebhookData({ ...root, messages: first }) : null;
    }

    const entry = messages as Record<string, unknown>;
    if (entry.key) {
      return {
        key: entry.key as IncomingMessageKey,
        message: entry.message as IncomingMessageContent | undefined,
        messageBody:
          typeof entry.messageBody === "string" ? entry.messageBody : undefined,
        pushName: typeof entry.pushName === "string" ? entry.pushName : undefined,
        messageTimestamp:
          typeof entry.messageTimestamp === "number"
            ? entry.messageTimestamp
            : undefined,
      };
    }
  }

  if (root.key) {
    return {
      key: root.key as IncomingMessageKey,
      message: root.message as IncomingMessageContent | undefined,
      messageBody:
        typeof root.messageBody === "string" ? root.messageBody : undefined,
      pushName: typeof root.pushName === "string" ? root.pushName : undefined,
      messageTimestamp:
        typeof root.messageTimestamp === "number"
          ? root.messageTimestamp
          : undefined,
    };
  }

  return null;
}

export function parseIncomingMessageContent(
  message?: IncomingMessageContent,
  messageBody?: string
): ParsedIncomingContent {
  if (messageBody?.trim()) {
    return {
      messageType: "TEXT",
      textBody: messageBody.trim(),
      mediaMimeType: null,
      mediaFileName: null,
      mediaPayload: null,
    };
  }

  if (message?.conversation?.trim()) {
    return {
      messageType: "TEXT",
      textBody: message.conversation.trim(),
      mediaMimeType: null,
      mediaFileName: null,
      mediaPayload: null,
    };
  }

  if (message?.extendedTextMessage?.text?.trim()) {
    return {
      messageType: "TEXT",
      textBody: message.extendedTextMessage.text.trim(),
      mediaMimeType: null,
      mediaFileName: null,
      mediaPayload: null,
    };
  }

  if (message?.imageMessage) {
    const media = message.imageMessage;
    return {
      messageType: "IMAGE",
      textBody:
        typeof media.caption === "string" ? media.caption : null,
      mediaMimeType:
        typeof media.mimetype === "string" ? media.mimetype : "image/jpeg",
      mediaFileName: null,
      mediaPayload: media,
    };
  }

  if (message?.videoMessage) {
    const media = message.videoMessage;
    return {
      messageType: "VIDEO",
      textBody:
        typeof media.caption === "string" ? media.caption : null,
      mediaMimeType:
        typeof media.mimetype === "string" ? media.mimetype : "video/mp4",
      mediaFileName: null,
      mediaPayload: media,
    };
  }

  if (message?.audioMessage) {
    const media = message.audioMessage;
    return {
      messageType: "AUDIO",
      textBody: null,
      mediaMimeType:
        typeof media.mimetype === "string" ? media.mimetype : "audio/ogg",
      mediaFileName: null,
      mediaPayload: media,
    };
  }

  if (message?.documentMessage) {
    const media = message.documentMessage;
    return {
      messageType: "DOCUMENT",
      textBody: typeof media.title === "string" ? media.title : null,
      mediaMimeType:
        typeof media.mimetype === "string"
          ? media.mimetype
          : "application/octet-stream",
      mediaFileName:
        typeof media.fileName === "string" ? media.fileName : null,
      mediaPayload: media,
    };
  }

  if (message?.stickerMessage) {
    const media = message.stickerMessage;
    return {
      messageType: "STICKER",
      textBody: null,
      mediaMimeType:
        typeof media.mimetype === "string" ? media.mimetype : "image/webp",
      mediaFileName: null,
      mediaPayload: media,
    };
  }

  if (message?.locationMessage) {
    const loc = message.locationMessage;
    const parts = [loc.name, loc.address].filter(Boolean);
    return {
      messageType: "LOCATION",
      textBody: parts.length > 0 ? parts.join(" — ") : null,
      mediaMimeType: null,
      mediaFileName: null,
      mediaPayload: null,
    };
  }

  if (message?.contactMessage) {
    return {
      messageType: "CONTACT",
      textBody: message.contactMessage.displayName ?? null,
      mediaMimeType: null,
      mediaFileName: null,
      mediaPayload: null,
    };
  }

  return {
    messageType: "UNKNOWN",
    textBody: null,
    mediaMimeType: null,
    mediaFileName: null,
    mediaPayload: null,
  };
}

function phoneFromIncomingKey(key: IncomingMessageKey): string | null {
  if (key.cleanedSenderPn) {
    const digits = key.cleanedSenderPn.replace(/\D/g, "");
    return digits ? `+${digits}` : null;
  }

  if (key.senderPn) {
    const phone = jidToPhone(key.senderPn);
    if (phone) return phone;
  }

  if (key.remoteJid) {
    return jidToPhone(key.remoteJid);
  }

  return null;
}

export async function findLeadIdByIncomingKey(
  tenantId: string,
  key: IncomingMessageKey
): Promise<string | null> {
  const phone = phoneFromIncomingKey(key);
  if (!phone) return null;

  const lead = await prisma.lead.findUnique({
    where: {
      tenantId_whatsappNumber: { tenantId, whatsappNumber: phone },
    },
    select: { id: true },
  });

  return lead?.id ?? null;
}

/** Résout le tenant à partir du numéro (webhook partagé). */
export async function findTenantIdByIncomingKey(
  key: IncomingMessageKey
): Promise<string | null> {
  const phone = phoneFromIncomingKey(key);
  if (!phone) return null;

  const lead = await prisma.lead.findFirst({
    where: { whatsappNumber: phone },
    select: { tenantId: true },
    orderBy: { capturedAt: "desc" },
  });

  return lead?.tenantId ?? null;
}

export type PersistIncomingMessageInput = {
  tenantId: string;
  key: IncomingMessageKey;
  message?: IncomingMessageContent;
  messageBody?: string;
  pushName?: string;
  messageTimestamp?: number;
  mediaPublicUrl?: string | null;
  mediaStoragePath?: string | null;
};

export type PersistIncomingMessageResult = {
  id: string;
  created: boolean;
  needsMediaDecrypt: boolean;
  mediaPayload: Record<string, unknown> | null;
  messageType: IncomingWhatsappMessageType;
};

export async function persistIncomingWhatsappMessage(
  input: PersistIncomingMessageInput
): Promise<PersistIncomingMessageResult | null> {
  const { key } = input;
  if (key.fromMe) return null;

  const wasenderMessageId = key.id;
  const remoteJid = key.remoteJid;
  if (!wasenderMessageId || !remoteJid) return null;

  const parsed = parseIncomingMessageContent(input.message, input.messageBody);
  const leadId = await findLeadIdByIncomingKey(input.tenantId, key);

  const receivedAt =
    input.messageTimestamp != null
      ? new Date(input.messageTimestamp * 1000)
      : new Date();

  const data: Prisma.IncomingWhatsappMessageCreateInput = {
    tenant: { connect: { id: input.tenantId } },
    wasenderMessageId,
    remoteJid,
    fromMe: false,
    messageType: parsed.messageType,
    textBody: parsed.textBody,
    mediaMimeType: parsed.mediaMimeType,
    mediaFileName: parsed.mediaFileName,
    mediaPublicUrl: input.mediaPublicUrl ?? null,
    mediaStoragePath: input.mediaStoragePath ?? null,
    pushName: input.pushName ?? null,
    receivedAt,
    ...(leadId ? { lead: { connect: { id: leadId } } } : {}),
  };

  const existing = await prisma.incomingWhatsappMessage.findUnique({
    where: {
      tenantId_wasenderMessageId: {
        tenantId: input.tenantId,
        wasenderMessageId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.incomingWhatsappMessage.update({
      where: { id: existing.id },
      data: {
        textBody: parsed.textBody ?? undefined,
        mediaMimeType: parsed.mediaMimeType ?? undefined,
        mediaFileName: parsed.mediaFileName ?? undefined,
        mediaPublicUrl: input.mediaPublicUrl ?? undefined,
        mediaStoragePath: input.mediaStoragePath ?? undefined,
        pushName: input.pushName ?? undefined,
        ...(leadId ? { leadId } : {}),
      },
    });

    return {
      id: existing.id,
      created: false,
      needsMediaDecrypt:
        parsed.mediaPayload != null && !input.mediaPublicUrl && !input.mediaStoragePath,
      mediaPayload: parsed.mediaPayload,
      messageType: parsed.messageType,
    };
  }

  const record = await prisma.incomingWhatsappMessage.create({ data });

  return {
    id: record.id,
    created: true,
    needsMediaDecrypt:
      parsed.mediaPayload != null && !input.mediaPublicUrl && !input.mediaStoragePath,
    mediaPayload: parsed.mediaPayload,
    messageType: parsed.messageType,
  };
}

export async function updateIncomingMessageMedia(
  id: string,
  media: { mediaPublicUrl?: string; mediaStoragePath?: string }
): Promise<void> {
  await prisma.incomingWhatsappMessage.update({
    where: { id },
    data: {
      mediaPublicUrl: media.mediaPublicUrl,
      mediaStoragePath: media.mediaStoragePath,
    },
  });
}

export async function handleIncomingWhatsappWebhook(
  data: unknown,
  tenantId: string
): Promise<PersistIncomingMessageResult | null> {
  const normalized = normalizeIncomingWebhookData(data);
  if (!normalized) return null;

  return persistIncomingWhatsappMessage({
    tenantId,
    key: normalized.key,
    message: normalized.message,
    messageBody: normalized.messageBody,
    pushName: normalized.pushName,
    messageTimestamp: normalized.messageTimestamp,
  });
}

export type IncomingMessageListItem = {
  id: string;
  wasenderMessageId: string;
  remoteJid: string;
  messageType: IncomingWhatsappMessageType;
  textBody: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaPublicUrl: string | null;
  pushName: string | null;
  receivedAt: Date;
  lead: {
    id: string;
    fullName: string;
    whatsappNumber: string;
  } | null;
};

export async function getTenantIncomingMessages(
  tenantId: string,
  options?: { limit?: number; leadId?: string }
): Promise<IncomingMessageListItem[]> {
  const limit = Math.min(options?.limit ?? 50, 100);

  return prisma.incomingWhatsappMessage.findMany({
    where: {
      tenantId,
      fromMe: false,
      ...(options?.leadId ? { leadId: options.leadId } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      wasenderMessageId: true,
      remoteJid: true,
      messageType: true,
      textBody: true,
      mediaMimeType: true,
      mediaFileName: true,
      mediaPublicUrl: true,
      pushName: true,
      receivedAt: true,
      lead: {
        select: { id: true, fullName: true, whatsappNumber: true },
      },
    },
  });
}

export async function countTenantIncomingMessages(tenantId: string): Promise<number> {
  return prisma.incomingWhatsappMessage.count({
    where: { tenantId, fromMe: false },
  });
}
