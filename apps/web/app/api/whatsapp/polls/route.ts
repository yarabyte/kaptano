import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { getTenantPollResults } from "@/lib/whatsapp/poll-results";

export async function GET() {
  const ctx = await requireTenantContext();

  try {
    const polls = await getTenantPollResults(ctx.tenantId);
    return NextResponse.json({ polls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
