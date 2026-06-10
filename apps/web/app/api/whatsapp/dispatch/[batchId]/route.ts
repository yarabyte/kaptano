import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { getBatchProgress } from "@/lib/whatsapp/dispatch-stats";

export async function GET(
  _request: Request,
  { params }: { params: { batchId: string } }
) {
  const ctx = await requireTenantContext();

  try {
    const progress = await getBatchProgress(ctx.tenantId, params.batchId);
    if (!progress) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    return NextResponse.json(progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
