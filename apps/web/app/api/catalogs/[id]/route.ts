import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCatalogSchema } from "@kaptano/shared";
import { CATALOG_BUCKET } from "@kaptano/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  const body: unknown = await request.json();
  const parsed = updateCatalogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const existing = await prisma.catalog.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Catalogue introuvable" }, { status: 404 });
  }

  if (parsed.data.isDefault) {
    await prisma.catalog.updateMany({
      where: { tenantId: ctx.tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const catalog = await prisma.catalog.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ catalog });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();

  const existing = await prisma.catalog.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Catalogue introuvable" }, { status: 404 });
  }

  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(CATALOG_BUCKET).remove([existing.storagePath]);

  await prisma.catalog.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
