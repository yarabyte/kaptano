import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DatabaseUnavailable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
        <AlertTriangle className="h-7 w-7 text-amber-600" />
      </div>
      <h1 className="font-heading text-2xl font-bold">Service temporairement indisponible</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Impossible de joindre la base de données. Réessayez dans quelques instants.
        Si le problème persiste, vérifiez que{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code> est
        bien configurée sur Vercel.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Réessayer</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Accueil</Button>
        </Link>
      </div>
    </div>
  );
}
