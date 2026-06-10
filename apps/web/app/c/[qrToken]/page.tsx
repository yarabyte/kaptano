"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { PageSpinner } from "@/components/dashboard/page-loading";
import { queueLeadOffline, syncPendingLeads } from "@/lib/offline/db";

type StandInfo = {
  id: string;
  name: string;
  tenant: { name: string };
};

async function submitLead(payload: ReturnType<typeof buildPayload>) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) return { ok: true as const };

  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };

  if (!navigator.onLine || res.status >= 500) {
    await queueLeadOffline(payload);
    return { ok: true as const, offline: true as const };
  }

  return {
    ok: false as const,
    error: data.error ?? "Enregistrement impossible",
    code: data.code,
  };
}

function buildPayload(
  qrToken: string,
  values: {
    fullName: string;
    whatsappNumber: string;
    email?: string;
    company?: string;
    interest?: string;
  },
  clientUuid: string
) {
  return {
    qrToken,
    fullName: values.fullName,
    whatsappNumber: values.whatsappNumber,
    email: values.email,
    company: values.company,
    interest: values.interest,
    source: "QR_SELF" as const,
    optInConsent: true as const,
    clientUuid,
  };
}

export default function PublicCapturePage({
  params,
}: {
  params: { qrToken: string };
}) {
  const [stand, setStand] = useState<StandInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stands/public/${params.qrToken}`)
      .then((r) => r.json())
      .then((data: { stand?: StandInfo }) => {
        if (data.stand) setStand(data.stand);
      })
      .finally(() => setLoading(false));

    syncPendingLeads();
  }, [params.qrToken]);

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
    const payload = buildPayload(params.qrToken, values, clientUuid);

    try {
      const result = await submitLead(payload);
      if (result.ok) {
        setOfflineQueued("offline" in result && result.offline === true);
        setSubmitted(true);
        return;
      }
      setSubmitError(result.error);
    } catch {
      await queueLeadOffline(payload);
      setOfflineQueued(true);
      setSubmitted(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/20">
        <PageSpinner label="Chargement du stand…" />
      </div>
    );
  }

  if (!stand) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-muted-foreground">Stand introuvable ou inactif.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/20 px-4">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Merci !</h1>
          <p className="mt-2 text-muted-foreground">
            {offlineQueued
              ? "Vos informations sont enregistrées et seront synchronisées dès que la connexion reviendra."
              : "Vos informations ont bien été enregistrées. Vous recevrez notre catalogue par WhatsApp."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent/20 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">{stand.tenant.name}</p>
          <h1 className="text-2xl font-bold">{stand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Laissez vos coordonnées pour recevoir notre catalogue
          </p>
        </div>
        {submitError && (
          <p className="mb-4 rounded-lg border border-destructive/20 bg-red-50 p-3 text-sm text-destructive">
            {submitError}
          </p>
        )}
        <LeadCaptureForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
