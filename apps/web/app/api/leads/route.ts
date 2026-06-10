import { NextResponse } from "next/server";
import { createLeadSchema, leadFiltersSchema } from "@kaptano/shared";
import type { Prisma } from "@kaptano/db";
import { prisma } from "@/lib/prisma";
import { upsertLead } from "@/lib/leads/upsert-lead";
import { sendCaptureThankYou } from "@/lib/leads/send-capture-thank-you";
import { QuotaExceededError } from "@/lib/leads/check-quota";
import { getSessionUser, requireTenantContext } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await requireTenantContext();
  const { searchParams } = new URL(request.url);

  const filters = leadFiltersSchema.safeParse({
    standId: searchParams.get("standId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    messageStatus: searchParams.get("messageStatus") ?? undefined,
  });

  const where: Prisma.LeadWhereInput = { tenantId: ctx.tenantId };

  if (filters.success) {
    const f = filters.data;
    if (f.standId) where.standId = f.standId;
    if (f.from || f.to) {
      where.capturedAt = {};
      if (f.from) where.capturedAt.gte = new Date(f.from);
      if (f.to) where.capturedAt.lte = new Date(f.to);
    }
    if (f.search) {
      where.OR = [
        { fullName: { contains: f.search, mode: "insensitive" } },
        { whatsappNumber: { contains: f.search } },
        { company: { contains: f.search, mode: "insensitive" } },
      ];
    }
    if (f.messageStatus === "NONE") {
      where.messageJobs = { none: {} };
    } else if (f.messageStatus) {
      where.messageJobs = { some: { status: f.messageStatus } };
    }
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      stand: { select: { id: true, name: true } },
      messageJobs: {
        select: {
          id: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          catalogClickedAt: true,
        },
      },
    },
    orderBy: { capturedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  let tenantId = input.tenantId;
  let standId = input.standId;

  if (input.qrToken) {
    const stand = await prisma.stand.findUnique({
      where: { qrToken: input.qrToken, active: true },
      include: { tenant: true },
    });

    if (!stand) {
      return NextResponse.json({ error: "Stand introuvable" }, { status: 404 });
    }

    tenantId = stand.tenantId;
    standId = stand.id;
  } else if (input.source === "AGENT") {
    const user = await getSessionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    tenantId = user.tenantId;
    if (input.capturedById && input.capturedById !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    input.capturedById = user.id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant requis" }, { status: 400 });
  }

  try {
    const result = await upsertLead(tenantId, input, standId);

    let whatsappSent = false;
    if (result.isNew && input.optInConsent) {
      const thankYou = await sendCaptureThankYou(tenantId, result.lead.id);
      whatsappSent = thankYou.sent;
    }

    return NextResponse.json({
      success: true,
      data: { ...result.lead, isNew: result.isNew, whatsappSent },
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: err.message, code: "QUOTA_EXCEEDED", quota: err.quota, used: err.used },
        { status: 403 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
