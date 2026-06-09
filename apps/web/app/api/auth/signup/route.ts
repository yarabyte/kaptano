import { NextResponse } from "next/server";
import { signupSchema } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSmtpConfigured } from "@/lib/mail/client";
import { sendMail } from "@/lib/mail/send";
import { welcomeEmail } from "@/lib/mail/templates";

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }

  const { email, password, fullName, companyName, companySlug } = parsed.data;

  const existingSlug = await prisma.tenant.findUnique({
    where: { slug: companySlug },
  });
  if (existingSlug) {
    return NextResponse.json(
      { error: "Cet identifiant est déjà utilisé" },
      { status: 409 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Erreur Supabase Auth" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: companyName, slug: companySlug },
      });

      await tx.user.create({
        data: {
          supabaseUserId: authData.user!.id,
          email,
          fullName,
          role: "EXHIBITOR_ADMIN",
          tenantId: tenant.id,
        },
      });
    });
  } catch {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }

  let emailSent = false;
  if (isSmtpConfigured()) {
    try {
      const mail = welcomeEmail({ fullName, companyName, email });
      await sendMail({ to: email, ...mail });
      emailSent = true;
    } catch (err) {
      console.error("[signup] Échec envoi email de bienvenue:", err);
    }
  } else {
    console.warn("[signup] SMTP non configuré — email de bienvenue non envoyé");
  }

  return NextResponse.json({ success: true, emailSent });
}
