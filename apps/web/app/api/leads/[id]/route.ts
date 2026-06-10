import { NextResponse } from "next/server";
import { updateLeadSchema } from "@kaptano/shared";
import type { Prisma } from "@kaptano/db";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneToE164 } from "@/lib/phone";

const leadInclude = {
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
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  const body: unknown = await request.json();
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }

  const input = parsed.data;
  const data: Prisma.LeadUpdateInput = {};

  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.email !== undefined) data.email = input.email || null;
  if (input.company !== undefined) data.company = input.company || null;
  if (input.interest !== undefined) data.interest = input.interest || null;

  if (input.standId !== undefined) {
    if (input.standId) {
      const stand = await prisma.stand.findFirst({
        where: { id: input.standId, tenantId: ctx.tenantId },
      });
      if (!stand) {
        return NextResponse.json({ error: "Stand introuvable" }, { status: 400 });
      }
      data.stand = { connect: { id: input.standId } };
    } else {
      data.stand = { disconnect: true };
    }
  }

  if (input.whatsappNumber !== undefined) {
    const normalized = normalizePhoneToE164(input.whatsappNumber);
    if (!normalized) {
      return NextResponse.json({ error: "Numéro WhatsApp invalide" }, { status: 400 });
    }

    if (normalized !== lead.whatsappNumber) {
      const conflict = await prisma.lead.findUnique({
        where: {
          tenantId_whatsappNumber: { tenantId: ctx.tenantId, whatsappNumber: normalized },
        },
      });
      if (conflict && conflict.id !== lead.id) {
        return NextResponse.json(
          { error: "Un lead avec ce numéro WhatsApp existe déjà" },
          { status: 400 }
        );
      }
    }

    data.whatsappNumber = normalized;
  }

  if (input.optInConsent !== undefined) {
    data.optInConsent = input.optInConsent;
    if (input.optInConsent && !lead.optInConsent) {
      data.consentAt = new Date();
    }
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data,
    include: leadInclude,
  });

  return NextResponse.json({ lead: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }

  await prisma.lead.delete({ where: { id: lead.id } });

  return NextResponse.json({ success: true });
}
