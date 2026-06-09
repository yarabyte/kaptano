export const SEND_JITTER_MIN_MS = 20_000;
export const SEND_JITTER_MAX_MS = 60_000;
export const MANUAL_SEND_JITTER_MIN_MS = 3_000;
export const MANUAL_SEND_JITTER_MAX_MS = 8_000;
export const MAX_SEND_ATTEMPTS = 3;
export const DAILY_SEND_CAP = 200;
export const DISPATCH_CRON = "*/15 * * * *";

export const DEFAULT_TIMEZONE = "Africa/Douala";
export const DEFAULT_DAILY_SEND_TIME = "18:00";

export const CATALOG_BUCKET = "catalogs";

export const WHATSAPP_MESSAGE_TEMPLATE =
  "Bonjour {prenom}, merci pour votre visite sur notre stand ! Voici notre catalogue : {lien}";

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
