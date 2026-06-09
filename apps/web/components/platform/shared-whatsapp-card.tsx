"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Session = {
  status: string;
  phoneNumber: string | null;
  lastConnectedAt?: string | null;
};

const STATUS: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  CONNECTED: { label: "Connecté", variant: "success" },
  PENDING: { label: "En attente", variant: "secondary" },
  DISCONNECTED: { label: "Déconnecté", variant: "destructive" },
  EXPIRED: { label: "Expiré", variant: "destructive" },
};

export function SharedWhatsappCard() {
  const [session, setSession] = useState<Session | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = session?.status === "CONNECTED";
  const status = session?.status ? STATUS[session.status] : null;

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/whatsapp-session");
    if (!res.ok) return;
    const data = (await res.json()) as { session: Session | null };
    setSession(data.session);
    if (data.session?.phoneNumber) setPhoneNumber(data.session.phoneNumber);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function connect() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/platform/whatsapp-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
    });
    const data = (await res.json()) as { qrCode?: string; error?: string; session?: Session };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la connexion");
      return;
    }

    if (data.qrCode) setQrCode(data.qrCode);
    if (data.session) setSession(data.session);
    await load();
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-lg">WhatsApp partagé</CardTitle>
            <CardDescription>
              Numéro utilisé par les plans Gratuit et Starter
            </CardDescription>
          </div>
          <Badge variant={status?.variant ?? "secondary"}>
            {status?.label ?? "Non configuré"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

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
                  Prêt pour les envois Gratuit & Starter
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  Connectez le numéro partagé de la plateforme
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sharedPhoneNumber">Numéro WhatsApp</Label>
          <Input
            id="sharedPhoneNumber"
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
              alt="QR WhatsApp partagé"
              className="mx-auto max-w-[200px] rounded-lg border bg-white p-2 shadow-sm"
            />
          </div>
        )}

        <Button
          onClick={connect}
          disabled={loading || !phoneNumber.trim()}
          className="h-11 w-full sm:w-auto"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          {connected ? "Reconnecter" : "Générer le QR code"}
        </Button>
      </CardContent>
    </Card>
  );
}
