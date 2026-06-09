import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

export async function suggestAvailableSlug(base: string): Promise<string> {
  const normalized = slugify(base);
  if (!normalized || normalized.length < 2) {
    return normalized;
  }

  if (await isSlugAvailable(normalized)) {
    return normalized;
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${normalized}-${i}`;
    if (await isSlugAvailable(candidate)) {
      return candidate;
    }
  }

  return `${normalized}-${Date.now().toString(36).slice(-4)}`;
}
