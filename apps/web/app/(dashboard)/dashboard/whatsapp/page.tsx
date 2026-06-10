"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  RefreshCw,
  Upload,
  Wifi,
  WifiOff,
  MessageSquare,
  ImageIcon,
  FileText,
  ListChecks,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
  Eye,
  XCircle,
  Clock,
  Share2,
} from "lucide-react";
import {
  getDefaultMessageConfig,
  type WhatsappMessageType,
  type WhatsappMessageConfig,
  type DocumentMessageConfig,
} from "@kaptano/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading";
import { cn } from "@/lib/utils";

type Session = { status: string; phoneNumber: string | null };
type WhatsappMode = "shared" | "own";
type Settings = {
  messageType: WhatsappMessageType;
  messageConfig: WhatsappMessageConfig;
};
type DefaultCatalog = { id: string; name: string; createdAt: string };
type Stand = { id: string; name: string };

type SendStats = {
  today: { sent: number; delivered: number; read: number; failed: number; total: number };
  allTime: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    total: number;
    catalogClicks: number;
  };
  remainingToday: number;
};

type BatchProgress = {
  batchId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  total: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progress: number;
};

type PollResultView = {
  id: string;
  leadName: string;
  leadPhone: string;
  sentAt: string | null;
  hasVotes: boolean;
  question: string;
  multiSelect: boolean;
  options: Array<{
    name: string;
    count: number;
    voters: Array<{ jid: string; phone: string | null; name: string }>;
  }>;
  totalVoters: number;
  updatedAt: string | null;
};

const MESSAGE_TYPES = [
  { type: "TEXT" as const, label: "Texte", icon: MessageSquare, accent: "text-blue-600 bg-blue-50 border-blue-200" },
  { type: "IMAGE" as const, label: "Image", icon: ImageIcon, accent: "text-violet-600 bg-violet-50 border-violet-200" },
  { type: "DOCUMENT" as const, label: "Document", icon: FileText, accent: "text-amber-600 bg-amber-50 border-amber-200" },
  { type: "POLL" as const, label: "Sondage", icon: ListChecks, accent: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

const SESSION_STATUS: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  CONNECTED: { label: "Connecté", variant: "success" },
  PENDING: { label: "En attente", variant: "secondary" },
  DISCONNECTED: { label: "Déconnecté", variant: "destructive" },
  EXPIRED: { label: "Expiré", variant: "destructive" },
};

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function WhatsappPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<SendStats | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [standFilter, setStandFilter] = useState("");
  const [eligible, setEligible] = useState(0);
  const [totalWithOptIn, setTotalWithOptIn] = useState(0);
  const [alreadyContacted, setAlreadyContacted] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [defaultCatalog, setDefaultCatalog] = useState<DefaultCatalog | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("Catalogue");
  const [uploading, setUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [whatsappMode, setWhatsappMode] = useState<WhatsappMode>("own");
  const [effectivePlanTier, setEffectivePlanTier] = useState<string>("FREE");
  const [activeTab, setActiveTab] = useState<"connection" | "format">("format");
  const [polls, setPolls] = useState<PollResultView[]>([]);

  const isSharedMode = whatsappMode === "shared";
  const connected = session?.status === "CONNECTED";
  const status = session?.status ? SESSION_STATUS[session.status] : null;

  const loadPreview = useCallback(async (standId?: string) => {
    const qs = standId ? `?standId=${standId}` : "";
    const res = await fetch(`/api/whatsapp/dispatch/preview${qs}`);
    if (res.ok) {
      const data = (await res.json()) as {
        eligible: number;
        totalWithOptIn?: number;
        alreadyContacted?: number;
      };
      setEligible(data.eligible);
      setTotalWithOptIn(data.totalWithOptIn ?? 0);
      setAlreadyContacted(data.alreadyContacted ?? 0);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/whatsapp/stats");
    if (res.ok) setStats((await res.json()) as SendStats);
  }, []);

  const loadPolls = useCallback(async () => {
    const res = await fetch("/api/whatsapp/polls");
    if (res.ok) {
      const data = (await res.json()) as { polls: PollResultView[] };
      setPolls(data.polls ?? []);
    }
  }, []);

  async function load() {
    const [sessionRes, standsRes] = await Promise.all([
      fetch("/api/whatsapp/session"),
      fetch("/api/stands"),
    ]);
    const data = (await sessionRes.json()) as {
      session: Session | null;
      whatsappMode?: WhatsappMode;
      effectivePlanTier?: string;
      settings: Settings;
      defaultCatalog: DefaultCatalog | null;
    };
    const standsData = (await standsRes.json()) as { stands: Stand[] };

    const mode = data.whatsappMode ?? "own";
    setWhatsappMode(mode);
    setEffectivePlanTier(data.effectivePlanTier ?? "FREE");
    setSession(data.session);
    setSettings(data.settings);
    setActiveTab(mode === "shared" ? "format" : "connection");
    setDefaultCatalog(data.defaultCatalog);
    setStands(standsData.stands ?? []);
    setPageLoading(false);

    await Promise.all([loadPreview(), loadStats(), loadPolls()]);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadPreview(standFilter || undefined);
  }, [standFilter, loadPreview]);

  useEffect(() => {
    if (pageLoading) return;

    const refreshPolls = () => {
      void loadPolls();
    };

    refreshPolls();
    const id = setInterval(refreshPolls, 15_000);
    return () => clearInterval(id);
  }, [pageLoading, loadPolls]);

  useEffect(() => {
    if (!activeBatchId) return;

    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/whatsapp/dispatch/${activeBatchId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as BatchProgress;
      setBatchProgress(data);
      if (data.status !== "RUNNING") {
        await loadStats();
        await loadPreview(standFilter || undefined);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeBatchId, standFilter, loadPreview, loadStats]);

  async function connect() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/whatsapp/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
    });
    const data = (await res.json()) as { qrCode?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la connexion");
      setLoading(false);
      return;
    }
    if (data.qrCode) setQrCode(data.qrCode);
    setLoading(false);
    load();
  }

  function changeMessageType(type: WhatsappMessageType) {
    if (!settings) return;
    setSettings({ ...settings, messageType: type, messageConfig: getDefaultMessageConfig(type) });
  }

  function updateConfig(patch: Partial<WhatsappMessageConfig>) {
    if (!settings) return;
    setSettings({ ...settings, messageConfig: { ...settings.messageConfig, ...patch } });
  }

  async function uploadDocument() {
    if (!documentFile || !settings) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", documentFile);
    formData.append("name", documentName.trim() || "Catalogue");
    formData.append("isDefault", "true");

    const res = await fetch("/api/catalogs", { method: "POST", body: formData });
    const data = (await res.json()) as { error?: string; catalog?: DefaultCatalog };
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Échec de l'upload");
      return;
    }
    setDocumentFile(null);
    setDefaultCatalog(data.catalog ?? null);
    setSettings({
      ...settings,
      messageType: "DOCUMENT",
      messageConfig: { ...settings.messageConfig, useCatalog: true },
    });
    setSaveMessage("Document chargé — enregistrez le format");
  }

  async function saveMessageConfig() {
    if (!settings) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);

    const payload =
      settings.messageType === "DOCUMENT"
        ? { ...settings, messageConfig: { ...settings.messageConfig, useCatalog: true } }
        : settings;

    const res = await fetch("/api/whatsapp/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; settings?: Settings };
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'enregistrement");
      return;
    }
    if (data.settings) setSettings(data.settings);
    setSaveMessage("Format de message enregistré");
  }

  async function startDispatch() {
    setDispatching(true);
    setError(null);
    setBatchProgress(null);

    try {
      const res = await fetch("/api/whatsapp/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(standFilter ? { standId: standFilter } : {}),
      });
      const data = (await res.json()) as {
        batchId?: string;
        error?: string;
        sent?: number;
        failed?: number;
      };

      if (!res.ok || !data.batchId) {
        setError(data.error ?? "Impossible de lancer l'envoi");
        return;
      }

      if (data.failed && data.failed > 0 && !data.sent) {
        setError("L'envoi a échoué pour tous les leads. Vérifiez WhatsApp et le format du message.");
      }

      setActiveBatchId(data.batchId);
      await Promise.all([loadStats(), loadPreview(standFilter || undefined), loadPolls()]);
    } catch {
      setError("Erreur réseau lors du lancement de l'envoi");
    } finally {
      setDispatching(false);
    }
  }

  const pollOptions =
    settings?.messageType === "POLL" && "options" in settings.messageConfig
      ? settings.messageConfig.options
      : [];

  const docConfig =
    settings?.messageType === "DOCUMENT"
      ? (settings.messageConfig as DocumentMessageConfig)
      : null;

  const isSending = batchProgress?.status === "RUNNING";

  if (pageLoading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="section-label mb-3">Messagerie</span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-muted-foreground">
          {isSharedMode
            ? "Configurez le format de vos messages et lancez l'envoi via le numéro WhatsApp Kaptano."
            : "Connectez votre numéro, choisissez le format et lancez l'envoi manuellement."}
        </p>
      </div>

      {(error || saveMessage) && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-200/80 bg-emerald-50 text-emerald-800"
          )}
        >
          {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{error ?? saveMessage}</p>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Send} label="Envoyés aujourd'hui" value={stats.today.sent} color="text-primary" />
          <StatCard icon={CheckCircle2} label="Livrés" value={stats.today.delivered} color="text-emerald-600" />
          <StatCard icon={Eye} label="Lus" value={stats.today.read} color="text-blue-600" />
          <StatCard icon={XCircle} label="Échecs" value={stats.today.failed} color="text-destructive" />
        </div>
      )}

      {/* Envoi manuel */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg">Envoi manuel</CardTitle>
              <CardDescription>
                Relancez l&apos;envoi du catalogue pour les leads pas encore contactés
                {stats ? ` · ${stats.remainingToday} envois restants aujourd'hui` : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryPill
              label="Leads enregistrés"
              value={totalWithOptIn}
              hint="Avec consentement WhatsApp"
            />
            <SummaryPill
              label="Déjà contactés"
              value={alreadyContacted}
              hint="Message envoyé à la capture ou via campagne"
              accent="emerald"
            />
            <SummaryPill
              label="En attente d'envoi"
              value={eligible}
              hint="Éligibles à un envoi manuel"
              accent="primary"
            />
          </div>

          {totalWithOptIn > 0 && eligible === 0 && (
            <p className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
              Vos leads ont déjà reçu un message WhatsApp (remerciement automatique à la
              capture). L&apos;envoi manuel sert à relancer ceux qui n&apos;ont pas encore été
              contactés.
            </p>
          )}

          {totalWithOptIn === 0 && (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Aucun lead avec opt-in pour le moment. Capturez des visiteurs depuis la page{" "}
              <Link href="/dashboard/capture" className="font-medium text-primary underline-offset-2 hover:underline">
                Capture agent
              </Link>{" "}
              ou via le QR code de vos stands.
            </p>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {stands.length > 0 && (
              <div className="flex-1 space-y-2">
                <Label htmlFor="standFilter">Filtrer par stand</Label>
                <select
                  id="standFilter"
                  value={standFilter}
                  onChange={(e) => setStandFilter(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={isSending}
                >
                  <option value="">Tous les stands</option>
                  {stands.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={startDispatch}
              disabled={!connected || dispatching || isSending || eligible === 0}
              className="h-11 px-8 sm:shrink-0"
              size="lg"
            >
              <Send className="mr-2 h-4 w-4" />
              {dispatching ? "Lancement…" : isSending ? "Envoi en cours…" : `Envoyer à ${eligible} lead${eligible !== 1 ? "s" : ""}`}
            </Button>
          </div>

          {!connected && (
            <p className="text-sm text-amber-700">
              {isSharedMode
                ? "Le numéro WhatsApp partagé Kaptano n'est pas disponible. Contactez le support ou passez au plan Growth."
                : "Connectez WhatsApp avant de lancer un envoi."}
            </p>
          )}

          {batchProgress && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {batchProgress.status === "RUNNING"
                    ? "Progression de l'envoi"
                    : batchProgress.status === "COMPLETED"
                      ? "Envoi terminé"
                      : "Envoi terminé avec erreurs"}
                </span>
                <span className="text-muted-foreground">
                  {batchProgress.progress}% · {batchProgress.sent + batchProgress.delivered + batchProgress.read + batchProgress.failed}/{batchProgress.total}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="flex h-full transition-all duration-500">
                  <div
                    className="bg-primary transition-all"
                    style={{ width: `${(batchProgress.sent / batchProgress.total) * 100}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(batchProgress.delivered / batchProgress.total) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(batchProgress.read / batchProgress.total) * 100}%` }}
                  />
                  <div
                    className="bg-destructive transition-all"
                    style={{ width: `${(batchProgress.failed / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <ProgressChip label="En attente" count={batchProgress.queued + batchProgress.sending} color="bg-muted text-muted-foreground" />
                <ProgressChip label="Envoyés" count={batchProgress.sent} color="bg-primary/10 text-primary" />
                <ProgressChip label="Livrés" count={batchProgress.delivered} color="bg-emerald-50 text-emerald-700" />
                <ProgressChip label="Lus" count={batchProgress.read} color="bg-blue-50 text-blue-700" />
                <ProgressChip label="Échecs" count={batchProgress.failed} color="bg-destructive/10 text-destructive" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-lg">Configuration</CardTitle>
              <CardDescription>Connexion WhatsApp et format des messages</CardDescription>
            </div>
            {activeTab === "connection" && (
              <Badge variant={status?.variant ?? "secondary"} className="w-fit">
                {status?.label ?? "Non configuré"}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
            <TabButton
              active={activeTab === "connection"}
              onClick={() => setActiveTab("connection")}
              icon={isSharedMode ? Share2 : MessageCircle}
              label={isSharedMode ? "Numéro partagé" : "Connexion"}
            />
            <TabButton
              active={activeTab === "format"}
              onClick={() => setActiveTab("format")}
              icon={MessageSquare}
              label="Format du message"
              disabled={!settings}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === "connection" && isSharedMode && (
            <div className="mx-auto max-w-lg space-y-5">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <p>
                  Votre plan <strong className="text-foreground">{effectivePlanTier}</strong> utilise
                  le numéro WhatsApp partagé de Kaptano. Vous n&apos;avez pas besoin de connecter
                  votre propre numéro.
                </p>
              </div>

              <div
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4",
                  connected
                    ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white"
                    : "border-border/60 bg-gradient-to-br from-slate-50 to-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    connected ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
                  )}
                >
                  <Share2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {session?.phoneNumber ?? "Numéro Kaptano"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {connected ? (
                      <>
                        <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                        Numéro partagé opérationnel
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3.5 w-3.5" />
                        Numéro partagé indisponible — contactez le support
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">Besoin de votre propre numéro ?</p>
                <p className="mt-1 text-muted-foreground">
                  Passez au plan Growth ou Scale pour connecter et utiliser votre numéro WhatsApp
                  professionnel.
                </p>
                <Link href="/dashboard/billing" className="mt-3 inline-block">
                  <Button variant="outline" size="sm">
                    Voir les plans
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === "connection" && !isSharedMode && (
            <div className="mx-auto max-w-md space-y-5">
              <div
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4",
                  connected
                    ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white"
                    : "border-border/60 bg-gradient-to-br from-slate-50 to-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    connected ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
                  )}
                >
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{session?.phoneNumber ?? "Aucun numéro"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {connected ? (
                      <>
                        <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                        Prêt à envoyer
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3.5 w-3.5" />
                        Non connecté
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Numéro WhatsApp</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+237 6 70 00 00 00"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              {qrCode && (
                <div className="rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/50 p-5 text-center">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Scanner avec WhatsApp
                  </p>
                  <img
                    src={qrCode}
                    alt="QR WhatsApp"
                    className="mx-auto max-w-[200px] rounded-lg border bg-white p-2 shadow-sm"
                  />
                </div>
              )}

              <Button
                onClick={connect}
                disabled={loading || !phoneNumber.trim()}
                className="h-11 w-full"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                {connected ? "Reconnecter" : "Générer le QR code"}
              </Button>
            </div>
          )}

          {activeTab === "format" && settings && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {MESSAGE_TYPES.map(({ type, label, icon: Icon, accent }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeMessageType(type)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      settings.messageType === type
                        ? cn("border-primary/40 ring-1 ring-primary/20 shadow-sm", accent)
                        : "border-border/60 hover:bg-muted/40"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                {["{prenom}", "{entreprise}", "{lien}"].map((v) => (
                  <code
                    key={v}
                    className="rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-xs"
                  >
                    {v}
                  </code>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                {settings.messageType === "TEXT" && "text" in settings.messageConfig && (
                  <textarea
                    id="textMessage"
                    rows={4}
                    className={textareaClass}
                    value={settings.messageConfig.text ?? ""}
                    onChange={(e) => updateConfig({ text: e.target.value })}
                  />
                )}

                {settings.messageType === "IMAGE" && "imageUrl" in settings.messageConfig && (
                  <div className="space-y-3">
                    <Input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={settings.messageConfig.imageUrl}
                      onChange={(e) => updateConfig({ imageUrl: e.target.value })}
                    />
                    <Input
                      placeholder="Légende (optionnel)"
                      value={settings.messageConfig.text ?? ""}
                      onChange={(e) => updateConfig({ text: e.target.value })}
                    />
                  </div>
                )}

                {docConfig && (
                  <div className="space-y-4">
                    {defaultCatalog ? (
                      <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">{defaultCatalog.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700">Aucun PDF chargé</p>
                    )}
                    <div className="space-y-3 rounded-xl border-2 border-dashed p-4">
                      <Input
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Nom du document"
                      />
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={uploadDocument}
                        disabled={uploading || !documentFile}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Chargement…" : "Charger le PDF"}
                      </Button>
                    </div>
                  </div>
                )}

                {settings.messageType === "POLL" && "question" in settings.messageConfig && (
                  <div className="space-y-3">
                    <Input
                      value={settings.messageConfig.question}
                      onChange={(e) => updateConfig({ question: e.target.value })}
                      placeholder="Question du sondage"
                    />
                    <textarea
                      rows={4}
                      className={textareaClass}
                      value={pollOptions.join("\n")}
                      onChange={(e) =>
                        updateConfig({
                          options: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder={"Option 1\nOption 2"}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="multiSelect"
                        checked={settings.messageConfig.multiSelect ?? false}
                        onCheckedChange={(c) => updateConfig({ multiSelect: c === true })}
                      />
                      <Label htmlFor="multiSelect" className="font-normal">
                        Réponses multiples
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={saveMessageConfig} disabled={saving} variant="outline">
                {saving ? "Enregistrement…" : "Enregistrer le format"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(polls.length > 0 || settings?.messageType === "POLL") && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-heading flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5 text-emerald-600" />
                  Résultats des sondages
                </CardTitle>
                <CardDescription>
                  Mis à jour automatiquement quand un visiteur vote sur WhatsApp
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadPolls}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {polls.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun vote reçu pour le moment. Les résultats apparaîtront ici dès qu&apos;un
                visiteur répondra au sondage.
              </p>
            ) : (
              polls.map((poll) => {
                const maxVotes = Math.max(...poll.options.map((o) => o.count), 1);
                return (
                  <div key={poll.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{poll.question}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Envoyé à {poll.leadName} ·{" "}
                          {poll.totalVoters} vote{poll.totalVoters !== 1 ? "s" : ""}
                          {poll.updatedAt ? ` · MAJ ${new Date(poll.updatedAt).toLocaleString("fr-FR")}` : ""}
                        </p>
                      </div>
                      {!poll.hasVotes && (
                        <Badge variant="secondary">En attente de réponse</Badge>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      {poll.options.map((option) => (
                        <div key={option.name}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span>{option.name}</span>
                            <span className="font-medium tabular-nums">{option.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${(option.count / maxVotes) * 100}%` }}
                            />
                          </div>
                          {option.voters.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {option.voters.map((v) => v.name).join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {stats && stats.allTime.total > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Historique global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 text-center">
              <div><p className="text-2xl font-bold">{stats.allTime.total}</p><p className="text-xs text-muted-foreground">Total envoyés</p></div>
              <div><p className="text-2xl font-bold text-emerald-600">{stats.allTime.delivered}</p><p className="text-xs text-muted-foreground">Livrés</p></div>
              <div><p className="text-2xl font-bold text-blue-600">{stats.allTime.read}</p><p className="text-xs text-muted-foreground">Lus</p></div>
              <div><p className="text-2xl font-bold text-destructive">{stats.allTime.failed}</p><p className="text-xs text-muted-foreground">Échecs</p></div>
              <div><p className="text-2xl font-bold text-primary">{stats.allTime.catalogClicks}</p><p className="text-xs text-muted-foreground">Clics catalogue</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Send;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressChip({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span className={cn("rounded-full px-2.5 py-1 font-medium", color)}>
      {label} : {count}
    </span>
  );
}

function SummaryPill({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "default" | "emerald" | "primary";
}) {
  const valueClass =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "primary"
        ? "text-primary"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", valueClass)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageCircle;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
