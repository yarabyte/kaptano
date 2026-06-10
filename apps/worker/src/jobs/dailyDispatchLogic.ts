import { getLeadIdsAtDailyMessageCap } from "@kaptano/db";
import { prisma } from "../lib/prisma";
import { enqueueSendJob, randomJitter } from "../queues/sendQueue";
import { resolveWhatsappCredentials } from "../whatsapp/resolveSession";
import { logger } from "../lib/logger";

export async function runDailyDispatch(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
  });

  for (const tenant of tenants) {
    const credentials = await resolveWhatsappCredentials(tenant.id);
    if (credentials.status !== "CONNECTED") continue;

    if (!isWithinSendWindow(tenant.dailySendTime, tenant.timezone)) {
      continue;
    }

    const startOfDay = getStartOfDayInTimezone(tenant.timezone);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const atCap = await getLeadIdsAtDailyMessageCap(tenant.id, startOfDay);

    const leads = await prisma.lead.findMany({
      where: {
        tenantId: tenant.id,
        optInConsent: true,
        capturedAt: { gte: startOfDay, lt: endOfDay },
        ...(atCap.length > 0 ? { id: { notIn: atCap } } : {}),
      },
      orderBy: { capturedAt: "asc" },
    });

    if (leads.length === 0) continue;

    logger.info(
      { tenantId: tenant.id, count: leads.length },
      "Dispatching leads"
    );

    let cumulativeDelay = 0;

    for (const lead of leads) {
      cumulativeDelay += randomJitter();
      const scheduledFor = new Date(Date.now() + cumulativeDelay);

      const messageJob = await prisma.messageJob.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          status: "QUEUED",
          scheduledFor,
        },
      });

      await enqueueSendJob(
        { messageJobId: messageJob.id, tenantId: tenant.id },
        cumulativeDelay
      );
    }
  }
}

function isWithinSendWindow(dailySendTime: string, timezone: string): boolean {
  const now = getLocalTimeParts(timezone);
  const [targetHour, targetMinute] = dailySendTime.split(":").map(Number);

  if (targetHour === undefined || targetMinute === undefined) return false;

  const currentSlot = Math.floor(now.hour * 4 + now.minute / 15);
  const targetSlot = Math.floor(targetHour * 4 + targetMinute / 15);

  return currentSlot === targetSlot;
}

function getLocalTimeParts(timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}

function getStartOfDayInTimezone(timezone: string): Date {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${localDate}T00:00:00`);
}
