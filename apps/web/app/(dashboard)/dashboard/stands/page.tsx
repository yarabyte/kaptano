"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, ExternalLink, Pencil, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/dashboard/page-loading";

type Stand = {
  id: string;
  name: string;
  qrToken: string;
  active: boolean;
  catalogId: string | null;
  eventId: string | null;
  event: { name: string } | null;
  catalog: { name: string } | null;
  _count: { leads: number };
};

type Catalog = { id: string; name: string };
type Event = { id: string; name: string };
type StandQuota = {
  effectiveTier: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  isAtLimit: boolean;
};

export default function StandsPage() {
  const [stands, setStands] = useState<Stand[]>([]);
  const [standQuota, setStandQuota] = useState<StandQuota | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", catalogId: "", eventId: "", active: true });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  async function loadStands() {
    setInitialLoading(true);
    try {
      const [standsRes, catalogsRes, eventsRes] = await Promise.all([
        fetch("/api/stands"),
        fetch("/api/catalogs"),
        fetch("/api/events"),
      ]);
      const standsData = (await standsRes.json()) as {
        stands: Stand[];
        standQuota?: StandQuota;
      };
      const catalogsData = (await catalogsRes.json()) as { catalogs: Catalog[] };
      const eventsData = (await eventsRes.json()) as { events: Event[] };

      const nextStands = standsData.stands ?? [];
      setStands(nextStands);
      setStandQuota(standsData.standQuota ?? null);
      setCatalogs(catalogsData.catalogs ?? []);
      setEvents(eventsData.events ?? []);

      const { default: QRCode } = await import("qrcode");
      const qrEntries = await Promise.all(
        nextStands.map(async (stand) => {
          const url = `${appUrl}/c/${stand.qrToken}`;
          const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
          return [stand.id, qr] as const;
        })
      );
      setQrImages(Object.fromEntries(qrEntries));
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadStands();
  }, []);

  async function createStand(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { error?: string };

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de créer le stand");
      return;
    }

    setName("");
    loadStands();
  }

  const atStandLimit = standQuota?.isAtLimit ?? false;

  function startEdit(stand: Stand) {
    setEditingId(stand.id);
    setEditForm({
      name: stand.name,
      catalogId: stand.catalogId ?? "",
      eventId: stand.eventId ?? "",
      active: stand.active,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch(`/api/stands/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        catalogId: editForm.catalogId || null,
        eventId: editForm.eventId || null,
        active: editForm.active,
      }),
    });
    setEditingId(null);
    loadStands();
  }

  async function handleDownloadPdf(stand: Stand) {
    setDownloadingId(stand.id);
    try {
      const { downloadStandQrPdf } = await import("@/lib/stands/qr-pdf");
      await downloadStandQrPdf({
        standName: stand.name,
        eventName: stand.event?.name,
        captureUrl: `${appUrl}/c/${stand.qrToken}`,
      });
    } finally {
      setDownloadingId(null);
    }
  }

  if (initialLoading) {
    return <PageSpinner label="Chargement des stands…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Stands</h1>
        <p className="text-muted-foreground">
          Gérez vos stands et QR codes de capture
          {standQuota?.limit !== null && standQuota?.limit !== undefined && (
            <span className="ml-1">
              · {standQuota.used}/{standQuota.limit} stand{standQuota.limit > 1 ? "s" : ""} (plan {standQuota.effectiveTier})
            </span>
          )}
        </p>
      </div>

      {atStandLimit && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              Votre plan {standQuota?.effectiveTier} est limité à {standQuota?.limit} stand.
              Passez au plan Growth pour créer plusieurs QR codes.
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              Voir les plans
            </Button>
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nouveau stand</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createStand} className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="standName">Nom du stand</Label>
              <Input
                id="standName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={atStandLimit}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || atStandLimit}>
                <Plus className="mr-2 h-4 w-4" />
                Créer
              </Button>
            </div>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stands.map((stand) => (
          <Card key={stand.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              {editingId === stand.id ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              ) : (
                <CardTitle className="text-lg">{stand.name}</CardTitle>
              )}
              <Badge variant={stand.active ? "success" : "secondary"}>
                {stand.active ? "Actif" : "Inactif"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrImages[stand.id] && (
                <img src={qrImages[stand.id]} alt={`QR ${stand.name}`} className="mx-auto rounded-lg border" />
              )}
              {editingId === stand.id ? (
                <div className="space-y-3">
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editForm.eventId}
                    onChange={(e) => setEditForm({ ...editForm, eventId: e.target.value })}
                  >
                    <option value="">Aucun événement</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editForm.catalogId}
                    onChange={(e) => setEditForm({ ...editForm, catalogId: e.target.value })}
                  >
                    <option value="">Catalogue par défaut</option>
                    {catalogs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    />
                    Stand actif
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    {stand._count.leads} lead{stand._count.leads !== 1 ? "s" : ""}
                    {stand.event && ` · ${stand.event.name}`}
                    {stand.catalog && ` · ${stand.catalog.name}`}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={downloadingId === stand.id}
                      onClick={() => handleDownloadPdf(stand)}
                    >
                      {downloadingId === stand.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Télécharger le QR (PDF)
                    </Button>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => startEdit(stand)} className="flex items-center gap-1 text-sm text-primary hover:underline">
                        <Pencil className="h-3 w-3" /> Modifier
                      </button>
                      <a
                        href={`${appUrl}/c/${stand.qrToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Ouvrir
                      </a>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
