import { NextResponse } from "next/server";
import { manualDispatchFiltersSchema } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { runInBackground } from "@/lib/background-task";
import {
  processManualDispatchBatch,
  startManualDispatch,
} from "@/lib/whatsapp/run-manual-dispatch";

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body = manualDispatchFiltersSchema.parse(await request.json().catch(() => ({})));

  try {
    const { batchId, totalCount, messageJobIds } = await startManualDispatch(
      ctx.tenantId,
      body
    );

    const tenantId = ctx.tenantId;
    runInBackground(async () => {
      await processManualDispatchBatch(tenantId, batchId, messageJobIds);
    });

    return NextResponse.json({ batchId, totalCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'envoi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
