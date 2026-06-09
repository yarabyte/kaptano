import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";

export async function GET() {
  const ctx = await requireTenantContext();

  const res = await fetch(`${WORKER_URL}/whatsapp/stats/${ctx.tenantId}`);
  const data: unknown = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur worker" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
