import nodemailer from "nodemailer";

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS ?? "";

  if (pass.includes("%")) {
    try {
      pass = decodeURIComponent(pass);
    } catch {
      // garde la valeur brute
    }
  }

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS requis dans .env)"
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 465);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function getMailFrom(): string {
  const address = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@kaptano.cloud";
  const name = process.env.SMTP_FROM_NAME ?? "Kaptano";
  return `"${name}" <${address}>`;
}
