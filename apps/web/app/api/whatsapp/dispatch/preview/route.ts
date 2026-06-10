import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import {
  getLeadWhatsAppSummary,
  getTenantSendStats,
} from "@/lib/whatsapp/dispatch-stats";

export async function GET(request: Request) {
  const ctx = await requireTenantContext();
  const { searchParams } = new URL(request.url);

  const standId = searchParams.get("standId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const filters = { standId, from, to };

  try {
    const [summary, stats] = await Promise.all([
      getLeadWhatsAppSummary(ctx.tenantId, filters),
      getTenantSendStats(ctx.tenantId),
    ]);

    return NextResponse.json({
      eligible: summary.eligible,
      totalWithOptIn: summary.totalWithOptIn,
      alreadyContacted: summary.alreadyContacted,
      remainingToday: stats.remainingToday,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
