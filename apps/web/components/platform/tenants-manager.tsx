"use client";

import { useMemo, useState } from "react";
import {
  effectivePlanTier,
  PLAN_PRICES_XAF,
  usesSharedWhatsapp,
} from "@kaptano/shared";
import {
  Banknote,
  Ban,
  Building2,
  CheckCircle2,
  Loader2,
  MessageCircle,
  MoreVertical,
  QrCode,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planTier: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  whatsappSession: { status: string; phoneNumber: string | null } | null;
  _count: { leads: number; users: number; stands: number };
};

const planLabels: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
};

const planColors: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  STARTER: "bg-blue-50 text-blue-700",
  GROWTH: "bg-primary/10 text-primary",
  SCALE: "bg-violet-50 text-violet-700",
};

const subStatusColors: Record<string, "success" | "secondary" | "destructive"> = {
  ACTIVE: "success",
  TRIALING: "secondary",
  PAST_DUE: "destructive",
  CANCELED: "destructive",
};

const PAID_PLANS = ["STARTER", "GROWTH", "SCALE"] as const;

export function TenantsManager({ tenants: initialTenants }: { tenants: TenantRow[] }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [promoteTarget, setPromoteTarget] = useState<TenantRow | null>(null);
  const [promotePlan, setPromotePlan] = useState<string>("STARTER");
  const [promoteDays, setPromoteDays] = useState(30);

  const [cashTarget, setCashTarget] = useState<TenantRow | null>(null);
  const [cashPlan, setCashPlan] = useState<string>("STARTER");
  const [cashAmount, setCashAmount] = useState<number>(PLAN_PRICES_XAF.STARTER ?? 0);

  const [confirmDeactivate, setConfirmDeactivate] = useState<TenantRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchesPlan = planFilter === "ALL" || t.planTier === planFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "active" ? t.status === "active" : t.status !== "active");
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q);
      return matchesPlan && matchesStatus && matchesSearch;
    });
  }, [tenants, search, planFilter, statusFilter]);

  const planOptions = ["ALL", ...Array.from(new Set(tenants.map((t) => t.planTier)))];

  function patchTenantInList(id: string, patch: Partial<TenantRow>) {
    setTenants((list) =>
      list.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  async function runAction(
    tenantId: string,
    body: Record<string, unknown>,
    onSuccess?: (data: {
      tenant: {
        status: string;
        planTier: string;
        subscriptionStatus: string;
        subscriptionExpiresAt: string | Date | null;
      };
    }) => void
  ) {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        tenant?: {
          status: string;
          planTier: string;
          subscriptionStatus: string;
          subscriptionExpiresAt: string | null;
        };
      };
      if (!res.ok || !data.tenant) {
        setActionError(data.error ?? "Action échouée");
        return false;
      }
      patchTenantInList(tenantId, {
        status: data.tenant.status,
        planTier: data.tenant.planTier,
        subscriptionStatus: data.tenant.subscriptionStatus,
        subscriptionExpiresAt: data.tenant.subscriptionExpiresAt,
      });
      onSuccess?.({ tenant: data.tenant });
      return true;
    } catch {
      setActionError("Impossible de contacter le serveur");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote() {
    if (!promoteTarget) return;
    const ok = await runAction(promoteTarget.id, {
      action: "promote_plan",
      planTier: promotePlan,
      subscriptionDays: promoteDays,
    });
    if (ok) {
      setActionSuccess(`${promoteTarget.name} — plan ${planLabels[promotePlan] ?? promotePlan} appliqué`);
      setPromoteTarget(null);
    }
  }

  async function handleCashPayment() {
    if (!cashTarget) return;
    const ok = await runAction(cashTarget.id, {
      action: "record_cash_payment",
      planTier: cashPlan,
      amount: cashAmount,
      subscriptionDays: 30,
    });
    if (ok) {
      setActionSuccess(
        `Paiement espèces enregistré pour ${cashTarget.name} (${cashAmount.toLocaleString("fr-FR")} XAF)`
      );
      setCashTarget(null);
    }
  }

  async function handleToggleStatus(tenant: TenantRow, status: "active" | "inactive") {
    const ok = await runAction(tenant.id, { action: "set_status", status });
    if (ok) {
      setActionSuccess(
        status === "inactive"
          ? `${tenant.name} a été désactivé`
          : `${tenant.name} a été réactivé`
      );
      setConfirmDeactivate(null);
    }
  }

  function openCashDialog(tenant: TenantRow) {
    setCashPlan("STARTER");
    setCashAmount(PLAN_PRICES_XAF.STARTER ?? 0);
    setCashTarget(tenant);
    setMenuOpenId(null);
    setActionError(null);
  }

  function openPromoteDialog(tenant: TenantRow) {
    setPromotePlan(tenant.planTier === "FREE" ? "STARTER" : tenant.planTier);
    setPromoteDays(30);
    setPromoteTarget(tenant);
    setMenuOpenId(null);
    setActionError(null);
  }

  return (
    <div className="space-y-4">
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionSuccess}
          <button
            type="button"
            className="ml-auto text-xs underline"
            onClick={() => setActionSuccess(null)}
          >
            Fermer
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou identifiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Désactivés</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
          >
            {planOptions.map((plan) => (
              <option key={plan} value={plan}>
                {plan === "ALL" ? "Tous les plans" : (planLabels[plan] ?? plan)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} espace{filtered.length !== 1 ? "s" : ""} sur {tenants.length}
      </p>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucun espace ne correspond à votre recherche.
            </CardContent>
          </Card>
        )}

        {filtered.map((tenant) => {
          const effectiveTier = effectivePlanTier(
            tenant.planTier as "FREE" | "STARTER" | "GROWTH" | "SCALE",
            tenant.subscriptionStatus as "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED",
            tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt) : null
          );
          const isShared = usesSharedWhatsapp(effectiveTier);
          const isInactive = tenant.status !== "active";
          const menuOpen = menuOpenId === tenant.id;

          return (
            <Card
              key={tenant.id}
              className={cn(
                "border-border/60 shadow-sm transition-shadow hover:shadow-md",
                isInactive && "border-destructive/30 bg-destructive/[0.02]"
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            isInactive
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{tenant.name}</h3>
                          <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                        </div>
                      </div>

                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => setMenuOpenId(menuOpen ? null : tenant.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                          Actions
                        </Button>
                        {menuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setMenuOpenId(null)}
                              aria-hidden
                            />
                            <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border/60 bg-white py-1 shadow-lg">
                              <MenuAction
                                icon={TrendingUp}
                                label="Promouvoir / changer le plan"
                                onClick={() => openPromoteDialog(tenant)}
                              />
                              <MenuAction
                                icon={Banknote}
                                label="Encaisser en espèces"
                                onClick={() => openCashDialog(tenant)}
                              />
                              {isInactive ? (
                                <MenuAction
                                  icon={CheckCircle2}
                                  label="Réactiver l'espace"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    void handleToggleStatus(tenant, "active");
                                  }}
                                />
                              ) : (
                                <MenuAction
                                  icon={Ban}
                                  label="Désactiver l'exposant"
                                  destructive
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    setConfirmDeactivate(tenant);
                                  }}
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {isInactive && (
                        <Badge variant="destructive" className="text-xs">
                          Désactivé
                        </Badge>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          planColors[tenant.planTier] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {planLabels[tenant.planTier] ?? tenant.planTier}
                      </span>
                      <Badge variant={subStatusColors[tenant.subscriptionStatus] ?? "secondary"}>
                        {tenant.subscriptionStatus}
                      </Badge>
                      {effectiveTier !== tenant.planTier && (
                        <Badge variant="outline" className="text-xs">
                          Effectif : {planLabels[effectiveTier] ?? effectiveTier}
                        </Badge>
                      )}
                      {tenant.subscriptionExpiresAt && (
                        <span className="text-xs text-muted-foreground">
                          Expire {formatDate(new Date(tenant.subscriptionExpiresAt))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
                    <StatPill icon={Users} label="Leads" value={tenant._count.leads} />
                    <StatPill icon={QrCode} label="Stands" value={tenant._count.stands} />
                    <StatPill icon={Users} label="Users" value={tenant._count.users} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {isShared ? (
                      <span>
                        WhatsApp <strong className="text-foreground">partagé</strong>
                      </span>
                    ) : (
                      <span>
                        WhatsApp{" "}
                        <strong className="text-foreground">
                          {tenant.whatsappSession?.status ?? "non configuré"}
                        </strong>
                        {tenant.whatsappSession?.phoneNumber && (
                          <span className="ml-1">· {tenant.whatsappSession.phoneNumber}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <span>Créé le {formatDate(new Date(tenant.createdAt))}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Promouvoir */}
      <Dialog open={!!promoteTarget} onOpenChange={(o) => !o && setPromoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir manuellement</DialogTitle>
            <DialogDescription>
              {promoteTarget?.name} — applique un plan sans passer par CinetPay
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <select
                value={promotePlan}
                onChange={(e) => setPromotePlan(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(planLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {promotePlan !== "FREE" && (
              <div className="space-y-1.5">
                <Label>Durée d&apos;abonnement (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={promoteDays}
                  onChange={(e) => setPromoteDays(Number(e.target.value))}
                />
              </div>
            )}
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteTarget(null)}>
              Annuler
            </Button>
            <Button onClick={() => void handlePromote()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Espèces */}
      <Dialog open={!!cashTarget} onOpenChange={(o) => !o && setCashTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaissement en espèces</DialogTitle>
            <DialogDescription>
              {cashTarget?.name} — enregistre le paiement et active l&apos;abonnement (30 jours)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Plan payé</Label>
              <select
                value={cashPlan}
                onChange={(e) => {
                  const plan = e.target.value;
                  setCashPlan(plan);
                  setCashAmount(PLAN_PRICES_XAF[plan] ?? 0);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PAID_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {planLabels[p]} — {(PLAN_PRICES_XAF[p] ?? 0).toLocaleString("fr-FR")} XAF
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Montant encaissé (XAF)</Label>
              <Input
                type="number"
                min={1}
                value={cashAmount}
                onChange={(e) => setCashAmount(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Tarif catalogue : {(PLAN_PRICES_XAF[cashPlan] ?? 0).toLocaleString("fr-FR")} XAF
              </p>
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashTarget(null)}>
              Annuler
            </Button>
            <Button onClick={() => void handleCashPayment()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <Banknote className="mr-2 h-4 w-4" />
              Confirmer l&apos;encaissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Désactivation */}
      <Dialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver cet exposant ?</DialogTitle>
            <DialogDescription>
              {confirmDeactivate?.name} ne pourra plus se connecter ni utiliser Kaptano. Les
              données sont conservées.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeactivate(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() =>
                confirmDeactivate && void handleToggleStatus(confirmDeactivate, "inactive")
              }
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Users;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
        destructive ? "text-destructive hover:bg-destructive/5" : "text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      {label}
    </button>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
    </div>
  );
}
