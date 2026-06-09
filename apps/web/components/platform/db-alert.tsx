import { AlertTriangle } from "lucide-react";

export function DbAlert({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">Données temporairement indisponibles</p>
        <p className="mt-1 text-amber-800/90">
          {message ??
            "La connexion Supabase a échoué ou est trop lente. Réessayez en rechargeant la page."}
        </p>
      </div>
    </div>
  );
}
