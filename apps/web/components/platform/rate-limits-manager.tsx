"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Gauge,
  Inbox,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { WASENDER_RATE_PRESETS } from "@kaptano/shared";
import { META_WHATSAPP_RATE_LIMITS_URL } from "@/lib/legal/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn, formatDate } from "@/lib/utils";

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
  PAID: "Volume élevé",
  TRIAL: "Essai",
  CUSTOM: "Personnalisé",
};

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  STARTER: "bg-blue-100 text-blue-700",
  GROWTH: "bg-violet-100 text-violet-700",
  SCALE: "bg-amber-100 text-amber-800",
};

const PRESET_ICONS: Record<keyof typeof WASENDER_RATE_PRESETS, typeof Shield> = {
  ACCOUNT_PROTECTION: ShieldCheck,
  PAID: Zap,
  TRIAL: Clock,
};

function usageTone(pct: number) {
  if (pct >= 100) return { bar: "bg-destructive", text: "text-destructive", label: "Critique" };
  if (pct >= 80) return { bar: "bg-amber-500", text: "text-amber-700", label: "Élevé" };
  return { bar: "bg-primary", text: "text-primary", label: "Normal" };
}

function UsageBar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = usageTone(pct);

  return (
    <div className="rounded-xl border border-border/50 bg-white/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px] font-semibold uppercase", tone.text)}
        >
          {tone.label}
        </Badge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-heading text-2xl font-bold tabular-nums">
          {value}
          <span className="text-base font-normal text-muted-foreground"> / {max}</span>
        </p>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatInterval(ms: number) {
  if (ms >= 60_000) return `${Math.round(ms / 60_000)} min`;
  if (ms >= 1000) return `${Math.round(ms / 1000)} s`;
  return `${ms} ms`;
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
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());
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
      setLastRefresh(new Date());
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
    setSaved(false);
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
  const globalPct =
    limits.globalDailySendCap > 0
      ? Math.round((stats.todayGlobalSent / limits.globalDailySendCap) * 100)
      : 0;
  const intervalOk =
    stats.msSinceLastSend == null || stats.msSinceLastSend >= limits.minIntervalMs;

  return (
    <div className="space-y-8">
      {/* Bandeau statut */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-violet-50/50 p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-lg font-semibold sm:text-xl">
                  Surveillance temps réel
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live · 30 s
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Mode{" "}
                <span className="font-medium text-foreground">
                  {MODE_LABELS[limits.wasenderPlanMode] ?? limits.wasenderPlanMode}
                </span>
                {" · "}
                Intervalle min. {formatInterval(limits.minIntervalMs)}
                {" · "}
                Dernière sync {lastRefresh.toLocaleTimeString("fr-FR")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "px-3 py-1",
                form.enforcementEnabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {form.enforcementEnabled ? (
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Shield className="mr-1.5 h-3.5 w-3.5" />
              )}
              {form.enforcementEnabled ? "Protection active" : "Protection désactivée"}
            </Badge>
            <Badge variant="outline" className="bg-white/80">
              {globalPct}% du quota journalier
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Envoyés aujourd'hui"
          value={stats.todayGlobalSent}
          variant="blue"
          icon={<Gauge className="h-5 w-5" />}
          hint={`Plafond ${limits.globalDailySendCap.toLocaleString("fr-FR")}`}
        />
        <StatCard
          title="Dernière minute"
          value={`${stats.lastMinuteSent}/${limits.maxSendsPerMinute}`}
          variant="emerald"
          icon={<Timer className="h-5 w-5" />}
          hint={`${stats.lastHourSent} dans la dernière heure`}
        />
        <StatCard
          title="File d'attente"
          value={stats.queuedNow}
          variant="violet"
          icon={<Inbox className="h-5 w-5" />}
          hint={`${stats.sendingNow} en cours d'envoi`}
        />
        <StatCard
          title="Échecs rate limit"
          value={stats.rateLimitFailures}
          variant="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
          hint="Sur les 200 derniers échecs"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Utilisation */}
        <Card className="border-border/60 shadow-sm xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Gauge className="h-5 w-5 text-primary" />
              Utilisation vs limites
            </CardTitle>
            <CardDescription>Numéro partagé — protection compte Meta recommandée</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UsageBar
              label="Quota journalier global"
              value={stats.todayGlobalSent}
              max={limits.globalDailySendCap}
              hint="Tous exposants confondus"
            />
            <UsageBar
              label="Débit dernière minute"
              value={stats.lastMinuteSent}
              max={limits.maxSendsPerMinute}
              hint="Fenêtre glissante 60 s"
            />
            <UsageBar
              label="Envois simultanés"
              value={stats.sendingNow}
              max={limits.maxConcurrentSends}
              hint="Sessions en cours"
            />

            {stats.msSinceLastSend != null && (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                  intervalOk
                    ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-900"
                    : "border-amber-200/80 bg-amber-50/50 text-amber-900"
                )}
              >
                {intervalOk ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="font-medium">Dernier envoi partagé</p>
                  <p className="text-xs opacity-80">
                    Il y a {Math.round(stats.msSinceLastSend / 1000)} s
                    {!intervalOk && ` — intervalle min. ${formatInterval(limits.minIntervalMs)} non respecté`}
                  </p>
                </div>
              </div>
            )}

            {limits.lastRateLimitRemaining != null && limits.lastRateLimitLimit != null && (
              <div className="rounded-xl border border-border/50 bg-slate-50/80 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Headers API (dernier envoi)</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    Restant :{" "}
                    <strong className="text-foreground">
                      {limits.lastRateLimitRemaining} / {limits.lastRateLimitLimit}
                    </strong>
                  </span>
                  {limits.lastRateLimitResetAt && (
                    <span>Reset {formatDate(limits.lastRateLimitResetAt)}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="border-border/60 shadow-sm xl:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Configuration des limites
                </CardTitle>
                <CardDescription className="mt-1">
                  Presets alignés sur la{" "}
                  <a
                    href={META_WHATSAPP_RATE_LIMITS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    documentation Meta
                  </a>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(WASENDER_RATE_PRESETS) as Array<keyof typeof WASENDER_RATE_PRESETS>).map(
                (key) => {
                  const Icon = PRESET_ICONS[key];
                  const selected = form.wasenderPlanMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                          : "border-border/60 bg-white hover:border-primary/30 hover:bg-accent/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-sm font-semibold">
                        {WASENDER_RATE_PRESETS[key].label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatInterval(WASENDER_RATE_PRESETS[key].minIntervalMs)} ·{" "}
                        {WASENDER_RATE_PRESETS[key].maxSendsPerMinute}/min
                      </p>
                    </button>
                  );
                }
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paramètres avancés
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minIntervalMs" className="text-xs">
                    Intervalle min.
                  </Label>
                  <Input
                    id="minIntervalMs"
                    type="number"
                    min={0}
                    className="bg-white"
                    value={form.minIntervalMs}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        wasenderPlanMode: "CUSTOM",
                        minIntervalMs: Number(e.target.value),
                      }))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">Millisecondes</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxSendsPerMinute" className="text-xs">
                    Max / minute
                  </Label>
                  <Input
                    id="maxSendsPerMinute"
                    type="number"
                    min={1}
                    className="bg-white"
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
                  <Label htmlFor="maxConcurrentSends" className="text-xs">
                    Concurrence (1–5)
                  </Label>
                  <Input
                    id="maxConcurrentSends"
                    type="number"
                    min={1}
                    max={5}
                    className="bg-white"
                    value={form.maxConcurrentSends}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxConcurrentSends: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="globalDailySendCap" className="text-xs">
                    Plafond global / jour
                  </Label>
                  <Input
                    id="globalDailySendCap"
                    type="number"
                    min={1}
                    className="bg-white"
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
                  <Label htmlFor="tenantDailySendCap" className="text-xs">
                    Plafond / exposant / jour
                  </Label>
                  <Input
                    id="tenantDailySendCap"
                    type="number"
                    min={1}
                    className="bg-white"
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
                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-white px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.enforcementEnabled}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, enforcementEnabled: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium">Appliquer à l&apos;envoi</span>
                  </label>
                </div>
              </div>
            </div>

            {(error || saved) && (
              <div
                className={cn(
                  "rounded-lg px-4 py-3 text-sm",
                  error
                    ? "border border-destructive/20 bg-destructive/5 text-destructive"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                )}
              >
                {error ?? "Configuration enregistrée avec succès."}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={save} disabled={saving} className="shadow-md shadow-primary/20">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement…" : "Enregistrer la configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableaux */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Par exposant
            </CardTitle>
            <CardDescription>Envois aujourd&apos;hui · plafond {limits.tenantDailySendCap}/jour</CardDescription>
          </CardHeader>
          <CardContent>
            {data.tenantBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <Send className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Aucun envoi aujourd&apos;hui
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.tenantBreakdown.map((row, i) => {
                  const pct = Math.min(
                    100,
                    Math.round((row.sentToday / limits.tenantDailySendCap) * 100)
                  );
                  const plan = row.tenant?.planTier ?? "FREE";
                  return (
                    <div
                      key={row.tenant?.slug ?? i}
                      className="rounded-xl border border-border/50 p-3 transition-colors hover:bg-accent/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.tenant?.name ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            /{row.tenant?.slug}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              PLAN_STYLES[plan] ?? PLAN_STYLES.FREE
                            )}
                          >
                            {plan}
                          </span>
                          <span className="font-heading text-lg font-bold tabular-nums">
                            {row.sentToday}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", usageTone(pct).bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Derniers envois
            </CardTitle>
            <CardDescription>
              {stats.lastHourSent} message{stats.lastHourSent > 1 ? "s" : ""} dans la dernière heure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentSends.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">Aucun envoi récent</p>
              </div>
            ) : (
              <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {data.recentSends.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-accent/20"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Send className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {job.lead.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job.tenant.name} · {job.lead.whatsappNumber}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-[11px] text-muted-foreground">
                      {job.sentAt ? formatDate(job.sentAt) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
