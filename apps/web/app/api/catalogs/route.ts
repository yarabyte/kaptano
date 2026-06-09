import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATALOG_BUCKET } from "@kaptano/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await requireTenantContext();
  const catalogs = await prisma.catalog.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ catalogs });
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const isDefault = formData.get("isDefault") === "true";

  if (!file || !name) {
    return NextResponse.json({ error: "Fichier et nom requis" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les PDF sont acceptés" }, { status: 400 });
  }

  const storagePath = `${ctx.tenantId}/${Date.now()}-${file.name}`;
  const supabase = createSupabaseServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CATALOG_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signedData } = await supabase.storage
    .from(CATALOG_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (isDefault) {
    await prisma.catalog.updateMany({
      where: { tenantId: ctx.tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const catalog = await prisma.catalog.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      storagePath,
      publicUrl: signedData?.signedUrl,
      isDefault,
    },
  });

  return NextResponse.json({ catalog });
}
