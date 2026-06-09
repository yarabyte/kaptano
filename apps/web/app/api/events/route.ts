import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@kaptano/shared";

export async function GET() {
  const ctx = await requireTenantContext();
  const events = await prisma.event.findMany({
    where: { tenantId: ctx.tenantId },
    include: { _count: { select: { stands: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  const body: unknown = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      location: parsed.data.location,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  return NextResponse.json({ event });
}
