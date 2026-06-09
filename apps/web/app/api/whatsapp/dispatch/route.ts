import { NextResponse } from "next/server";
import { manualDispatchFiltersSchema } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body = manualDispatchFiltersSchema.parse(await request.json().catch(() => ({})));

  const res = await fetch(`${WORKER_URL}/whatsapp/dispatch/${ctx.tenantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: unknown = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur d'envoi" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
