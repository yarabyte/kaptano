import Link from "next/link";
import { ArrowRight, Inbox, ImageIcon, FileText, Mic } from "lucide-react";
import { getTenantIncomingMessages } from "@kaptano/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";

type IncomingMessagesCardProps = {
  tenantId: string;
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

function messagePreview(text: string | null, type: string): string {
  if (text?.trim()) return text.trim();
  return typeLabels[type] ?? "Message reçu";
}

export async function IncomingMessagesCard({ tenantId }: IncomingMessagesCardProps) {
  const messages = await getTenantIncomingMessages(tenantId, { limit: 5 });

  if (messages.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="font-heading flex items-center gap-2 text-lg">
            <Inbox className="h-5 w-5 text-sky-600" />
            Réponses WhatsApp
          </CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Messages reçus de vos leads
          </p>
        </div>
        <Link href="/dashboard/replies">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((message) => {
          const leadName =
            message.lead?.fullName ?? message.pushName ?? "Contact inconnu";
          const phone =
            message.lead?.whatsappNumber ??
            (message.remoteJid.includes("@") ? message.remoteJid.split("@")[0] : message.remoteJid);

          return (
            <div
              key={message.id}
              className="rounded-xl border border-border/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{leadName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneDisplay(phone)} · {formatDate(message.receivedAt)}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {typeLabels[message.messageType] ?? message.messageType}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm">
                {messagePreview(message.textBody, message.messageType)}
              </p>
              {message.mediaPublicUrl && message.messageType !== "TEXT" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {message.messageType === "IMAGE" || message.messageType === "STICKER" ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : message.messageType === "AUDIO" ? (
                    <Mic className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  Média disponible
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
