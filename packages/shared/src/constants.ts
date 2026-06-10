export const SEND_JITTER_MIN_MS = 20_000;
export const SEND_JITTER_MAX_MS = 60_000;
export const MANUAL_SEND_JITTER_MIN_MS = 3_000;
export const MANUAL_SEND_JITTER_MAX_MS = 8_000;
export const MAX_SEND_ATTEMPTS = 3;
export const DAILY_SEND_CAP = 200;
/** Maximum d'envois WhatsApp par lead et par jour (capture + campagnes). */
export const MAX_MESSAGE_JOBS_PER_LEAD_PER_DAY = 3;
export const DISPATCH_CRON = "*/15 * * * *";

/** Presets alignés sur les limites d'envoi WhatsApp Business (Meta) */
export const WASENDER_RATE_PRESETS = {
  ACCOUNT_PROTECTION: {
    minIntervalMs: 5_000,
    maxSendsPerMinute: 12,
    globalDailySendCap: 500,
    tenantDailySendCap: 200,
    label: "Protection compte (1 req / 5 s)",
  },
  PAID: {
    minIntervalMs: 250,
    maxSendsPerMinute: 256,
    globalDailySendCap: 5_000,
    tenantDailySendCap: 200,
    label: "Plan payant (256 req / min)",
  },
  TRIAL: {
    minIntervalMs: 60_000,
    maxSendsPerMinute: 1,
    globalDailySendCap: 50,
    tenantDailySendCap: 50,
    label: "Essai (1 req / min, 50 / jour)",
  },
} as const;

export const DEFAULT_TIMEZONE = "Africa/Douala";
export const DEFAULT_DAILY_SEND_TIME = "18:00";

export const CATALOG_BUCKET = "catalogs";

/** Événements webhook Wasender enregistrés à la création / sync de session. */
export const WASENDER_WEBHOOK_EVENTS = [
  "session.status",
  "message.sent",
  "messages.update",
  "messages.upsert",
  "messages-personal.received",
  "qrcode.updated",
  "poll.results",
] as const;

export const WHATSAPP_MESSAGE_TEMPLATE =
  "Bonjour {prenom}, merci pour votre visite sur notre stand ! Voici notre catalogue : {lien}";

export const LEAD_CAPTURE_THANK_YOU_TEMPLATE =
  "Bonjour {prenom}, merci pour votre visite ! Nous sommes ravis de vous accueillir. — {entreprise}";

export const PLAN_QUOTAS: Record<string, number> = {
  FREE: 50,
  STARTER: 500,
  GROWTH: 2000,
  SCALE: 10000,
};

/** Prix mensuels en XAF (CinetPay — Cameroun) */
export const PLAN_PRICES_XAF: Record<string, number> = {
  FREE: 0,
  STARTER: 32_200,
  GROWTH: 98_000,
  SCALE: 261_800,
};

export const CINETPAY_CURRENCY = "XAF";
export const SUBSCRIPTION_PERIOD_DAYS = 30;

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
