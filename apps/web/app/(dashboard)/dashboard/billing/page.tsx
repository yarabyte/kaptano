import { PLAN_QUOTAS } from "@kaptano/shared";
import { requireTenantContext, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CinetPaySubscribeButtons } from "@/components/billing/cinetpay-subscribe";
import { PaymentReturnChecker } from "@/components/billing/payment-return-checker";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { return?: string };
}) {
  const ctx = await requireTenantContext();
  await requireRole(["EXHIBITOR_ADMIN"]);

  const period = getCurrentPeriod();
  const [tenant, usage, recentPayments] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } }),
    prisma.usageRecord.findUnique({
      where: { tenantId_period: { tenantId: ctx.tenantId, period } },
    }),
    prisma.payment.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const quota = PLAN_QUOTAS[tenant.planTier] ?? 0;
  const used = usage?.leadsCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Facturation</h1>
        <p className="text-muted-foreground">Abonnement mensuel via Orange Money ou MTN Money</p>
      </div>

      {searchParams.return === "1" && <PaymentReturnChecker />}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Plan actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{tenant.planTier}</p>
            <p className="text-sm text-muted-foreground">{tenant.subscriptionStatus}</p>
            {tenant.subscriptionExpiresAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Expire le {formatDate(tenant.subscriptionExpiresAt)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Leads ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{used.toLocaleString("fr-FR")}</p>
            <p className="text-sm text-muted-foreground">sur {quota.toLocaleString("fr-FR")} inclus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Période</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{period}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choisir ou renouveler un plan</CardTitle>
        </CardHeader>
        <CardContent>
          <CinetPaySubscribeButtons currentTier={tenant.planTier} />
        </CardContent>
      </Card>

      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-border/60 p-4 text-sm"
                >
                  <p className="font-medium">{formatDate(p.createdAt)}</p>
                  <p className="mt-1 text-muted-foreground">Plan {p.planTier}</p>
                  <p className="mt-2 font-semibold">
                    {p.amount.toLocaleString("fr-FR")} {p.currency}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.status}</p>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b bg-accent/30">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Plan</th>
                    <th className="px-4 py-2 text-left">Montant</th>
                    <th className="px-4 py-2 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-2">{p.planTier}</td>
                      <td className="px-4 py-2">
                        {p.amount.toLocaleString("fr-FR")} {p.currency}
                      </td>
                      <td className="px-4 py-2">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
