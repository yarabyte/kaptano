import type { Prisma } from "@kaptano/db";
import type { MessageKey, PollResultEntry, PollResultsData } from "wasenderapi";
import { prisma } from "@/lib/prisma";

/** Aligné sur https://wasenderapi.com/api-docs/webhooks/webhook-poll-results */
export type { PollResultEntry, PollResultsData };

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

async function findMessageJobForPollKey(key: MessageKey) {
  if (key.id) {
    const byId = await prisma.messageJob.findFirst({
      where: { wasenderMessageId: key.id },
    });
    if (byId) return byId;
  }

  if (!key.remoteJid) return null;

  const phone = jidToPhone(key.remoteJid);
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  const candidates = await prisma.messageJob.findMany({
    where: {
      isPoll: true,
      status: { in: ["SENT", "DELIVERED", "READ", "SENDING"] },
    },
    include: { lead: { select: { whatsappNumber: true } } },
    orderBy: { sentAt: "desc" },
    take: 20,
  });

  return (
    candidates.find(
      (job) => job.lead.whatsappNumber.replace(/\D/g, "") === digits
    ) ?? null
  );
}

/**
 * Webhook message.sent — synchronise data.key.id (ID WhatsApp) avec le MessageJob.
 * L'API send-message renvoie msgId numérique, mais poll.results utilise key.id.
 * @see https://wasenderapi.com/api-docs/webhooks/webhook-message-sent
 */
export async function handleMessageSentWebhook(data: {
  key?: MessageKey;
}): Promise<void> {
  const key = data.key;
  if (!key?.id || !key.fromMe || !key.remoteJid) return;

  const phone = jidToPhone(key.remoteJid);
  if (!phone) return;

  const job = await prisma.messageJob.findFirst({
    where: {
      status: { in: ["SENT", "DELIVERED", "READ", "SENDING"] },
      lead: { whatsappNumber: phone },
      sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { sentAt: "desc" },
  });

  if (!job || job.wasenderMessageId === key.id) return;

  const storedId = job.wasenderMessageId ?? "";
  const isNumericApiId = /^\d+$/.test(storedId);

  if (isNumericApiId || storedId !== key.id) {
    await prisma.messageJob.update({
      where: { id: job.id },
      data: { wasenderMessageId: key.id },
    });
  }
}

/**
 * Webhook poll.results — enregistre les votes.
 * @see https://wasenderapi.com/api-docs/webhooks/webhook-poll-results
 */
export async function handlePollResultsWebhook(
  data: PollResultsData,
  timestamp?: number
): Promise<void> {
  const messageId = data.key?.id;
  if (!messageId || !data.pollResult?.length) return;

  const job = await findMessageJobForPollKey(data.key);
  if (!job) return;

  await prisma.messageJob.update({
    where: { id: job.id },
    data: {
      isPoll: true,
      wasenderMessageId: messageId,
      pollResults: data.pollResult as unknown as Prisma.InputJsonValue,
      pollResultsAt: timestamp ? new Date(timestamp) : new Date(),
    },
  });
}

export async function getTenantPollResults(tenantId: string) {
  const [jobs, leads] = await Promise.all([
    prisma.messageJob.findMany({
      where: {
        tenantId,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        isPoll: true,
      },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
    prisma.lead.findMany({
      where: { tenantId },
      select: { fullName: true, whatsappNumber: true },
    }),
  ]);

  const leadByPhone = new Map(
    leads.map((lead) => [lead.whatsappNumber.replace(/\D/g, ""), lead.fullName])
  );

  return jobs.map((job) => {
    const snapshot = job.pollSnapshot as PollSnapshot | null;
    const rawResults = (job.pollResults as PollResultEntry[] | null) ?? [];

    const options = rawResults.map((option) => {
      const voters = option.voters.map((jid) => {
        const phone = jidToPhone(jid);
        const digits = phone?.replace(/\D/g, "") ?? "";
        return {
          jid,
          phone,
          name: (digits && leadByPhone.get(digits)) || phone || jid,
        };
      });

      return {
        name: option.name,
        count: voters.length,
        voters,
      };
    });

    const totalVoters = new Set(
      options.flatMap((o) => o.voters.map((v) => v.jid))
    ).size;

    return {
      id: job.id,
      leadName: job.lead.fullName,
      leadPhone: job.lead.whatsappNumber,
      sentAt: job.sentAt?.toISOString() ?? null,
      hasVotes: rawResults.some((o) => o.voters.length > 0),
      question: snapshot?.question ?? "Sondage WhatsApp",
      multiSelect: snapshot?.multiSelect ?? false,
      options,
      totalVoters,
      updatedAt: job.pollResultsAt?.toISOString() ?? null,
    };
  });
}
