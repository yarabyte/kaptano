import { MAX_MESSAGE_JOBS_PER_LEAD_PER_DAY } from "@kaptano/shared";
import { prisma } from "./client";

export function startOfLocalDay(d = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function countLeadMessageJobsToday(leadId: string): Promise<number> {
  return prisma.messageJob.count({
    where: {
      leadId,
      createdAt: { gte: startOfLocalDay() },
    },
  });
}

export async function getLeadIdsAtDailyMessageCap(
  tenantId: string,
  since = startOfLocalDay()
): Promise<string[]> {
  const groups = await prisma.messageJob.groupBy({
    by: ["leadId"],
    where: {
      tenantId,
      createdAt: { gte: since },
    },
    _count: { _all: true },
    having: {
      leadId: {
        _count: {
          gte: MAX_MESSAGE_JOBS_PER_LEAD_PER_DAY,
        },
      },
    },
  });

  return groups.map((group) => group.leadId);
}

export async function assertLeadDailyMessageQuota(leadId: string): Promise<void> {
  const count = await countLeadMessageJobsToday(leadId);
  if (count >= MAX_MESSAGE_JOBS_PER_LEAD_PER_DAY) {
    throw new Error(
      `Plafond de ${MAX_MESSAGE_JOBS_PER_LEAD_PER_DAY} messages par lead et par jour atteint`
    );
  }
}
