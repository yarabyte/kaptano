import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER;
let pass = process.env.SMTP_PASS;
const to = process.env.SMTP_TEST_TO ?? user;
const from = process.env.SMTP_FROM ?? user;
const fromName = process.env.SMTP_FROM_NAME ?? "Kaptano";

if (!host || !user || !pass) {
  console.error("❌ SMTP non configuré dans .env");
  process.exit(1);
}

// Décode si le mot de passe a été saisi en URL-encode (%40 → @)
if (pass.includes("%")) {
  try {
    pass = decodeURIComponent(pass);
  } catch {
    // garde la valeur brute
  }
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

console.log(`Connexion SMTP ${host}:${port}…`);
console.log(`Envoi test → ${to}`);

try {
  await transport.verify();
  console.log("✓ Connexion SMTP OK");

  const info = await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: "Test Kaptano — envoi SMTP",
    text: "Ceci est un email de test depuis Kaptano. Si vous le recevez, la configuration SMTP fonctionne.",
    html: `<p>Ceci est un <strong>email de test</strong> depuis Kaptano.</p><p>Si vous le recevez, la configuration SMTP fonctionne.</p>`,
  });

  console.log("✓ Email envoyé —", info.messageId);
} catch (err) {
  console.error("❌ Échec:", err instanceof Error ? err.message : err);
  process.exit(1);
}
