import { NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body = (await request.json()) as { active?: boolean };

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (user.id === ctx.userId) {
    return NextResponse.json({ error: "Impossible de modifier votre propre compte" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { active: body.active ?? user.active },
  });

  return NextResponse.json({ user: updated });
}
