import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  updateTenantSettingsSchema,
  validateWhatsappMessageSettings,
  getDefaultMessageConfig,
  type WhatsappMessageType,
} from "@kaptano/shared";
import type { Prisma } from "@kaptano/db";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResolvedWhatsappSession } from "@/lib/whatsapp/resolve-session";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";

export async function GET() {
  const ctx = await requireTenantContext();
  const [resolved, tenant] = await Promise.all([
    getResolvedWhatsappSession(ctx.tenantId),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        whatsappMessageType: true,
        whatsappMessageConfig: true,
        catalogs: {
          where: { isDefault: true },
          take: 1,
          select: { id: true, name: true, createdAt: true },
        },
      },
    }),
  ]);

  const messageType = (tenant?.whatsappMessageType ?? "TEXT") as WhatsappMessageType;

  return NextResponse.json({
    session: {
      status: resolved.status,
      phoneNumber: resolved.phoneNumber,
    },
    whatsappMode: resolved.whatsappMode,
    effectivePlanTier: resolved.effectivePlanTier,
    defaultCatalog: tenant?.catalogs[0] ?? null,
    settings: {
      messageType,
      messageConfig:
        tenant?.whatsappMessageConfig ?? getDefaultMessageConfig(messageType),
    },
  });
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId },
  });

  const tier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  if (usesSharedWhatsapp(tier)) {
    return NextResponse.json(
      {
        error:
          "Votre plan utilise le numéro WhatsApp partagé Kaptano. Passez au plan Growth pour connecter votre propre numéro.",
      },
      { status: 403 }
    );
  }

  const body = (await request.json()) as { phoneNumber?: string };

  if (!body.phoneNumber?.trim()) {
    return NextResponse.json(
      { error: "Numéro de téléphone requis (format international, ex. +237670000000)" },
      { status: 400 }
    );
  }

  const res = await fetch(`${WORKER_URL}/whatsapp/sessions/${ctx.tenantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: body.phoneNumber.trim() }),
  });

  const data: unknown = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur worker" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const ctx = await requireTenantContext();

  let body;
  try {
    body = updateTenantSettingsSchema.parse(await request.json());
    validateWhatsappMessageSettings({
      messageType: body.messageType,
      messageConfig: body.messageConfig,
    });
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.errors[0]?.message ?? "Données invalides"
        : err instanceof Error
          ? err.message
          : "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      whatsappMessageType: body.messageType,
      whatsappMessageConfig: body.messageConfig as Prisma.InputJsonValue | undefined,
    },
    select: {
      whatsappMessageType: true,
      whatsappMessageConfig: true,
    },
  });

  return NextResponse.json({
    settings: {
      messageType: tenant.whatsappMessageType,
      messageConfig: tenant.whatsappMessageConfig,
    },
  });
}
