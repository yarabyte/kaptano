import { NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkCinetPayPayment, isPaymentAccepted } from "@/lib/cinetpay/client";
import { SUBSCRIPTION_PERIOD_DAYS } from "@kaptano/shared";

export async function GET(request: Request) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId requis" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { transactionId, tenantId: ctx.tenantId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.status === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS", payment });
  }

  try {
    const check = await checkCinetPayPayment(transactionId);
    const cinetpayStatus = check.data?.status ?? "";

    if (isPaymentAccepted(cinetpayStatus)) {
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

      return NextResponse.json({ status: "SUCCESS", payment: { ...payment, status: "SUCCESS" } });
    }

    return NextResponse.json({
      status: payment.status,
      cinetpayStatus,
      message: check.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur vérification";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
