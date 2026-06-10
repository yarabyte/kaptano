import { NextResponse } from "next/server";
import { platformTenantActionSchema } from "@kaptano/shared";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  promoteTenantPlan,
  recordCashPayment,
  setTenantStatus,
} from "@/lib/platform/tenant-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  await requirePlatformAdmin();
  const { id } = await context.params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Espace exposant introuvable" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = platformTenantActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Action invalide" },
      { status: 400 }
    );
  }

  const action = parsed.data;

  try {
    switch (action.action) {
      case "set_status": {
        const updated = await setTenantStatus(id, action.status);
        return NextResponse.json({
          tenant: {
            id: updated.id,
            status: updated.status,
            planTier: updated.planTier,
            subscriptionStatus: updated.subscriptionStatus,
            subscriptionExpiresAt: updated.subscriptionExpiresAt,
          },
        });
      }
      case "promote_plan": {
        const updated = await promoteTenantPlan(
          id,
          action.planTier,
          action.subscriptionDays
        );
        return NextResponse.json({
          tenant: {
            id: updated.id,
            status: updated.status,
            planTier: updated.planTier,
            subscriptionStatus: updated.subscriptionStatus,
            subscriptionExpiresAt: updated.subscriptionExpiresAt,
          },
        });
      }
      case "record_cash_payment": {
        const result = await recordCashPayment(id, action.planTier, {
          amount: action.amount,
          subscriptionDays: action.subscriptionDays,
        });
        return NextResponse.json({
          tenant: {
            id: result.tenant.id,
            status: result.tenant.status,
            planTier: result.tenant.planTier,
            subscriptionStatus: result.tenant.subscriptionStatus,
            subscriptionExpiresAt: result.tenant.subscriptionExpiresAt,
          },
          payment: {
            id: result.payment.id,
            transactionId: result.payment.transactionId,
            amount: result.payment.amount,
            planTier: result.payment.planTier,
          },
        });
      }
    }
  } catch (err) {
    console.error("[platform/tenants]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
