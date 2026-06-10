import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteAgentSchema } from "@kaptano/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSmtpConfigured } from "@/lib/mail/client";
import { sendMail } from "@/lib/mail/send";
import { teamInviteEmail } from "@/lib/mail/templates";
import { normalizePhoneToE164 } from "@/lib/phone";
import { resolveWhatsappCredentials } from "@/lib/whatsapp/resolve-session";
import { sendWhatsappText } from "@/lib/whatsapp/send-text";
import { teamInviteWhatsappMessage } from "@/lib/whatsapp/team-invite-message";

const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length]).join("");
}

export async function GET() {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const [users, tenant, whatsappCreds] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
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
    resolveWhatsappCredentials(ctx.tenantId),
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
      whatsappConnected:
        Boolean(whatsappCreds.apiKeyEncrypted) && whatsappCreds.status === "CONNECTED",
      smtpConfigured: isSmtpConfigured(),
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

  const { email, fullName, channel } = parsed.data;
  let phoneE164: string | null = null;

  if (channel === "email" && !isSmtpConfigured()) {
    return NextResponse.json(
      { error: "SMTP non configuré — impossible d'envoyer l'invitation par email" },
      { status: 400 }
    );
  }

  if (channel === "whatsapp") {
    const credentials = await resolveWhatsappCredentials(ctx.tenantId);
    if (!credentials.apiKeyEncrypted || credentials.status !== "CONNECTED") {
      return NextResponse.json(
        {
          error: credentials.isShared
            ? "Numéro WhatsApp partagé non disponible — contactez le support"
            : "Session WhatsApp non connectée — connectez votre numéro avant d'inviter par WhatsApp",
        },
        { status: 400 }
      );
    }

    phoneE164 = normalizePhoneToE164(parsed.data.phone ?? "");
    if (!phoneE164) {
      return NextResponse.json({ error: "Numéro WhatsApp invalide" }, { status: 400 });
    }
  }

  const tempPassword = generateTempPassword();

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
        phoneNumber: phoneE164,
        role: "AGENT",
        tenantId: ctx.tenantId,
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: { name: true },
    }),
  ]);

  let inviteSent = false;

  if (channel === "email") {
    try {
      const mail = teamInviteEmail({
        fullName,
        companyName: tenant.name,
        email,
        tempPassword,
      });
      await sendMail({ to: email, ...mail });
      inviteSent = true;
    } catch {
      inviteSent = false;
    }
  } else if (channel === "whatsapp" && phoneE164) {
    try {
      const text = teamInviteWhatsappMessage({
        fullName,
        companyName: tenant.name,
        email,
        tempPassword,
      });
      await sendWhatsappText(ctx.tenantId, phoneE164, text);
      inviteSent = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec envoi WhatsApp";
      return NextResponse.json(
        { user, channel, inviteSent: false, error: message },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ user, channel, inviteSent });
}
