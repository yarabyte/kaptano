"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Gauge,
  RefreshCw,
  Save,
  Shield,
  Timer,
} from "lucide-react";
import { WASENDER_RATE_PRESETS } from "@kaptano/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDate } from "@/lib/utils";

type Limits = {
  wasenderPlanMode: string;
  minIntervalMs: number;
  maxSendsPerMinute: number;
  globalDailySendCap: number;
  tenantDailySendCap: number;
  maxConcurrentSends: number;
  enforcementEnabled: boolean;
  lastSharedSendAt: string | null;
  lastRateLimitLimit: number | null;
  lastRateLimitRemaining: number | null;
  lastRateLimitResetAt: string | null;
};

type DashboardData = {
  limits: Limits;
  stats: {
    todayGlobalSent: number;
    lastMinuteSent: number;
    lastHourSent: number;
    sendingNow: number;
    queuedNow: number;
    rateLimitFailures: number;
    msSinceLastSend: number | null;
  };
  recentSends: Array<{
    id: string;
    sentAt: string | null;
    status: string;
    tenant: { name: string; slug: string; planTier: string };
    lead: { fullName: string; whatsappNumber: string };
  }>;
  tenantBreakdown: Array<{
    tenant?: { name: string; slug: string; planTier: string };
    sentToday: number;
  }>;
};

const MODE_LABELS: Record<string, string> = {
  ACCOUNT_PROTECTION: "Protection compte",
  PAID: "Plan payant",
  TRIAL: "Essai",
  CUSTOM: "Personnalisé",
};

function UsageBar({
  label,
  value,
  max,
  warnAt = 0.8,
}: {
  label: string;
  value: number;
  max: number;
  warnAt?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tone =
    pct >= 100 ? "bg-destructive" : pct >= warnAt * 100 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RateLimitsManager({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({
    wasenderPlanMode: initial.limits.wasenderPlanMode,
    minIntervalMs: initial.limits.minIntervalMs,
    maxSendsPerMinute: initial.limits.maxSendsPerMinute,
    globalDailySendCap: initial.limits.globalDailySendCap,
    tenantDailySendCap: initial.limits.tenantDailySendCap,
    maxConcurrentSends: initial.limits.maxConcurrentSends,
    enforcementEnabled: initial.limits.enforcementEnabled,
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/platform/rate-limits");
      if (!res.ok) return;
      const next = (await res.json()) as DashboardData;
      setData(next);
      setForm({
        wasenderPlanMode: next.limits.wasenderPlanMode,
        minIntervalMs: next.limits.minIntervalMs,
        maxSendsPerMinute: next.limits.maxSendsPerMinute,
        globalDailySendCap: next.limits.globalDailySendCap,
        tenantDailySendCap: next.limits.tenantDailySendCap,
        maxConcurrentSends: next.limits.maxConcurrentSends,
        enforcementEnabled: next.limits.enforcementEnabled,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  function applyPreset(mode: keyof typeof WASENDER_RATE_PRESETS) {
    const preset = WASENDER_RATE_PRESETS[mode];
    setForm((f) => ({
      ...f,
      wasenderPlanMode: mode,
      minIntervalMs: preset.minIntervalMs,
      maxSendsPerMinute: preset.maxSendsPerMinute,
      globalDailySendCap: preset.globalDailySendCap,
      tenantDailySendCap: preset.tenantDailySendCap,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/platform/rate-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      setSaved(true);
      await refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  const { limits, stats } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Envoyés aujourd'hui"
          value={stats.todayGlobalSent}
          variant="blue"
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard
          title="Dernière minute"
          value={`${stats.lastMinuteSent} / ${limits.maxSendsPerMinute}`}
          variant="emerald"
          icon={<Timer className="h-5 w-5" />}
        />
        <StatCard
          title="En file / en cours"
          value={`${stats.queuedNow} / ${stats.sendingNow}`}
          variant="violet"
          icon={<RefreshCw className="h-5 w-5" />}
        />
        <StatCard
          title="Échecs rate limit"
          value={stats.rateLimitFailures}
          variant="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Utilisation vs limites</CardTitle>
            <CardDescription>
              Surveillance globale — numéro partagé avec protection compte activée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageBar
              label="Aujourd'hui (global)"
              value={stats.todayGlobalSent}
              max={limits.globalDailySendCap}
            />
            <UsageBar
              label="Dernière minute"
              value={stats.lastMinuteSent}
              max={limits.maxSendsPerMinute}
            />
            <UsageBar
              label="Concurrence (envois en cours)"
              value={stats.sendingNow}
              max={limits.maxConcurrentSends}
            />
            {stats.msSinceLastSend != null && (
              <p className="text-sm text-muted-foreground">
                Dernier envoi partagé : il y a{" "}
                <span className="font-medium text-foreground">
                  {Math.round(stats.msSinceLastSend / 1000)} s
                </span>
                {stats.msSinceLastSend < limits.minIntervalMs && (
                  <span className="ml-1 text-amber-600">(intervalle min. non respecté)</span>
                )}
              </p>
            )}
            {limits.lastRateLimitRemaining != null && limits.lastRateLimitLimit != null && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">Headers Wasender (dernier envoi)</p>
                <p className="mt-1 text-muted-foreground">
                  Restant : {limits.lastRateLimitRemaining} / {limits.lastRateLimitLimit}
                  {limits.lastRateLimitResetAt && (
                    <> — reset {formatDate(limits.lastRateLimitResetAt)}</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="font-heading text-lg">Configuration</CardTitle>
              <CardDescription>
                Aligné sur la{" "}
                <a
                  href="https://wasenderapi.com/api-docs/rate-limits/understanding-rate-limits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  documentation Wasender
                </a>
              </CardDescription>
            </div>
            <Badge variant={form.enforcementEnabled ? "default" : "secondary"}>
              {form.enforcementEnabled ? "Actif" : "Désactivé"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(WASENDER_RATE_PRESETS) as Array<keyof typeof WASENDER_RATE_PRESETS>).map(
                (key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={form.wasenderPlanMode === key ? "default" : "outline"}
                    onClick={() => applyPreset(key)}
                  >
                    {WASENDER_RATE_PRESETS[key].label}
                  </Button>
                )
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="minIntervalMs">Intervalle min. (ms)</Label>
                <Input
                  id="minIntervalMs"
                  type="number"
                  min={0}
                  value={form.minIntervalMs}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      wasenderPlanMode: "CUSTOM",
                      minIntervalMs: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxSendsPerMinute">Max / minute</Label>
                <Input
                  id="maxSendsPerMinute"
                  type="number"
                  min={1}
                  value={form.maxSendsPerMinute}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      wasenderPlanMode: "CUSTOM",
                      maxSendsPerMinute: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="globalDailySendCap">Plafond global / jour</Label>
                <Input
                  id="globalDailySendCap"
                  type="number"
                  min={1}
                  value={form.globalDailySendCap}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      wasenderPlanMode: "CUSTOM",
                      globalDailySendCap: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenantDailySendCap">Plafond / exposant / jour</Label>
                <Input
                  id="tenantDailySendCap"
                  type="number"
                  min={1}
                  value={form.tenantDailySendCap}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      wasenderPlanMode: "CUSTOM",
                      tenantDailySendCap: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxConcurrentSends">Concurrence max (1–5)</Label>
                <Input
                  id="maxConcurrentSends"
                  type="number"
                  min={1}
                  max={5}
                  value={form.maxConcurrentSends}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxConcurrentSends: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.enforcementEnabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, enforcementEnabled: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Appliquer les limites à l&apos;envoi
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Mode : {MODE_LABELS[form.wasenderPlanMode] ?? form.wasenderPlanMode}. La protection
              compte Wasender (1 req / 5 s) prime sur les plans payants — recommandé pour le numéro
              partagé.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && (
              <p className="text-sm text-emerald-600">Configuration enregistrée.</p>
            )}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Par exposant (aujourd&apos;hui)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.tenantBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun envoi aujourd&apos;hui</p>
            )}
            {data.tenantBreakdown.map((row, i) => (
              <div
                key={row.tenant?.slug ?? i}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{row.tenant?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">/{row.tenant?.slug}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{row.sentToday}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {row.tenant?.planTier}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Derniers envois</CardTitle>
            <CardDescription>{stats.lastHourSent} envoyés dans la dernière heure</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto">
            {data.recentSends.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun envoi récent</p>
            )}
            {data.recentSends.map((job) => (
              <div
                key={job.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {job.tenant.name} — {job.lead.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.lead.whatsappNumber}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {job.sentAt ? formatDate(job.sentAt) : "—"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
