import nodemailer from "nodemailer";
import { welcomeEmail } from "../lib/mail/templates";
import { getMailFrom } from "../lib/mail/client";

const to = process.env.SMTP_TEST_TO ?? "contact@yarabyte.com";

let pass = process.env.SMTP_PASS ?? "";
if (pass.includes("%")) {
  try {
    pass = decodeURIComponent(pass);
  } catch {
    // garde la valeur brute
  }
}

const host = process.env.SMTP_HOST;
const user = process.env.SMTP_USER;
const port = Number(process.env.SMTP_PORT ?? 465);

if (!host || !user || !pass) {
  console.error("❌ SMTP non configuré");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

const mail = welcomeEmail({
  fullName: "Henri-Mill FETCHOUANG",
  companyName: "Yarabyte Sarl",
  email: to,
});

async function main() {
  console.log(`Envoi email de bienvenue → ${to}`);

  const info = await transport.sendMail({
    from: getMailFrom(),
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  console.log("✓ Envoyé —", info.messageId);
}

main().catch((err) => {
  console.error("❌ Échec:", err instanceof Error ? err.message : err);
  process.exit(1);
});
