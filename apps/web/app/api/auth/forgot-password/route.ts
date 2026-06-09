import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAppUrl, isSmtpConfigured } from "@/lib/mail/client";
import { sendMail } from "@/lib/mail/send";
import { passwordResetEmail } from "@/lib/mail/templates";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Email invalide" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Envoi d'email non configuré sur le serveur" },
      { status: 503 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { fullName: true },
  });

  if (dbUser) {
    try {
      const supabase = createSupabaseServiceClient();
      const redirectTo = `${getAppUrl()}/reset-password`;

      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (!error && data.properties?.action_link) {
        const mail = passwordResetEmail({
          fullName: dbUser.fullName,
          resetUrl: data.properties.action_link,
        });

        await sendMail({
          to: email,
          ...mail,
        });
      }
    } catch {
      // Ne pas révéler si l'envoi a échoué
    }
  }

  return NextResponse.json({
    success: true,
    message:
      "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
  });
}
