import { NextResponse } from "next/server";
import { CATALOG_BUCKET } from "@kaptano/shared";
import { requireTenantContext } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formats acceptés : JPEG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (max 5 Mo)" },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${ctx.tenantId}/whatsapp-media/${Date.now()}-${safeName}`;
  const supabase = createSupabaseServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CATALOG_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(CATALOG_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "URL signée indisponible" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    fileName: file.name,
    storagePath,
  });
}
