import { getAppUrl } from "./client";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoUrl(): string {
  return `${getAppUrl()}/logo.png`;
}

function layout(title: string, body: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td align="center" style="padding:36px 32px 28px;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);border-bottom:1px solid #e2e8f0;">
              <img src="${logoUrl()}" alt="Kaptano" width="64" height="64" style="display:block;margin:0 auto 14px;border-radius:16px;" />
              <p style="margin:0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Kaptano</p>
              <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Digitalise la capture sur stand</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 36px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Kaptano
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${appUrl}" style="color:#2563eb;text-decoration:none;font-weight:500;">kaptano.cloud</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 16px;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;box-shadow:0 2px 8px rgba(37,99,235,0.25);">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
  const items = rows
    .map(
      (row, i) =>
        `<tr>
          <td style="padding:${i === 0 ? "0" : "10px"} 0 0;font-size:14px;color:#64748b;">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:${i === 0 ? "0" : "10px"} 0 0;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
    <tr>
      <td style="padding:18px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${items}
        </table>
      </td>
    </tr>
  </table>`;
}

function featureList(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td valign="top" style="padding:0 10px 10px 0;font-size:16px;color:#2563eb;line-height:1;">✓</td>
          <td style="padding:0 0 10px;font-size:14px;line-height:1.5;color:#475569;">${escapeHtml(item)}</td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
    ${rows}
  </table>`;
}

export function welcomeEmail(params: {
  fullName: string;
  companyName: string;
  email: string;
}): { subject: string; html: string; text: string } {
  const loginUrl = `${getAppUrl()}/login`;
  const subject = "Bienvenue sur Kaptano — votre compte est prêt";
  const firstName = params.fullName.split(" ")[0] ?? params.fullName;

  const html = layout(
    subject,
    `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;text-align:center;letter-spacing:-0.02em;">
      Bienvenue, ${escapeHtml(firstName)} !
    </h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#475569;text-align:center;">
      Votre espace exposant est prêt. Vous pouvez commencer dès maintenant.
    </p>
    ${infoBox([
      { label: "Entreprise", value: params.companyName },
      { label: "Identifiant", value: params.email },
    ])}
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a;">Prochaines étapes :</p>
    ${featureList([
      "Configurer vos stands et QR codes",
      "Capturer des leads sur le terrain (même hors-ligne)",
      "Envoyer vos messages WhatsApp depuis le tableau de bord",
    ])}
    ${button(loginUrl, "Accéder à mon espace")}
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
      <a href="${loginUrl}" style="color:#2563eb;word-break:break-all;text-decoration:none;">${loginUrl}</a>
    </p>`
  );

  const text = `Bienvenue ${params.fullName} !

Votre espace ${params.companyName} est prêt sur Kaptano.

Identifiant : ${params.email}

Prochaines étapes :
- Configurer vos stands et QR codes
- Capturer des leads sur le terrain
- Envoyer vos messages WhatsApp

Connectez-vous : ${loginUrl}`;

  return { subject, html, text };
}

export function passwordResetEmail(params: {
  fullName?: string | null;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.fullName
    ? `Bonjour ${params.fullName},`
    : "Bonjour,";
  const subject = "Réinitialisation de votre mot de passe Kaptano";
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Mot de passe oublié ?</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#475569;text-align:center;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#475569;text-align:center;">
      Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 24 heures.
    </p>
    ${button(params.resetUrl, "Réinitialiser mon mot de passe")}
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
    </p>`
  );
  const text = `${greeting}\n\nRéinitialisez votre mot de passe : ${params.resetUrl}`;
  return { subject, html, text };
}

export function teamInviteEmail(params: {
  fullName: string;
  companyName: string;
  email: string;
  tempPassword: string;
}): { subject: string; html: string; text: string } {
  const loginUrl = `${getAppUrl()}/login`;
  const subject = `Invitation Kaptano — rejoignez ${params.companyName}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Vous êtes invité(e) sur Kaptano</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#475569;text-align:center;">
      Bonjour ${escapeHtml(params.fullName)}, vous avez été ajouté(e) à l'équipe de <strong>${escapeHtml(params.companyName)}</strong> en tant qu'agent de capture sur stand.
    </p>
    ${infoBox([
      { label: "Email", value: params.email },
      { label: "Mot de passe temporaire", value: params.tempPassword },
    ])}
    <p style="margin:0 0 16px;line-height:1.6;color:#475569;text-align:center;">
      Connectez-vous puis changez votre mot de passe dès votre première connexion.
    </p>
    ${button(loginUrl, "Se connecter")}
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Lien direct : <a href="${loginUrl}" style="color:#2563eb;text-decoration:none;">${loginUrl}</a>
    </p>`
  );
  const text = `Invitation Kaptano pour ${params.companyName}\n\nEmail : ${params.email}\nMot de passe temporaire : ${params.tempPassword}\n\nConnexion : ${loginUrl}`;
  return { subject, html, text };
}
