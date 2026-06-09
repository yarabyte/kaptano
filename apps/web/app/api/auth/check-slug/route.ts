import { NextResponse } from "next/server";
import { isSlugAvailable, suggestAvailableSlug } from "@/lib/auth/slug";
import { slugify } from "@/lib/utils";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const slug = slugify(raw);

  if (slug.length < 2) {
    return NextResponse.json(
      { available: false, valid: false, error: "Identifiant trop court (2 caractères minimum)" },
      { status: 400 }
    );
  }

  if (slug.length > 60 || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        error: "Identifiant invalide (lettres minuscules, chiffres et tirets uniquement)",
      },
      { status: 400 }
    );
  }

  const available = await isSlugAvailable(slug);

  if (available) {
    return NextResponse.json({ available: true, valid: true, slug });
  }

  const suggestion = await suggestAvailableSlug(slug);

  return NextResponse.json({
    available: false,
    valid: true,
    slug,
    suggestion,
  });
}
