import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getDatabaseHost(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getDatabaseHint(host: string | null, message: string): string | undefined {
  if (host?.startsWith("db.") && host.endsWith(".supabase.co")) {
    return "DATABASE_URL utilise db.*.supabase.co — incompatible avec Vercel. Utilisez aws-1-eu-central-1.pooler.supabase.com:6543 avec ?pgbouncer=true";
  }
  if (message.includes("Can't reach database server")) {
    return "Vérifiez DATABASE_URL sur Vercel : pooler port 6543, connection_limit=1, mot de passe URL-encodé (%40 pour @)";
  }
  return undefined;
}

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);
  const databaseHost = getDatabaseHost();

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
      databaseHost,
      userCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const hint = getDatabaseHint(databaseHost, message);

    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: true,
        hasDirectUrl,
        databaseHost,
        error: message,
        hint,
      },
      { status: 503 }
    );
  }
}
