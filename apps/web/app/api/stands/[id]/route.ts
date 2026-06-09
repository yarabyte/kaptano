import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStandSchema } from "@kaptano/shared";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  const body: unknown = await request.json();
  const parsed = updateStandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const existing = await prisma.stand.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Stand introuvable" }, { status: 404 });
  }

  const stand = await prisma.stand.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      active: parsed.data.active,
      eventId: parsed.data.eventId === undefined ? undefined : parsed.data.eventId || null,
      catalogId: parsed.data.catalogId === undefined ? undefined : parsed.data.catalogId || null,
    },
  });

  return NextResponse.json({ stand });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();

  const existing = await prisma.stand.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Stand introuvable" }, { status: 404 });
  }

  await prisma.stand.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
