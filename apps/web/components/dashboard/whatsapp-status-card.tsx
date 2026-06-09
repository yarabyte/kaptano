import Link from "next/link";
import { MessageCircle, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WhatsappMode } from "@/lib/whatsapp/resolve-session";

type WhatsappStatusCardProps = {
  status?: string | null;
  phoneNumber?: string | null;
  whatsappMode?: WhatsappMode;
  isAdmin: boolean;
};

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "secondary" | "destructive"; connected: boolean }
> = {
  CONNECTED: { label: "Connecté", variant: "success", connected: true },
  PENDING: { label: "En attente", variant: "secondary", connected: false },
  DISCONNECTED: { label: "Déconnecté", variant: "destructive", connected: false },
  EXPIRED: { label: "Expiré", variant: "destructive", connected: false },
};

export function WhatsappStatusCard({
  status,
  phoneNumber,
  whatsappMode = "own",
  isAdmin,
}: WhatsappStatusCardProps) {
  const config = status ? statusConfig[status] : null;
  const connected = config?.connected ?? false;
  const isShared = whatsappMode === "shared";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="font-heading text-lg">WhatsApp</CardTitle>
        <div className="flex items-center gap-2">
          {isShared && (
            <Badge variant="secondary" className="text-[10px]">
              Partagé
            </Badge>
          )}
          <Badge variant={config?.variant ?? "secondary"}>
            {config?.label ?? "Non configuré"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <p className="truncate font-medium">
              {phoneNumber ?? (isShared ? "Numéro Kaptano" : "Aucun numéro connecté")}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  {isShared ? "Numéro partagé prêt" : "Prêt pour l'envoi manuel"}
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  {isShared
                    ? "Numéro partagé indisponible"
                    : "Connectez pour envoyer manuellement"}
                </>
              )}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link href="/dashboard/whatsapp">
            <Button variant="outline" size="sm" className="w-full">
              {isShared
                ? connected
                  ? "Format des messages"
                  : "Voir WhatsApp"
                : connected
                  ? "Paramètres WhatsApp"
                  : "Configurer WhatsApp"}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
