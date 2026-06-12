import { prisma } from "./client";

export type MessageKey = {
  id?: string;
  remoteJid?: string;
  fromMe?: boolean;
};

export type PollSnapshot = {
  question: string;
  options: string[];
  multiSelect?: boolean;
};

/** JID WhatsApp → E.164 (ex. 23761234567@s.whatsapp.net → +23761234567) */
export function jidToPhone(jid: string): string | null {
  const userPart = jid.split("@")[0]?.split(":")[0];
  if (!userPart || !/^\d+$/.test(userPart)) return null;
  return `+${userPart}`;
}

/**
 * Webhook message.sent — synchronise data.key.id (ID WhatsApp) avec le MessageJob.
 */
export async function handleMessageSentWebhook(
  data: { key?: MessageKey },
  tenantId?: string
): Promise<void> {
  const key = data.key;
  if (!key?.id || !key.fromMe || !key.remoteJid) return;

  const phone = jidToPhone(key.remoteJid);
  if (!phone) return;

  const job = await prisma.messageJob.findFirst({
    where: {
      ...(tenantId ? { tenantId } : {}),
      status: { in: ["SENT", "DELIVERED", "READ", "SENDING"] },
      lead: { whatsappNumber: phone },
      sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { sentAt: "desc" },
  });

  if (!job || job.wasenderKeyId === key.id) return;

  await prisma.messageJob.update({
    where: { id: job.id },
    data: { wasenderKeyId: key.id },
  });
}
