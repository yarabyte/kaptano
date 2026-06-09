import { NextResponse } from "next/server";
import { SUBSCRIPTION_PERIOD_DAYS } from "@kaptano/shared";
import { prisma } from "@/lib/prisma";
import {
  checkCinetPayPayment,
  verifyCinetPayHmac,
  isPaymentAccepted,
  type CinetPayNotifyPayload,
} from "@/lib/cinetpay/client";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload: CinetPayNotifyPayload = {
    cpm_site_id: String(formData.get("cpm_site_id") ?? ""),
    cpm_trans_id: String(formData.get("cpm_trans_id") ?? ""),
    cpm_trans_date: String(formData.get("cpm_trans_date") ?? ""),
    cpm_amount: String(formData.get("cpm_amount") ?? ""),
    cpm_currency: String(formData.get("cpm_currency") ?? ""),
    signature: String(formData.get("signature") ?? ""),
    payment_method: String(formData.get("payment_method") ?? ""),
    cel_phone_num: String(formData.get("cel_phone_num") ?? ""),
    cpm_phone_prefixe: String(formData.get("cpm_phone_prefixe") ?? ""),
    cpm_language: String(formData.get("cpm_language") ?? ""),
    cpm_version: String(formData.get("cpm_version") ?? ""),
    cpm_payment_config: String(formData.get("cpm_payment_config") ?? ""),
    cpm_page_action: String(formData.get("cpm_page_action") ?? ""),
    cpm_custom: String(formData.get("cpm_custom") ?? ""),
    cpm_designation: String(formData.get("cpm_designation") ?? ""),
    cpm_error_message: String(formData.get("cpm_error_message") ?? ""),
  };

  const receivedToken = request.headers.get("x-token");

  if (!verifyCinetPayHmac(payload, receivedToken)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const transactionId = payload.cpm_trans_id;
  if (!transactionId) {
    return NextResponse.json({ error: "transaction_id manquant" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    include: { tenant: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.status === "SUCCESS") {
    return NextResponse.json({ ok: true, message: "Déjà traité" });
  }

  try {
    const check = await checkCinetPayPayment(transactionId);
    const status = check.data?.status ?? "";

    if (!isPaymentAccepted(status)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ ok: true, message: "Paiement non accepté" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_PERIOD_DAYS);

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: new Date(),
          operatorId: check.data?.operator_id ?? null,
        },
      }),
      prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          planTier: payment.planTier,
          subscriptionStatus: "ACTIVE",
          subscriptionExpiresAt: expiresAt,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur vérification" }, { status: 500 });
  }
}
