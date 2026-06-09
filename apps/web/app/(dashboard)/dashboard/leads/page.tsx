"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  Users,
  MessageCircle,
  QrCode,
  UserPlus,
  Filter,
  X,
  Building2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";

type Lead = {
  id: string;
  fullName: string;
  whatsappNumber: string;
  email: string | null;
  company: string | null;
  source: string;
  optInConsent: boolean;
  capturedAt: string;
  stand: { id: string; name: string } | null;
  messageJobs: Array<{ status: string; catalogClickedAt: string | null }>;
};

type Stand = { id: string; name: string };

const MESSAGE_STATUSES = ["", "NONE", "QUEUED", "SENT", "DELIVERED", "READ", "FAILED"] as const;

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  QUEUED: "secondary",
  SENDING: "secondary",
  SENT: "default",
  DELIVERED: "success",
  READ: "success",
  FAILED: "destructive",
};

const statusLabels: Record<string, string> = {
  QUEUED: "En file",
  SENDING: "Envoi…",
  SENT: "Envoyé",
  DELIVERED: "Délivré",
  READ: "Lu",
  FAILED: "Échec",
};

const sourceLabels: Record<string, string> = {
  QR_SELF: "QR stand",
  AGENT: "Agent",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LeadAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {getInitials(name) || "?"}
    </div>
  );
}

function MessageStatusBadge({ lead }: { lead: Lead }) {
  const job = lead.messageJobs[0];
  if (job) {
    return (
      <Badge variant={statusVariant[job.status] ?? "outline"}>
        {statusLabels[job.status] ?? job.status}
      </Badge>
    );
  }
  if (lead.optInConsent) {
    return <Badge variant="outline">En attente</Badge>;
  }
  return <Badge variant="secondary">Sans opt-in</Badge>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stands, setStands] = useState<Stand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [standId, setStandId] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const hasFilters = Boolean(search || standId || messageStatus || from || to);

  const stats = useMemo(() => {
    const withOptIn = leads.filter((l) => l.optInConsent).length;
    const delivered = leads.filter((l) =>
      ["DELIVERED", "READ"].includes(l.messageJobs[0]?.status ?? "")
    ).length;
    const qrLeads = leads.filter((l) => l.source === "QR_SELF").length;
    return { total: leads.length, withOptIn, delivered, qrLeads };
  }, [leads]);

  useEffect(() => {
    fetch("/api/stands")
      .then((r) => r.json())
      .then((data: { stands: Stand[] }) => setStands(data.stands ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (standId) params.set("standId", standId);
    if (messageStatus) params.set("messageStatus", messageStatus);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to + "T23:59:59").toISOString());

    fetch(`/api/leads?${params}`)
      .then((r) => r.json())
      .then((data: { leads: Lead[] }) => setLeads(data.leads ?? []))
      .finally(() => setLoading(false));
  }, [search, standId, messageStatus, from, to]);

  function resetFilters() {
    setSearch("");
    setStandId("");
    setMessageStatus("");
    setFrom("");
    setTo("");
  }

  function exportCsv() {
    const headers = ["Nom", "WhatsApp", "Email", "Entreprise", "Stand", "Source", "Opt-in", "Statut envoi", "Date"];
    const rows = leads.map((l) => [
      l.fullName,
      l.whatsappNumber,
      l.email ?? "",
      l.company ?? "",
      l.stand?.name ?? "",
      sourceLabels[l.source] ?? l.source,
      l.optInConsent ? "Oui" : "Non",
      l.messageJobs[0]?.status ?? "—",
      l.capturedAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Tous les visiteurs capturés sur vos stands et par vos agents"
      >
        <Link href="/dashboard/capture">
          <Button variant="outline" className="hidden sm:inline-flex">
            <UserPlus className="mr-2 h-4 w-4" />
            Capturer
          </Button>
        </Link>
        <Button variant="outline" onClick={exportCsv} disabled={leads.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Résultats"
          value={stats.total}
          variant="blue"
          icon={<Users className="h-5 w-5" />}
          hint={hasFilters ? "Filtres actifs" : "Tous les leads"}
        />
        <StatCard
          title="Avec opt-in"
          value={stats.withOptIn}
          variant="emerald"
          icon={<MessageCircle className="h-5 w-5" />}
          hint="Consentement WhatsApp"
        />
        <StatCard
          title="Catalogues délivrés"
          value={stats.delivered}
          variant="violet"
          icon={<MessageCircle className="h-5 w-5" />}
          hint="Envoyés ou lus"
        />
        <StatCard
          title="Via QR stand"
          value={stats.qrLeads}
          variant="amber"
          icon={<QrCode className="h-5 w-5" />}
          hint="Capture autonome"
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Filtres
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nom, téléphone, entreprise…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stand</Label>
              <select className={selectClass} value={standId} onChange={(e) => setStandId(e.target.value)}>
                <option value="">Tous les stands</option>
                {stands.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Statut envoi</Label>
              <select
                className={selectClass}
                value={messageStatus}
                onChange={(e) => setMessageStatus(e.target.value)}
              >
                {MESSAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "" ? "Tous" : s === "NONE" ? "Sans envoi" : statusLabels[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Du</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="Date de début" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Au</Label>
              <DatePicker
                value={to}
                min={from || undefined}
                onChange={setTo}
                placeholder="Date de fin"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-gradient-to-r from-accent/50 to-accent/20">
            <tr>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">WhatsApp</th>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">Stand</th>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">Envoi</th>
              <th className="px-4 py-3.5 text-left font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-10 animate-pulse rounded-lg bg-accent/60" />
                  </td>
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState hasFilters={hasFilters} onReset={resetFilters} />
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b transition-colors last:border-0 hover:bg-accent/20"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <LeadAvatar name={lead.fullName} />
                      <div className="min-w-0">
                        <p className="font-medium">{lead.fullName}</p>
                        {lead.company && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {lead.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {formatPhoneDisplay(lead.whatsappNumber)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {lead.stand?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {sourceLabels[lead.source] ?? lead.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <MessageStatusBadge lead={lead} />
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {formatDate(lead.capturedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-accent/60" />
          ))
        ) : leads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-0">
              <EmptyState hasFilters={hasFilters} onReset={resetFilters} />
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="border-border/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <LeadAvatar name={lead.fullName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{lead.fullName}</p>
                      <MessageStatusBadge lead={lead} />
                    </div>
                    {lead.company && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{lead.company}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPhoneDisplay(lead.whatsappNumber)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {sourceLabels[lead.source] ?? lead.source}
                      </Badge>
                      {lead.stand && (
                        <span className="text-xs text-muted-foreground">{lead.stand.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(lead.capturedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="h-6 w-6" />
      </div>
      <p className="mt-4 font-medium">
        {hasFilters ? "Aucun lead pour ces filtres" : "Aucun lead pour le moment"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Essayez d'élargir votre recherche ou de réinitialiser les filtres."
          : "Capturez des contacts via le QR code de vos stands ou l'app agent."}
      </p>
      <div className="mt-4 flex gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        )}
        <Link href="/dashboard/capture">
          <Button size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Capturer un lead
          </Button>
        </Link>
      </div>
    </div>
  );
}
