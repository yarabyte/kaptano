import { loadPlatformPayments } from "@/lib/platform/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { DbAlert } from "@/components/platform/db-alert";
import { formatDate } from "@/lib/utils";

export default async function PlatformPaymentsPage() {
  let payments: Awaited<ReturnType<typeof loadPlatformPayments>> = [];
  let dbError: string | null = null;

  try {
    payments = await loadPlatformPayments();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur base de données";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Historique des abonnements via CinetPay (Orange Money, MTN Money)"
      />

      {dbError && <DbAlert />}

      {!dbError && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-accent/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Espace</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Montant</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Opérateur</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Aucun paiement enregistré
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">/{p.tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{p.planTier}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.amount.toLocaleString("fr-FR")} {p.currency}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "SUCCESS" ? "success" : p.status === "FAILED" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.operatorId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
