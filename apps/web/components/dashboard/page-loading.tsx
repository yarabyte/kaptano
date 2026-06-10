import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSpinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function DashboardLayoutSkeleton() {
  return (
    <div
      className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent/20"
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
    >
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-white md:flex lg:w-72">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-1.5 p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-auto border-t border-border/60 p-4">
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border/60 bg-white px-4 md:hidden">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-white/80 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Chargement de votre espace…
              </p>
            </div>
            <DashboardPageSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

export function PlatformLayoutSkeleton() {
  return (
    <DashboardLayoutSkeleton />
  );
}

export function AuthPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-accent/20 px-4"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function MarketingLayoutSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-white via-white to-accent/30"
      aria-busy="true"
      aria-label="Chargement de la page"
    >
      <div className="border-b border-border/60 bg-white/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Skeleton className="h-8 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>
      <div className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <Skeleton className="mx-auto h-6 w-32" />
          <Skeleton className="mx-auto h-12 w-full max-w-lg" />
          <Skeleton className="mx-auto h-5 w-full max-w-md" />
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="mx-auto mb-8 h-16 w-full max-w-5xl rounded-xl" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement de la page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
