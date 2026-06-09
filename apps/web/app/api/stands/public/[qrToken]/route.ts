import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { qrToken: string } }
) {
  const stand = await prisma.stand.findUnique({
    where: { qrToken: params.qrToken, active: true },
    select: {
      id: true,
      name: true,
      tenant: { select: { name: true } },
    },
  });

  if (!stand) {
    return NextResponse.json({ error: "Stand introuvable" }, { status: 404 });
  }

  return NextResponse.json({ stand });
}
