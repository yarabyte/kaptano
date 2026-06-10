"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  RefreshCw,
  Search,
  ImageIcon,
  FileText,
  Mic,
  Video,
  MapPin,
  User,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";

type IncomingMessage = {
  id: string;
  wasenderMessageId: string;
  remoteJid: string;
  messageType: string;
  textBody: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaPublicUrl: string | null;
  pushName: string | null;
  receivedAt: string;
  lead: {
    id: string;
    fullName: string;
    whatsappNumber: string;
  } | null;
};

const typeLabels: Record<string, string> = {
  TEXT: "Texte",
  IMAGE: "Image",
  VIDEO: "Vidéo",
  AUDIO: "Audio",
  DOCUMENT: "Document",
  STICKER: "Sticker",
  LOCATION: "Position",
  CONTACT: "Contact",
  UNKNOWN: "Message",
};

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "IMAGE":
    case "STICKER":
      return <ImageIcon className="h-4 w-4" />;
    case "VIDEO":
      return <Video className="h-4 w-4" />;
    case "AUDIO":
      return <Mic className="h-4 w-4" />;
    case "LOCATION":
      return <MapPin className="h-4 w-4" />;
    case "CONTACT":
      return <User className="h-4 w-4" />;
    case "DOCUMENT":
      return <FileText className="h-4 w-4" />;
    default:
      return <Inbox className="h-4 w-4" />;
  }
}

export default function RepliesPage() {
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/whatsapp/incoming?limit=100");
      if (res.ok) {
        const data = (await res.json()) as { messages: IncomingMessage[] };
        setMessages(data.messages ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function syncWebhooks() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/whatsapp/session/sync-webhooks", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSyncMessage(data.error ?? "Échec de la synchronisation");
        return;
      }
      setSyncMessage("Webhooks synchronisés — les nouveaux messages seront reçus.");
    } catch {
      setSyncMessage("Impossible de synchroniser les webhooks.");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;

    return messages.filter((message) => {
      const leadName = message.lead?.fullName ?? message.pushName ?? "";
      const phone = message.lead?.whatsappNumber ?? message.remoteJid;
      const text = message.textBody ?? "";
      return (
        leadName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        text.toLowerCase().includes(q)
      );
    });
  }, [messages, search]);

  if (loading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réponses WhatsApp"
        description="Messages privés reçus de vos leads (texte, images, documents…)"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={syncWebhooks}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync webhooks
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </PageHeader>

      {syncMessage && (
        <p className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
          {syncMessage}
        </p>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, numéro ou contenu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/60" />
            <div>
              <p className="font-medium">Aucune réponse reçue</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Les messages privés de vos leads apparaîtront ici. Si vous venez
                d&apos;activer la fonctionnalité, cliquez sur « Sync webhooks »
                puis demandez à un lead de vous écrire sur WhatsApp.
              </p>
            </div>
            <Link href="/dashboard/whatsapp">
              <Button variant="outline" size="sm">
                Paramètres WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((message) => {
            const leadName =
              message.lead?.fullName ?? message.pushName ?? "Contact inconnu";
            const phone =
              message.lead?.whatsappNumber ??
              (message.remoteJid.includes("@")
                ? `+${message.remoteJid.split("@")[0]?.replace(/\D/g, "")}`
                : message.remoteJid);

            return (
              <Card key={message.id} className="border-border/60 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {message.lead ? (
                        <Link
                          href={`/dashboard/leads`}
                          className="font-medium hover:text-primary"
                        >
                          {leadName}
                        </Link>
                      ) : (
                        <p className="font-medium">{leadName}</p>
                      )}
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatPhoneDisplay(phone)} ·{" "}
                        {formatDate(new Date(message.receivedAt))}
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <TypeIcon type={message.messageType} />
                      {typeLabels[message.messageType] ?? message.messageType}
                    </Badge>
                  </div>

                  {message.textBody && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                      {message.textBody}
                    </p>
                  )}

                  {message.mediaPublicUrl && message.messageType !== "TEXT" && (
                    <div className="mt-3">
                      {message.messageType === "IMAGE" ||
                      message.messageType === "STICKER" ? (
                        <a
                          href={message.mediaPublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block overflow-hidden rounded-lg border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.mediaPublicUrl}
                            alt={message.mediaFileName ?? "Image reçue"}
                            className="max-h-64 max-w-full object-contain"
                          />
                        </a>
                      ) : (
                        <a
                          href={message.mediaPublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {message.mediaFileName ?? "Ouvrir le média"}
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
