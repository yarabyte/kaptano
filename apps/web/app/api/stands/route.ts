import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertStandQuota, getStandQuotaSummary, StandQuotaExceededError } from "@/lib/leads/check-quota";
import { createStandSchema } from "@kaptano/shared";

export async function GET() {
  const ctx = await requireTenantContext();
  const [stands, standQuota] = await Promise.all([
    prisma.stand.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        event: { select: { name: true } },
        catalog: { select: { name: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getStandQuotaSummary(ctx.tenantId),
  ]);
  return NextResponse.json({ stands, standQuota });
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  const body: unknown = await request.json();
  const parsed = createStandSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    await assertStandQuota(ctx.tenantId);
  } catch (err) {
    if (err instanceof StandQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const stand = await prisma.stand.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      eventId: parsed.data.eventId,
      catalogId: parsed.data.catalogId,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ stand });
}
