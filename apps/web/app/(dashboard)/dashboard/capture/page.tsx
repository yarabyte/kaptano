"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { queueLeadOffline, syncPendingLeads, getPendingCount } from "@/lib/offline/db";
import { Badge } from "@/components/ui/badge";

export default function AgentCapturePage() {
  const [successCount, setSuccessCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    syncPendingLeads().then(() => refreshPending());
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
    setSubmitError(null);
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
        setSuccessCount((c) => c + 1);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!navigator.onLine || res.status >= 500) {
        await queueLeadOffline(payload);
        await refreshPending();
        setSuccessCount((c) => c + 1);
        return;
      }

      setSubmitError(data.error ?? "Enregistrement impossible");
    } catch {
      await queueLeadOffline(payload);
      await refreshPending();
      setSuccessCount((c) => c + 1);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capture agent</h1>
          <p className="text-muted-foreground">Saisie rapide sur tablette</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="success">{successCount} capturé(s)</Badge>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} en attente sync</Badge>
          )}
        </div>
      </div>
      {submitError && (
        <p className="rounded-lg border border-destructive/20 bg-red-50 p-3 text-sm text-destructive">
          {submitError}
        </p>
      )}
      <LeadCaptureForm onSubmit={handleSubmit} resetAfterSubmit />
    </div>
  );
}
