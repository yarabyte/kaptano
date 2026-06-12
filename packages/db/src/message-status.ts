import type { MessageStatus } from "@prisma/client";
import { prisma } from "./client";

/** Codes statut Wasender — https://wasenderapi.com/api-docs/messages/get-message-info */
export const WASENDER_MESSAGE_STATUS = {
  ERROR: 0,
  PENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  PLAYED: 5,
} as const;

export type WasenderMessageInfoPayload = {
  msgId?: number | string;
  status?: number;
  key?: { id?: string; remoteJid?: string; fromMe?: boolean };
  messageTimestamp?: string | number;
};

const STATUS_RANK: Record<MessageStatus, number> = {
  QUEUED: 0,
  SENDING: 1,
  FAILED: -1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
};

export function mapWasenderStatusCode(status: number): MessageStatus | null {
  switch (status) {
    case WASENDER_MESSAGE_STATUS.ERROR:
      return "FAILED";
    case WASENDER_MESSAGE_STATUS.PENDING:
      return "SENDING";
    case WASENDER_MESSAGE_STATUS.SENT:
      return "SENT";
    case WASENDER_MESSAGE_STATUS.DELIVERED:
      return "DELIVERED";
    case WASENDER_MESSAGE_STATUS.READ:
    case WASENDER_MESSAGE_STATUS.PLAYED:
      return "READ";
    default:
      return null;
  }
}

export function mapWasenderWebhookStatus(
  status: string | number | undefined
): MessageStatus | null {
  if (status == null) return null;
  if (typeof status === "number") return mapWasenderStatusCode(status);

  const normalized = status.toLowerCase();
  const map: Record<string, MessageStatus> = {
    error: "FAILED",
    failed: "FAILED",
    pending: "SENDING",
    in_progress: "SENDING",
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    played: "READ",
  };

  return map[normalized] ?? null;
}

export function shouldAdvanceMessageStatus(
  current: MessageStatus,
  next: MessageStatus
): boolean {
  if (next === "FAILED") {
    return current !== "READ" && current !== "DELIVERED";
  }
  if (current === "FAILED") return false;
  return STATUS_RANK[next] > STATUS_RANK[current];
}

export function buildMessageJobStatusPatch(
  next: MessageStatus,
  now = new Date()
): {
  status: MessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  lastError?: string | null;
} {
  const patch: {
    status: MessageStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    lastError?: string | null;
  } = { status: next };

  if (next === "FAILED") {
    patch.lastError = "Échec d'envoi WhatsApp (statut Wasender ERROR)";
  } else {
    patch.lastError = null;
  }

  if (next === "SENT" || next === "DELIVERED" || next === "READ") {
    patch.sentAt = now;
  }
  if (next === "DELIVERED" || next === "READ") {
    patch.deliveredAt = now;
  }
  if (next === "READ") {
    patch.readAt = now;
  }

  return patch;
}

export async function findMessageJobByWasenderReference(
  tenantId: string | undefined,
  messageId: string
) {
  return prisma.messageJob.findFirst({
    where: {
      ...(tenantId ? { tenantId } : {}),
      OR: [{ wasenderMessageId: messageId }, { wasenderKeyId: messageId }],
    },
    orderBy: { sentAt: "desc" },
  });
}

export async function applyWasenderWebhookMessageStatus(
  tenantId: string | undefined,
  messageId: string,
  rawStatus: string | number | undefined
): Promise<boolean> {
  const nextStatus = mapWasenderWebhookStatus(rawStatus);
  if (!nextStatus) return false;
  return applyMessageJobStatusByReference(tenantId, messageId, nextStatus);
}

export async function applyMessageJobStatusByReference(
  tenantId: string | undefined,
  messageId: string,
  nextStatus: MessageStatus
): Promise<boolean> {
  const job = await findMessageJobByWasenderReference(tenantId, messageId);
  if (!job || !shouldAdvanceMessageStatus(job.status, nextStatus)) {
    return false;
  }

  const patch = buildMessageJobStatusPatch(nextStatus);
  await prisma.messageJob.update({
    where: { id: job.id },
    data: {
      status: patch.status,
      ...(patch.sentAt && !job.sentAt ? { sentAt: patch.sentAt } : {}),
      ...(patch.deliveredAt && !job.deliveredAt
        ? { deliveredAt: patch.deliveredAt }
        : {}),
      ...(patch.readAt ? { readAt: patch.readAt } : {}),
      ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
    },
  });

  return true;
}

export async function applyWasenderMessageInfoToJob(
  messageJobId: string,
  info: WasenderMessageInfoPayload
): Promise<void> {
  const job = await prisma.messageJob.findUnique({ where: { id: messageJobId } });
  if (!job || info.status == null) return;

  const nextStatus = mapWasenderStatusCode(Number(info.status));
  if (!nextStatus || !shouldAdvanceMessageStatus(job.status, nextStatus)) {
    if (info.key?.id && !job.wasenderKeyId) {
      await prisma.messageJob.update({
        where: { id: job.id },
        data: { wasenderKeyId: info.key.id },
      });
    }
    return;
  }

  const patch = buildMessageJobStatusPatch(nextStatus);
  await prisma.messageJob.update({
    where: { id: job.id },
    data: {
      status: patch.status,
      wasenderKeyId: info.key?.id ?? job.wasenderKeyId,
      ...(patch.sentAt && !job.sentAt ? { sentAt: patch.sentAt } : {}),
      ...(patch.deliveredAt && !job.deliveredAt
        ? { deliveredAt: patch.deliveredAt }
        : {}),
      ...(patch.readAt ? { readAt: patch.readAt } : {}),
      ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
    },
  });
}

export async function listMessageJobsForStatusSync(tenantId: string, limit = 25) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.messageJob.findMany({
    where: {
      tenantId,
      wasenderMessageId: { not: null },
      status: { in: ["SENDING", "SENT", "DELIVERED"] },
      sentAt: { gte: since },
    },
    orderBy: { sentAt: "desc" },
    take: limit,
    select: { id: true, wasenderMessageId: true, status: true },
  });
}
