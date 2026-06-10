function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function teamInviteWhatsappMessage(params: {
  fullName: string;
  companyName: string;
  email: string;
  tempPassword: string;
}): string {
  const loginUrl = `${getAppUrl().replace(/\/$/, "")}/login`;

  return `Bonjour ${params.fullName},

Vous avez été invité(e) à rejoindre l'équipe de *${params.companyName}* sur Kaptano en tant qu'agent de capture sur stand.

*Email :* ${params.email}
*Mot de passe temporaire :* ${params.tempPassword}

Connectez-vous ici : ${loginUrl}

Pensez à changer votre mot de passe dès votre première connexion.`;
}
