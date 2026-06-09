import crypto from "crypto";
import type { PlanTier } from "@kaptano/db";

const CHECKOUT_BASE = "https://api-checkout.cinetpay.com/v2";

export type CinetPayInitParams = {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  metadata: Record<string, string>;
  customerName: string;
  customerSurname: string;
  customerEmail: string;
  customerPhone?: string;
};

export type CinetPayInitResponse = {
  code: string;
  message: string;
  data?: {
    payment_url?: string;
    payment_token?: string;
  };
};

export type CinetPayCheckResponse = {
  code: string;
  message: string;
  data?: {
    status: string;
    amount: string;
    currency: string;
    operator_id?: string;
    payment_method?: string;
    payment_date?: string;
  };
};

export type CinetPayNotifyPayload = {
  cpm_site_id: string;
  cpm_trans_id: string;
  cpm_trans_date: string;
  cpm_amount: string;
  cpm_currency: string;
  signature: string;
  payment_method: string;
  cel_phone_num: string;
  cpm_phone_prefixe: string;
  cpm_language: string;
  cpm_version: string;
  cpm_payment_config: string;
  cpm_page_action: string;
  cpm_custom: string;
  cpm_designation: string;
  cpm_error_message: string;
};

function getConfig() {
  const apikey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  if (!apikey || !siteId) {
    throw new Error("CINETPAY_API_KEY et CINETPAY_SITE_ID requis");
  }
  return { apikey, siteId };
}

export async function initCinetPayPayment(
  params: CinetPayInitParams
): Promise<{ paymentUrl: string }> {
  const { apikey, siteId } = getConfig();

  const res = await fetch(`${CHECKOUT_BASE}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey,
      site_id: siteId,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      channels: "ALL",
      lang: "fr",
      metadata: JSON.stringify(params.metadata),
      customer_name: params.customerName,
      customer_surname: params.customerSurname,
      customer_email: params.customerEmail,
      customer_phone_number: params.customerPhone ?? "",
    }),
  });

  const data = (await res.json()) as CinetPayInitResponse;

  if (data.code !== "201" || !data.data?.payment_url) {
    throw new Error(data.message ?? "Erreur CinetPay à l'initialisation");
  }

  return { paymentUrl: data.data.payment_url };
}

export async function checkCinetPayPayment(
  transactionId: string
): Promise<CinetPayCheckResponse> {
  const { apikey, siteId } = getConfig();

  const res = await fetch(`${CHECKOUT_BASE}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey,
      site_id: siteId,
      transaction_id: transactionId,
    }),
  });

  return res.json() as Promise<CinetPayCheckResponse>;
}

export function verifyCinetPayHmac(
  payload: CinetPayNotifyPayload,
  receivedToken: string | null
): boolean {
  const secret = process.env.CINETPAY_SECRET_KEY;
  if (!secret || !receivedToken) return false;

  const data =
    payload.cpm_site_id +
    payload.cpm_trans_id +
    payload.cpm_trans_date +
    payload.cpm_amount +
    payload.cpm_currency +
    payload.signature +
    payload.payment_method +
    payload.cel_phone_num +
    payload.cpm_phone_prefixe +
    payload.cpm_language +
    payload.cpm_version +
    payload.cpm_payment_config +
    payload.cpm_page_action +
    payload.cpm_custom +
    payload.cpm_designation +
    payload.cpm_error_message;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedToken),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export function isPaymentAccepted(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized === "ACCEPTED" || normalized === "SUCCESS";
}

export function planTierFromMetadata(metadata: string): PlanTier | null {
  try {
    const parsed = JSON.parse(metadata) as { planTier?: string };
    const tier = parsed.planTier;
    if (tier === "STARTER" || tier === "GROWTH" || tier === "SCALE") {
      return tier;
    }
    return null;
  } catch {
    return null;
  }
}
