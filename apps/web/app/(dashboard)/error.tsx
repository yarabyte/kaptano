"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Erreur dans le tableau de bord</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Une erreur inattendue s'est produite."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Link href="/dashboard">
          <Button variant="outline">Tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
