"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-heading text-2xl font-bold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Rechargez la page ou retournez à l&apos;accueil. Si le problème persiste,
        redémarrez le serveur de développement.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Link href="/">
          <Button variant="outline">Accueil</Button>
        </Link>
      </div>
    </div>
  );
}
