import type { WasenderRatePlanMode } from "@kaptano/db";
import {
  DAILY_SEND_CAP,
  WASENDER_RATE_PRESETS,
} from "@kaptano/shared";
import { prisma } from "@/lib/prisma";

const LIMITS_ID = "default";

const SENT_STATUSES = ["SENT", "DELIVERED", "READ"] as const;

export type RateLimitSnapshot = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

export class WhatsappRateLimitError extends Error {
  retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "WhatsappRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function startOfDay(d = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitSnapshot | null {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");

  if (limit == null || remaining == null || reset == null) {
    return null;
  }

  const resetSeconds = Number.parseInt(reset, 10);
  if (Number.isNaN(resetSeconds)) {
    return null;
  }

  return {
    limit: Number.parseInt(limit, 10),
    remaining: Number.parseInt(remaining, 10),
    resetAt: new Date(Date.now() + resetSeconds * 1000),
  };
}

export function presetForMode(mode: WasenderRatePlanMode) {
  switch (mode) {
    case "PAID":
      return WASENDER_RATE_PRESETS.PAID;
    case "TRIAL":
      return WASENDER_RATE_PRESETS.TRIAL;
    case "ACCOUNT_PROTECTION":
      return WASENDER_RATE_PRESETS.ACCOUNT_PROTECTION;
    default:
      return null;
  }
}

export async function getPlatformWhatsappLimits() {
  return prisma.platformWhatsappLimits.upsert({
    where: { id: LIMITS_ID },
    create: { id: LIMITS_ID },
    update: {},
  });
}

export async function getTenantDailySendCap(): Promise<number> {
  const limits = await getPlatformWhatsappLimits();
  return limits.tenantDailySendCap;
}

export async function recordRateLimitSnapshot(snapshot: RateLimitSnapshot): Promise<void> {
  await prisma.platformWhatsappLimits.upsert({
    where: { id: LIMITS_ID },
    create: {
      id: LIMITS_ID,
      lastRateLimitLimit: snapshot.limit,
      lastRateLimitRemaining: snapshot.remaining,
      lastRateLimitResetAt: snapshot.resetAt,
    },
    update: {
      lastRateLimitLimit: snapshot.limit,
      lastRateLimitRemaining: snapshot.remaining,
      lastRateLimitResetAt: snapshot.resetAt,
    },
  });
}

export async function recordWhatsappSend(isShared: boolean): Promise<void> {
  if (!isShared) return;

  await prisma.platformWhatsappLimits.update({
    where: { id: LIMITS_ID },
    data: { lastSharedSendAt: new Date() },
  });
}

export async function waitForWhatsappSendSlot(isShared: boolean): Promise<void> {
  if (!isShared) return;

  const limits = await getPlatformWhatsappLimits();
  if (!limits.enforcementEnabled || !limits.lastSharedSendAt) return;

  const elapsed = Date.now() - limits.lastSharedSendAt.getTime();
  const waitMs = limits.minIntervalMs - elapsed;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

export async function assertWhatsappSendAllowed(options: {
  tenantId: string;
  isShared: boolean;
}): Promise<void> {
  const limits = await getPlatformWhatsappLimits();
  const tenantCap = limits.tenantDailySendCap || DAILY_SEND_CAP;

  const todayTenant = await prisma.messageJob.count({
    where: {
      tenantId: options.tenantId,
      status: { in: [...SENT_STATUSES] },
      sentAt: { gte: startOfDay() },
    },
  });

  if (todayTenant >= tenantCap) {
    throw new WhatsappRateLimitError("Plafond quotidien exposant atteint");
  }

  if (!limits.enforcementEnabled) return;

  const sendingNow = await prisma.messageJob.count({
    where: { status: "SENDING" },
  });

  if (sendingNow >= limits.maxConcurrentSends) {
    throw new WhatsappRateLimitError(
      "Limite de concurrence atteinte — réessayez dans quelques secondes",
      2_000
    );
  }

  if (!options.isShared) return;

  const todayGlobal = await prisma.messageJob.count({
    where: {
      status: { in: [...SENT_STATUSES] },
      sentAt: { gte: startOfDay() },
    },
  });

  if (todayGlobal >= limits.globalDailySendCap) {
    throw new WhatsappRateLimitError("Plafond quotidien global atteint");
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const lastMinuteSent = await prisma.messageJob.count({
    where: {
      status: { in: [...SENT_STATUSES] },
      sentAt: { gte: oneMinuteAgo },
    },
  });

  if (lastMinuteSent >= limits.maxSendsPerMinute) {
    throw new WhatsappRateLimitError(
      "Limite Wasender par minute atteinte",
      60_000
    );
  }
}

export function isRateLimitErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("rate-limit") ||
    lower.includes("plafond quotidien") ||
    lower.includes("limite wasender") ||
    lower.includes("limite de concurrence") ||
    lower.includes("retry_after") ||
    lower.includes("every 1 minute") ||
    lower.includes("every 5 second")
  );
}
