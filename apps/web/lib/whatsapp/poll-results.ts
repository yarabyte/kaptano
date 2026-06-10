import type { Prisma } from "@kaptano/db";
import { prisma } from "@/lib/prisma";

export type PollResultOption = {
  name: string;
  voters: string[];
};

export type PollSnapshot = {
  question: string;
  options: string[];
  multiSelect?: boolean;
};

export function jidToPhone(jid: string): string | null {
  const match = jid.match(/^(\d+)@/);
  if (!match?.[1]) return null;
  return `+${match[1]}`;
}

export async function handlePollResultsWebhook(
  data: {
    key?: { id?: string };
    pollResult?: PollResultOption[];
  },
  timestamp?: number
): Promise<void> {
  const messageId = data.key?.id;
  if (!messageId || !data.pollResult) return;

  const job = await prisma.messageJob.findFirst({
    where: { wasenderMessageId: messageId },
  });

  if (!job) return;

  await prisma.messageJob.update({
    where: { id: job.id },
    data: {
      isPoll: true,
      pollResults: data.pollResult as Prisma.InputJsonValue,
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
    const rawResults = (job.pollResults as PollResultOption[] | null) ?? [];

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
