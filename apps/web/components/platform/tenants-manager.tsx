"use client";

import { useMemo, useState } from "react";
import { effectivePlanTier, usesSharedWhatsapp } from "@kaptano/shared";
import { Search, Building2, Users, QrCode, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export function TenantsManager({ tenants }: { tenants: TenantRow[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchesPlan = planFilter === "ALL" || t.planTier === planFilter;
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q);
      return matchesPlan && matchesSearch;
    });
  }, [tenants, search, planFilter]);

  const planOptions = ["ALL", ...Array.from(new Set(tenants.map((t) => t.planTier)))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou identifiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
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

          return (
            <Card key={tenant.id} className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{tenant.name}</h3>
                        <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-3 sm:gap-4">
                    <StatPill icon={Users} label="Leads" value={tenant._count.leads} />
                    <StatPill icon={QrCode} label="Stands" value={tenant._count.stands} />
                    <StatPill icon={Users} label="Users" value={tenant._count.users} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {isShared ? (
                      <span>WhatsApp <strong className="text-foreground">partagé</strong></span>
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
    </div>
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
