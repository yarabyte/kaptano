"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDb =
    error.message.includes("Can't reach database") ||
    error.message.includes("P1001") ||
    error.digest?.includes("1016297238");

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="font-heading text-xl font-semibold">
        {isDb ? "Base de données injoignable" : "Erreur plateforme"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {isDb
          ? "Impossible de joindre Supabase (pooler). Vérifiez votre connexion réseau ou réessayez dans quelques secondes."
          : "Une erreur est survenue lors du chargement du back-office."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={reset} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
        <Link href="/platform">
          <Button variant="outline" className="w-full sm:w-auto">
            Recharger la page
          </Button>
        </Link>
      </div>
    </div>
  );
}
