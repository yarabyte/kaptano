import Link from "next/link";
import {
  Users,
  QrCode,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { getSessionUser, requireTenantContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/utils";
import { getTenantUsageSummary } from "@/lib/leads/check-quota";
import { getResolvedWhatsappSession } from "@/lib/whatsapp/resolve-session";
import { Button } from "@/components/ui/button";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentLeadsCard } from "@/components/dashboard/recent-leads-card";
import { WhatsappStatusCard } from "@/components/dashboard/whatsapp-status-card";
import {
  QuickActionsGrid,
  quickActionPresets,
} from "@/components/dashboard/quick-actions-grid";
export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const period = getCurrentPeriod();
  const isAdmin = ctx.role === "EXHIBITOR_ADMIN";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sessionUser = await getSessionUser();
  const tenantFromSession = sessionUser?.tenant;

  const [leadCount, standCount, todayLeadCount, recentLeads, usage, whatsapp] =
    await Promise.all([
      prisma.lead.count({ where: { tenantId: ctx.tenantId } }),
      prisma.stand.count({ where: { tenantId: ctx.tenantId, active: true } }),
      prisma.lead.count({
        where: { tenantId: ctx.tenantId, capturedAt: { gte: startOfToday } },
      }),
      prisma.lead.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { capturedAt: "desc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          whatsappNumber: true,
          company: true,
          source: true,
          capturedAt: true,
          stand: { select: { name: true } },
        },
      }),
      getTenantUsageSummary(ctx.tenantId),
      getResolvedWhatsappSession(ctx.tenantId),
    ]);

  const tenant = tenantFromSession
    ? { name: tenantFromSession.name, planTier: tenantFromSession.planTier }
    : null;

  const sessionDisconnected =
    whatsapp.whatsappMode === "own" &&
    whatsapp.status !== "CONNECTED" &&
    whatsapp.status !== "PENDING";

  const sharedUnavailable =
    whatsapp.whatsappMode === "shared" && whatsapp.status !== "CONNECTED";

  const quotaPercent =
    usage.quota > 0 ? Math.min(100, Math.round((usage.used / usage.quota) * 100)) : 0;

  const quickActions = [
    quickActionPresets.capture,
    quickActionPresets.leads,
    ...(isAdmin ? [quickActionPresets.stands, quickActionPresets.events] : []),
  ];

  return (
    <div className="space-y-8">
      <WelcomeBanner
        fullName={ctx.fullName}
        tenantName={tenant?.name}
        role={ctx.role}
        planTier={tenant?.planTier}
      />

      {sessionDisconnected && isAdmin && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 text-amber-950 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Session WhatsApp déconnectée</p>
            <p className="text-sm text-amber-800/80">
              Reconnectez votre numéro pour lancer les envois manuels.
            </p>
          </div>
          <Link href="/dashboard/whatsapp">
            <Button size="sm" className="w-full sm:w-auto">
              Reconnecter
            </Button>
          </Link>
        </div>
      )}

      {sharedUnavailable && isAdmin && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 text-amber-950 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Numéro WhatsApp partagé indisponible</p>
            <p className="text-sm text-amber-800/80">
              Le numéro Kaptano n&apos;est pas connecté. Contactez le support ou passez au plan Growth pour utiliser votre propre numéro.
            </p>
          </div>
          <Link href="/dashboard/billing">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              Voir les plans
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Leads totaux"
          value={leadCount}
          variant="blue"
          icon={<Users className="h-5 w-5" />}
          hint="Depuis le début"
        />
        <StatCard
          title="Leads ce mois"
          value={usage.used}
          variant="emerald"
          icon={<TrendingUp className="h-5 w-5" />}
          hint={period}
          footer={
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Quota mensuel</span>
                <span>
                  {usage.used.toLocaleString("fr-FR")} / {usage.quota.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
            </div>
          }
        />
        <StatCard
          title="Aujourd'hui"
          value={todayLeadCount}
          variant="violet"
          icon={<CalendarDays className="h-5 w-5" />}
          hint="Leads capturés aujourd'hui"
        />
        <StatCard
          title="Stands actifs"
          value={standCount}
          variant="amber"
          icon={<QrCode className="h-5 w-5" />}
          hint="QR codes en service"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentLeadsCard leads={recentLeads} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <WhatsappStatusCard
            status={whatsapp.status}
            phoneNumber={whatsapp.phoneNumber}
            whatsappMode={whatsapp.whatsappMode}
            isAdmin={isAdmin}
          />
          {isAdmin && usage.remaining <= 10 && usage.quota > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/60 to-white p-4">
              <p className="text-sm font-medium text-primary">
                {usage.isAtLimit
                  ? "Quota mensuel atteint"
                  : `Plus que ${usage.remaining} leads ce mois`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Passez à un plan supérieur pour augmenter votre capacité.
              </p>
              <Link href="/dashboard/billing" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  Voir les plans
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <QuickActionsGrid actions={quickActions} />
    </div>
  );
}
