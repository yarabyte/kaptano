"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  MessageSquare,
  ListChecks,
  Send,
  CheckCircle2,
  AlertCircle,
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
} from "@kaptano/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading";
import {
  WhatsappMessageFormatEditor,
  getMessagePreview,
  getMessageTypeLabel,
  validateMessageSettings,
} from "@/components/dashboard/whatsapp-message-format-editor";
import {
  WhatsappStepIndicator,
  type WizardStep,
} from "@/components/dashboard/whatsapp-step-indicator";
import { uploadFormDataWithProgress } from "@/lib/upload-with-progress";
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

const SESSION_STATUS: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  CONNECTED: { label: "Connecté", variant: "success" },
  PENDING: { label: "En attente", variant: "secondary" },
  DISCONNECTED: { label: "Déconnecté", variant: "destructive" },
  EXPIRED: { label: "Expiré", variant: "destructive" },
};

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
  const [documentName, setDocumentName] = useState("Catalogue");
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadProgress, setDocumentUploadProgress] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [whatsappMode, setWhatsappMode] = useState<WhatsappMode>("own");
  const [effectivePlanTier, setEffectivePlanTier] = useState<string>("FREE");
  const [polls, setPolls] = useState<PollResultView[]>([]);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [maxWizardStep, setMaxWizardStep] = useState<WizardStep>(1);
  const [connectionOpen, setConnectionOpen] = useState(false);

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
    if (
      data.settings.messageType === "IMAGE" &&
      "imageUrl" in data.settings.messageConfig
    ) {
      const imageUrl = data.settings.messageConfig.imageUrl;
      if (imageUrl && !imageUrl.includes("example.com")) {
        setImagePreviewUrl(imageUrl);
      }
    }
    setConnectionOpen(data.session?.status !== "CONNECTED");
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

  async function uploadDocumentFile(file: File, nameOverride?: string) {
    if (!settings) return;

    setDocumentUploading(true);
    setDocumentUploadProgress(0);
    setError(null);

    const uploadName =
      nameOverride?.trim() ||
      documentName.trim() ||
      file.name.replace(/\.pdf$/i, "") ||
      "Catalogue";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", uploadName);
    formData.append("isDefault", "true");

    try {
      const result = await uploadFormDataWithProgress<{
        error?: string;
        catalog?: DefaultCatalog;
      }>({
        url: "/api/catalogs",
        formData,
        onProgress: setDocumentUploadProgress,
      });

      if (!result.ok) {
        setError(result.data.error ?? "Échec de l'upload");
        return;
      }

      setDefaultCatalog(result.data.catalog ?? null);
      setSettings({
        ...settings,
        messageType: "DOCUMENT",
        messageConfig: { ...settings.messageConfig, useCatalog: true },
      });
      setSaveMessage("Document chargé");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setDocumentUploading(false);
      setDocumentUploadProgress(null);
    }
  }

  function handleDocumentFileSelect(file: File | null) {
    if (!file) return;
    const baseName = file.name.replace(/\.pdf$/i, "") || "Catalogue";
    const nextName =
      !documentName.trim() || documentName === "Catalogue" ? baseName : documentName;
    setDocumentName(nextName);
    void uploadDocumentFile(file, nextName);
  }

  async function uploadImageFile(file: File) {
    if (!settings) return;

    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setImageUploading(true);
    setImageUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadFormDataWithProgress<{
        error?: string;
        url?: string;
      }>({
        url: "/api/whatsapp/media",
        formData,
        onProgress: setImageUploadProgress,
      });

      if (!result.ok || !result.data.url) {
        setError(result.data.error ?? "Échec de l'upload image");
        URL.revokeObjectURL(localPreview);
        setImagePreviewUrl(null);
        return;
      }

      updateConfig({ imageUrl: result.data.url });
      setImagePreviewUrl(result.data.url);
      URL.revokeObjectURL(localPreview);
      setSaveMessage("Image chargée");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload image");
      URL.revokeObjectURL(localPreview);
      setImagePreviewUrl(null);
    } finally {
      setImageUploading(false);
      setImageUploadProgress(null);
    }
  }

  function handleImageFileSelect(file: File | null) {
    if (!file) return;
    void uploadImageFile(file);
  }

  async function saveMessageConfig(): Promise<boolean> {
    if (!settings) return false;
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
      return false;
    }
    if (data.settings) setSettings(data.settings);
    setSaveMessage("Format de message enregistré");
    return true;
  }

  function goToWizardStep(step: WizardStep) {
    if (step <= maxWizardStep) {
      setWizardStep(step);
      setError(null);
      setSaveMessage(null);
    }
  }

  function handleNextFromStep1() {
    setMaxWizardStep((current) => Math.max(current, 2) as WizardStep);
    setWizardStep(2);
    setError(null);
    setSaveMessage(null);
  }

  async function handleNextFromStep2() {
    if (!settings) return;
    if (documentUploading || imageUploading) {
      setError("Attendez la fin du chargement du fichier.");
      return;
    }
    const validationError = validateMessageSettings(
      settings.messageType,
      settings.messageConfig,
      defaultCatalog
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    const saved = await saveMessageConfig();
    if (!saved) return;
    setMaxWizardStep((current) => Math.max(current, 3) as WizardStep);
    setWizardStep(3);
  }

  function handleWizardBack() {
    if (wizardStep > 1) {
      setWizardStep((current) => (current - 1) as WizardStep);
      setError(null);
      setSaveMessage(null);
    }
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

  const isSending = batchProgress?.status === "RUNNING";
  const selectedStand = stands.find((stand) => stand.id === standFilter);
  const standLabel = selectedStand?.name ?? "Tous les stands";

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

      {/* Assistant campagne — 3 étapes */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white shadow-sm">
        <CardHeader className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg">Nouvelle campagne</CardTitle>
                <CardDescription>
                  Ciblez vos leads, configurez le message puis lancez l&apos;envoi
                  {stats ? ` · ${stats.remainingToday} envois restants aujourd'hui` : ""}
                </CardDescription>
              </div>
            </div>
            <Badge variant={status?.variant ?? "secondary"} className="w-fit shrink-0">
              {connected
                ? isSharedMode
                  ? "Numéro Kaptano connecté"
                  : "WhatsApp connecté"
                : (status?.label ?? "Non connecté")}
            </Badge>
          </div>
          <WhatsappStepIndicator
            currentStep={wizardStep}
            maxReached={maxWizardStep}
            onStepClick={goToWizardStep}
          />
        </CardHeader>

        <CardContent className="space-y-6">
          {wizardStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-semibold">Étape 1 — Filtrer par stand</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez les leads à cibler pour cette campagne.
                </p>
              </div>

              {stands.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="standFilter">Stand</Label>
                  <select
                    id="standFilter"
                    value={standFilter}
                    onChange={(e) => setStandFilter(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={isSending}
                  >
                    <option value="">Tous les stands</option>
                    {stands.map((stand) => (
                      <option key={stand.id} value={stand.id}>
                        {stand.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Aucun stand actif.{" "}
                  <Link href="/dashboard/stands" className="font-medium text-primary underline-offset-2 hover:underline">
                    Créez un stand
                  </Link>{" "}
                  pour filtrer par emplacement.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryPill
                  label="Leads enregistrés"
                  value={totalWithOptIn}
                  hint="Avec consentement WhatsApp"
                />
                <SummaryPill
                  label="Déjà contactés"
                  value={alreadyContacted}
                  hint="Au moins un message WhatsApp envoyé"
                  accent="emerald"
                />
                <SummaryPill
                  label="Éligibles campagne"
                  value={eligible}
                  hint="Moins de 3 messages WhatsApp envoyés aujourd'hui"
                  accent="primary"
                />
              </div>

              {totalWithOptIn > 0 && eligible === 0 && (
                <p className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
                  Tous vos leads ont atteint le plafond de 3 messages WhatsApp pour aujourd&apos;hui.
                  Réessayez demain ou capturez de nouveaux contacts.
                </p>
              )}

              {totalWithOptIn > 0 && eligible > 0 && (
                <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
                  Chaque lead peut recevoir jusqu&apos;à 3 messages par jour (remerciement +
                  campagnes). {eligible} lead{eligible !== 1 ? "s" : ""} encore éligible
                  {eligible !== 1 ? "s" : ""}.
                </p>
              )}

              {totalWithOptIn === 0 && (
                <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Aucun lead avec opt-in pour le moment. Capturez des visiteurs depuis{" "}
                  <Link href="/dashboard/capture" className="font-medium text-primary underline-offset-2 hover:underline">
                    Capture agent
                  </Link>{" "}
                  ou via le QR code de vos stands.
                </p>
              )}

              <div className="flex justify-end">
                <Button onClick={handleNextFromStep1} className="h-11 px-8">
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 2 && settings && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-semibold">Étape 2 — Format du message</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez le type de message et personnalisez le contenu envoyé aux leads.
                </p>
              </div>

              <WhatsappMessageFormatEditor
                messageType={settings.messageType}
                messageConfig={settings.messageConfig}
                defaultCatalog={defaultCatalog}
                documentName={documentName}
                documentUploading={documentUploading}
                documentUploadProgress={documentUploadProgress}
                imageUploading={imageUploading}
                imageUploadProgress={imageUploadProgress}
                imagePreviewUrl={imagePreviewUrl}
                onChangeType={changeMessageType}
                onUpdateConfig={updateConfig}
                onDocumentNameChange={setDocumentName}
                onDocumentFileSelect={handleDocumentFileSelect}
                onImageFileSelect={handleImageFileSelect}
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={handleWizardBack} className="h-11">
                  Retour
                </Button>
                <Button
                  onClick={() => void handleNextFromStep2()}
                  disabled={saving || documentUploading || imageUploading}
                  className="h-11 px-8"
                >
                  {saving ? "Enregistrement…" : "Continuer vers le récapitulatif"}
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && settings && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-semibold">Étape 3 — Récapitulatif et envoi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vérifiez les paramètres avant de lancer la campagne.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <RecapItem label="Stand ciblé" value={standLabel} />
                <RecapItem
                  label="Leads éligibles"
                  value={`${eligible} lead${eligible !== 1 ? "s" : ""}`}
                  highlight={eligible > 0}
                />
                <RecapItem
                  label="Type de message"
                  value={getMessageTypeLabel(settings.messageType)}
                />
                <RecapItem
                  label="Envois restants aujourd'hui"
                  value={stats ? String(stats.remainingToday) : "—"}
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aperçu du message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {getMessagePreview(
                    settings.messageType,
                    settings.messageConfig,
                    defaultCatalog
                  )}
                </p>
              </div>

              {!connected && (
                <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {isSharedMode
                    ? "Le numéro WhatsApp partagé Kaptano n'est pas disponible. Contactez le support ou passez au plan Growth."
                    : "Connectez WhatsApp avant de lancer un envoi (voir la section ci-dessous)."}
                </p>
              )}

              {eligible === 0 && (
                <p className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
                  Aucun lead éligible (plafond de 3 messages/lead/jour atteint pour ce filtre).
                  Modifiez le stand à l&apos;étape 1 ou réessayez demain.
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={handleWizardBack} className="h-11" disabled={isSending}>
                  Retour
                </Button>
                <Button
                  onClick={startDispatch}
                  disabled={!connected || dispatching || isSending || eligible === 0}
                  className="h-11 px-8"
                  size="lg"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {dispatching
                    ? "Lancement…"
                    : isSending
                      ? "Envoi en cours…"
                      : `Envoyer à ${eligible} lead${eligible !== 1 ? "s" : ""}`}
                </Button>
              </div>

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
                      {batchProgress.progress}% ·{" "}
                      {batchProgress.sent +
                        batchProgress.delivered +
                        batchProgress.read +
                        batchProgress.failed}
                      /{batchProgress.total}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full transition-all duration-500">
                      <div
                        className="bg-primary transition-all"
                        style={{
                          width: `${(batchProgress.sent / batchProgress.total) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{
                          width: `${(batchProgress.delivered / batchProgress.total) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-blue-500 transition-all"
                        style={{
                          width: `${(batchProgress.read / batchProgress.total) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-destructive transition-all"
                        style={{
                          width: `${(batchProgress.failed / batchProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <ProgressChip
                      label="En attente"
                      count={batchProgress.queued + batchProgress.sending}
                      color="bg-muted text-muted-foreground"
                    />
                    <ProgressChip
                      label="Envoyés"
                      count={batchProgress.sent}
                      color="bg-primary/10 text-primary"
                    />
                    <ProgressChip
                      label="Livrés"
                      count={batchProgress.delivered}
                      color="bg-emerald-50 text-emerald-700"
                    />
                    <ProgressChip
                      label="Lus"
                      count={batchProgress.read}
                      color="bg-blue-50 text-blue-700"
                    />
                    <ProgressChip
                      label="Échecs"
                      count={batchProgress.failed}
                      color="bg-destructive/10 text-destructive"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connexion WhatsApp (hors parcours) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-0">
          <button
            type="button"
            onClick={() => setConnectionOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <CardTitle className="font-heading text-lg">
                {isSharedMode ? "Numéro WhatsApp partagé" : "Connexion WhatsApp"}
              </CardTitle>
              <CardDescription>
                {isSharedMode
                  ? "Statut du numéro Kaptano utilisé pour vos envois"
                  : "Connectez votre numéro professionnel pour envoyer des messages"}
              </CardDescription>
            </div>
            <Badge variant={status?.variant ?? "secondary"} className="shrink-0">
              {status?.label ?? "Non configuré"}
            </Badge>
          </button>
        </CardHeader>

        {connectionOpen && (
        <CardContent className="pt-6">
          {isSharedMode && (
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

          {!isSharedMode && (
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
        </CardContent>
        )}
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

function RecapItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          highlight && "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}
