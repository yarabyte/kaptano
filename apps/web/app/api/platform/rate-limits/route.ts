import { NextResponse } from "next/server";
import type { WasenderRatePlanMode } from "@kaptano/db";
import { WASENDER_RATE_PRESETS } from "@kaptano/shared";
import { requirePlatformAdmin } from "@/lib/auth";
import { loadPlatformRateLimitDashboard } from "@/lib/platform/rate-limit-data";
import { prisma } from "@/lib/prisma";
import { getPlatformWhatsappLimits, presetForMode } from "@/lib/whatsapp/rate-limits";

const VALID_MODES: WasenderRatePlanMode[] = [
  "ACCOUNT_PROTECTION",
  "PAID",
  "TRIAL",
  "CUSTOM",
];

export async function GET() {
  await requirePlatformAdmin();
  const dashboard = await loadPlatformRateLimitDashboard();
  return NextResponse.json(dashboard);
}

export async function PATCH(request: Request) {
  await requirePlatformAdmin();

  const body = (await request.json()) as {
    wasenderPlanMode?: WasenderRatePlanMode;
    minIntervalMs?: number;
    maxSendsPerMinute?: number;
    globalDailySendCap?: number;
    tenantDailySendCap?: number;
    maxConcurrentSends?: number;
    enforcementEnabled?: boolean;
  };

  const current = await getPlatformWhatsappLimits();
  const mode = body.wasenderPlanMode ?? current.wasenderPlanMode;

  if (body.wasenderPlanMode && !VALID_MODES.includes(body.wasenderPlanMode)) {
    return NextResponse.json({ error: "Mode de limitation invalide" }, { status: 400 });
  }

  const preset = presetForMode(mode);
  const data = {
    wasenderPlanMode: mode,
    minIntervalMs:
      body.minIntervalMs ??
      (preset ? preset.minIntervalMs : current.minIntervalMs),
    maxSendsPerMinute:
      body.maxSendsPerMinute ??
      (preset ? preset.maxSendsPerMinute : current.maxSendsPerMinute),
    globalDailySendCap:
      body.globalDailySendCap ??
      (preset ? preset.globalDailySendCap : current.globalDailySendCap),
    tenantDailySendCap:
      body.tenantDailySendCap ??
      (preset ? preset.tenantDailySendCap : current.tenantDailySendCap),
    maxConcurrentSends: body.maxConcurrentSends ?? current.maxConcurrentSends,
    enforcementEnabled: body.enforcementEnabled ?? current.enforcementEnabled,
  };

  if (data.minIntervalMs < 0 || data.maxSendsPerMinute < 1) {
    return NextResponse.json({ error: "Intervalles invalides" }, { status: 400 });
  }

  if (data.globalDailySendCap < 1 || data.tenantDailySendCap < 1) {
    return NextResponse.json({ error: "Plafonds quotidiens invalides" }, { status: 400 });
  }

  if (data.maxConcurrentSends < 1 || data.maxConcurrentSends > 5) {
    return NextResponse.json(
      { error: "Concurrence max : entre 1 et 5 (recommandation Meta/WhatsApp)" },
      { status: 400 }
    );
  }

  const limits = await prisma.platformWhatsappLimits.update({
    where: { id: "default" },
    data,
  });

  return NextResponse.json({
    limits,
    presets: WASENDER_RATE_PRESETS,
  });
}
