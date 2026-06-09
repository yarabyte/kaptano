import { NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (user.id === ctx.userId) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  if (user.role !== "AGENT") {
    return NextResponse.json(
      { error: "Seuls les agents peuvent être supprimés" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: user.id } });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(user.supabaseUserId);
  if (error) {
    console.error("[team] Supabase delete failed:", error.message);
  }

  return NextResponse.json({ success: true });
}

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
    return NextResponse.json(
      { error: "Impossible de modifier votre propre compte" },
      { status: 400 }
    );
  }

  if (user.role !== "AGENT") {
    return NextResponse.json(
      { error: "Seuls les agents peuvent être modifiés" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { active: body.active ?? user.active },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
