import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { getTenantSendStats } from "@/lib/whatsapp/dispatch-stats";

export async function GET() {
  const ctx = await requireTenantContext();

  try {
    const stats = await getTenantSendStats(ctx.tenantId);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
