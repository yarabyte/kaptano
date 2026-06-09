import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:8080";

export async function GET() {
  await requirePlatformAdmin();

  const res = await fetch(`${WORKER_URL}/whatsapp/shared-session`, {
    cache: "no-store",
  });
  const data: unknown = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur worker" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  await requirePlatformAdmin();
  const body = (await request.json()) as { phoneNumber?: string };

  if (!body.phoneNumber?.trim()) {
    return NextResponse.json(
      { error: "Numéro de téléphone requis (format international, ex. +237670000000)" },
      { status: 400 }
    );
  }

  const res = await fetch(`${WORKER_URL}/whatsapp/shared-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: body.phoneNumber.trim() }),
  });

  const data: unknown = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Erreur worker" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
