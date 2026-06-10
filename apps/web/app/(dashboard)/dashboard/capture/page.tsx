"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  CheckCircle2,
  CloudOff,
  MessageCircle,
  UserPlus,
  Wifi,
} from "lucide-react";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { queueLeadOffline, syncPendingLeads, getPendingCount } from "@/lib/offline/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Feedback =
  | { type: "success"; whatsappSent: boolean; offline?: boolean }
  | { type: "error"; message: string };

export default function AgentCapturePage() {
  const [successCount, setSuccessCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    syncPendingLeads().then(() => refreshPending());
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      syncPendingLeads().then(() => refreshPending());
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function refreshPending() {
    setPendingCount(await getPendingCount());
  }

  async function handleSubmit(values: {
    fullName: string;
    whatsappNumber: string;
    email?: string;
    company?: string;
    interest?: string;
    optInConsent: boolean;
  }) {
    setFeedback(null);
    const clientUuid = uuidv4();
    const payload = {
      fullName: values.fullName,
      whatsappNumber: values.whatsappNumber,
      email: values.email,
      company: values.company,
      interest: values.interest,
      source: "AGENT" as const,
      optInConsent: true as const,
      clientUuid,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data?: { whatsappSent?: boolean };
        };
        setSuccessCount((c) => c + 1);
        setFeedback({
          type: "success",
          whatsappSent: data.data?.whatsappSent === true,
        });
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!navigator.onLine || res.status >= 500) {
        await queueLeadOffline(payload);
        await refreshPending();
        setSuccessCount((c) => c + 1);
        setFeedback({ type: "success", whatsappSent: false, offline: true });
        return;
      }

      setFeedback({ type: "error", message: data.error ?? "Enregistrement impossible" });
    } catch {
      await queueLeadOffline(payload);
      await refreshPending();
      setSuccessCount((c) => c + 1);
      setFeedback({ type: "success", whatsappSent: false, offline: true });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Capture agent"
        description="Saisie rapide sur tablette ou mobile en salon"
      >
        <Badge
          variant={online ? "success" : "secondary"}
          className="h-8 gap-1.5 px-3"
        >
          {online ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              En ligne
            </>
          ) : (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              Hors ligne
            </>
          )}
        </Badge>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-950">{successCount}</p>
              <p className="text-xs font-medium text-muted-foreground">Capturés cette session</p>
            </div>
          </CardContent>
        </Card>

        {pendingCount > 0 && (
          <Card className="border-amber-100 bg-gradient-to-br from-amber-50/80 to-white">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <CloudOff className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-950">{pendingCount}</p>
                <p className="text-xs font-medium text-muted-foreground">En attente de sync</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {feedback?.type === "success" && (
        <div
          className={cn(
            "flex gap-3 rounded-xl border p-4 text-sm",
            feedback.offline
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          )}
        >
          <CheckCircle2
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              feedback.offline ? "text-amber-600" : "text-emerald-600"
            )}
          />
          <div>
            <p className="font-medium">Lead enregistré avec succès</p>
            {feedback.offline ? (
              <p className="mt-1 text-emerald-900/80">
                Sauvegardé localement — synchronisation dès que la connexion revient.
              </p>
            ) : feedback.whatsappSent ? (
              <p className="mt-1 flex items-center gap-1.5 text-emerald-900/80">
                <MessageCircle className="h-4 w-4" />
                Message de remerciement envoyé par WhatsApp.
              </p>
            ) : (
              <p className="mt-1 text-emerald-900/80">
                Le message WhatsApp n&apos;a pas pu être envoyé (vérifiez la connexion WhatsApp).
              </p>
            )}
          </div>
        </div>
      )}

      {feedback?.type === "error" && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {feedback.message}
        </p>
      )}

      <LeadCaptureForm
        onSubmit={handleSubmit}
        resetAfterSubmit
        variant="agent"
      />
    </div>
  );
}
