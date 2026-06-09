import { NextResponse } from "next/server";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteAgentSchema } from "@kaptano/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSmtpConfigured } from "@/lib/mail/client";
import { sendMail } from "@/lib/mail/send";
import { teamInviteEmail } from "@/lib/mail/templates";

export async function GET() {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const [users, tenant] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: {
        name: true,
        planTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    }),
  ]);

  const effectiveTier = effectivePlanTier(
    tenant.planTier,
    tenant.subscriptionStatus,
    tenant.subscriptionExpiresAt
  );

  const agents = users.filter((u) => u.role === "AGENT");

  return NextResponse.json({
    users,
    meta: {
      tenantName: tenant.name,
      effectivePlanTier: effectiveTier,
      usesSharedWhatsapp: usesSharedWhatsapp(effectiveTier),
      agentCount: agents.length,
      activeAgentCount: agents.filter((u) => u.active).length,
    },
  });
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body: unknown = await request.json();
  const parsed = inviteAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { email, fullName } = parsed.data;
  const tempPassword = crypto.randomUUID();

  const supabase = createSupabaseServiceClient();
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message }, { status: 400 });
  }

  const [user, tenant] = await Promise.all([
    prisma.user.create({
      data: {
        supabaseUserId: authData.user.id,
        email,
        fullName,
        role: "AGENT",
        tenantId: ctx.tenantId,
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: { name: true },
    }),
  ]);

  let emailSent = false;
  if (isSmtpConfigured()) {
    try {
      const mail = teamInviteEmail({
        fullName,
        companyName: tenant.name,
        email,
        tempPassword,
      });
      await sendMail({ to: email, ...mail });
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json({ user, emailSent });
}
