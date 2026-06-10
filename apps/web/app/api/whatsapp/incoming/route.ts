import { NextResponse } from "next/server";
import { getTenantIncomingMessages } from "@kaptano/db";
import { requireTenantContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireTenantContext();
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "50");

  const messages = await getTenantIncomingMessages(ctx.tenantId, {
    leadId,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      ...message,
      receivedAt: message.receivedAt.toISOString(),
    })),
  });
}
