import { NextResponse } from "next/server";

export const maxDuration = 60;
import { manualDispatchFiltersSchema } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { runManualDispatch } from "@/lib/whatsapp/run-manual-dispatch";

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body = manualDispatchFiltersSchema.parse(await request.json().catch(() => ({})));

  try {
    const result = await runManualDispatch(ctx.tenantId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'envoi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
