import { Prisma } from "@prisma/client";
import { prisma } from "./client";

export type MessageKey = {
  id?: string;
  remoteJid?: string;
  fromMe?: boolean;
};

export type PollResultEntry = {
  name: string;
  voters: string[];
};

export type PollResultsData = {
  key?: MessageKey;
  pollResult?: PollResultEntry[];
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

function mapVoters(
  voters: string[],
  leadByPhone: Map<string, string>
) {
  return voters.map((jid) => {
    const phone = jidToPhone(jid);
    const digits = phone?.replace(/\D/g, "") ?? "";
    return {
      jid,
      phone,
      name: (digits && leadByPhone.get(digits)) || phone || jid,
    };
  });
}

function buildPollOptions(
  snapshot: PollSnapshot | null,
  rawResults: PollResultEntry[],
  leadByPhone: Map<string, string>
) {
  const resultsByName = new Map(rawResults.map((entry) => [entry.name, entry]));
  const optionNames =
    snapshot?.options?.length
      ? snapshot.options
      : rawResults.map((entry) => entry.name);

  return optionNames.map((name) => {
    const result = resultsByName.get(name);
    const voters = mapVoters(result?.voters ?? [], leadByPhone);
    return {
      name,
      count: voters.length,
      voters,
    };
  });
}

async function findMessageJobForPollKey(key: MessageKey, tenantId?: string) {
  if (key.id) {
    const byId = await prisma.messageJob.findFirst({
      where: {
        wasenderMessageId: key.id,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (byId) return byId;
  }

  if (!key.remoteJid) return null;

  const phone = jidToPhone(key.remoteJid);
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  const candidates = await prisma.messageJob.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      isPoll: true,
      status: { in: ["SENT", "DELIVERED", "READ", "SENDING"] },
    },
    include: { lead: { select: { whatsappNumber: true } } },
    orderBy: { sentAt: "desc" },
    take: 30,
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

/** Webhook poll.results — enregistre les votes. */
export async function handlePollResultsWebhook(
  data: PollResultsData,
  timestamp?: number,
  tenantId?: string
): Promise<void> {
  const key = data.key;
  const messageId = key?.id;
  if (!key || !messageId || !data.pollResult?.length) return;

  const job = await findMessageJobForPollKey(key, tenantId);
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
        OR: [{ isPoll: true }, { pollSnapshot: { not: Prisma.DbNull } }],
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
    const options = buildPollOptions(snapshot, rawResults, leadByPhone);

    const totalVoters = new Set(
      options.flatMap((option) => option.voters.map((voter) => voter.jid))
    ).size;

    return {
      id: job.id,
      leadName: job.lead.fullName,
      leadPhone: job.lead.whatsappNumber,
      sentAt: job.sentAt?.toISOString() ?? null,
      hasVotes: rawResults.some((option) => option.voters.length > 0),
      question: snapshot?.question ?? "Sondage WhatsApp",
      multiSelect: snapshot?.multiSelect ?? false,
      options,
      totalVoters,
      updatedAt: job.pollResultsAt?.toISOString() ?? null,
    };
  });
}
