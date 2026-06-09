import Link from "next/link";
import {
  Building2,
  Users,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { loadPlatformOverview } from "@/lib/platform/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DbAlert } from "@/components/platform/db-alert";
import { formatDate } from "@/lib/utils";

const planLabels: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
};

export default async function PlatformOverviewPage() {
  let data: Awaited<ReturnType<typeof loadPlatformOverview>> | null = null;
  let dbError: string | null = null;

  try {
    data = await loadPlatformOverview();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur base de données";
  }

  const stats = data?.stats;
  const tenants = data?.tenants ?? [];
  const failedJobs = data?.failedJobs ?? [];
  const planCounts = data?.planCounts ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vue d'ensemble"
        description="Activité globale de la plateforme Kaptano"
      />

      {dbError && <DbAlert />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Espaces exposants"
          value={dbError ? "—" : (stats?.tenants ?? 0)}
          variant="blue"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Leads totaux"
          value={dbError ? "—" : (stats?.totalLeads ?? 0)}
          variant="emerald"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Jobs en échec"
          value={dbError ? "—" : (stats?.failedJobs ?? 0)}
          variant="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Paiements récents"
          value={dbError ? "—" : (stats?.payments ?? 0)}
          variant="violet"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      {!dbError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(planCounts).map(([plan, count]) => (
              <Card key={plan} className="border-border/60 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan {planLabels[plan] ?? plan}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Badge variant="secondary">{plan}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg">Derniers espaces</CardTitle>
                <Link href="/platform/tenants">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenants.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">/{t.slug}</p>
                    </div>
                    <div className="text-right text-xs">
                      <Badge variant="secondary">{t.planTier}</Badge>
                      <p className="mt-1 text-muted-foreground">{t._count.leads} leads</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg">Échecs récents</CardTitle>
                <Link href="/platform/messages">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {failedJobs.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun échec récent</p>
                )}
                {failedJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border border-border/60 bg-accent/20 px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium">
                      {job.tenant.name} — {job.lead.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {job.lastError ?? "Erreur inconnue"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp partagé</p>
                  <p className="text-sm text-muted-foreground">
                    Configurez le numéro utilisé par les plans Gratuit et Starter
                  </p>
                </div>
              </div>
              <Link href="/platform/whatsapp">
                <Button>Configurer</Button>
              </Link>
            </CardContent>
          </Card>

          {data?.recentPayments && data.recentPayments.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg">Derniers paiements</CardTitle>
                <Link href="/platform/payments">
                  <Button variant="ghost" size="sm">
                    Historique complet
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{p.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {p.amount.toLocaleString("fr-FR")} {p.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.planTier}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
