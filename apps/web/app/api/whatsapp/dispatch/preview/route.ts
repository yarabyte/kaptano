import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";

export async function GET(request: Request) {
  const ctx = await requireTenantContext();
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = `${WORKER_URL}/whatsapp/dispatch/${ctx.tenantId}/preview${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  const data: unknown = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur worker" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
