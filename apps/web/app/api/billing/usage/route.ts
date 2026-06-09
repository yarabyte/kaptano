import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";
import { getTenantUsageSummary } from "@/lib/leads/check-quota";

export async function GET() {
  const ctx = await requireTenantContext();
  const summary = await getTenantUsageSummary(ctx.tenantId);
  return NextResponse.json({ usage: summary });
}
