import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);

  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: false,
        hasDirectUrl,
        error: "DATABASE_URL manquante sur Vercel",
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();

    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: true,
      hasDirectUrl,
      userCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: true,
        hasDirectUrl,
        error: message,
      },
      { status: 503 }
    );
  }
}
