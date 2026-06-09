import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  initiatePaymentSchema,
  PLAN_PRICES_XAF,
  CINETPAY_CURRENCY,
  SUBSCRIPTION_PERIOD_DAYS,
} from "@kaptano/shared";
import type { PlanTier } from "@kaptano/db";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initCinetPayPayment } from "@/lib/cinetpay/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const body: unknown = await request.json();
  const parsed = initiatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const planTier = parsed.data.planTier as PlanTier;
  const amount = PLAN_PRICES_XAF[planTier];

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Plan gratuit — pas de paiement requis" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId },
    include: { users: { where: { role: "EXHIBITOR_ADMIN" }, take: 1 } },
  });

  const admin = tenant.users[0];
  const transactionId = `kapt-${ctx.tenantId.slice(0, 8)}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  await prisma.payment.create({
    data: {
      tenantId: ctx.tenantId,
      transactionId,
      planTier,
      amount,
      currency: CINETPAY_CURRENCY,
    },
  });

  try {
    const { paymentUrl } = await initCinetPayPayment({
      transactionId,
      amount,
      currency: CINETPAY_CURRENCY,
      description: `Abonnement Kaptano ${planTier} — 1 mois`,
      notifyUrl: `${APP_URL}/api/cinetpay/notify`,
      returnUrl: `${APP_URL}/dashboard/billing?return=1`,
      metadata: {
        tenantId: ctx.tenantId,
        planTier,
        periodDays: String(SUBSCRIPTION_PERIOD_DAYS),
      },
      customerName: admin?.fullName?.split(/\s+/).slice(-1)[0] ?? tenant.name,
      customerSurname: admin?.fullName?.split(/\s+/)[0] ?? tenant.name,
      customerEmail: admin?.email ?? ctx.email,
    });

    return NextResponse.json({ paymentUrl, transactionId });
  } catch (err) {
    await prisma.payment.update({
      where: { transactionId },
      data: { status: "FAILED" },
    });
    const message = err instanceof Error ? err.message : "Erreur CinetPay";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
