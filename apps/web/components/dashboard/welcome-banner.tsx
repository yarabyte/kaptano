import Link from "next/link";
import { Sparkles, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFirstName } from "@/lib/utils";

const planLabels: Record<string, string> = {
  FREE: "Gratuit",
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
};

const roleLabels: Record<string, string> = {
  EXHIBITOR_ADMIN: "Administrateur",
  AGENT: "Agent terrain",
};

type WelcomeBannerProps = {
  fullName?: string | null;
  tenantName?: string | null;
  role: string;
  planTier?: string | null;
  showCaptureCta?: boolean;
};

export function WelcomeBanner({
  fullName,
  tenantName,
  role,
  planTier,
  showCaptureCta = true,
}: WelcomeBannerProps) {
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const greeting = fullName
    ? `Bonjour, ${getFirstName(fullName)}`
    : "Bonjour";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-primary/20 sm:p-8">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {today}
            </span>
            {planTier && (
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                Plan {planLabels[planTier] ?? planTier}
              </Badge>
            )}
            <Badge className="border-white/20 bg-white/10 text-white/90 hover:bg-white/15">
              {roleLabels[role] ?? role}
            </Badge>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-blue-100 sm:text-base">
              {tenantName
                ? `Tableau de bord de ${tenantName} — suivez vos leads et vos stands en temps réel.`
                : "Suivez vos leads et vos stands en temps réel."}
            </p>
          </div>
        </div>

        {showCaptureCta && (
          <Link href="/dashboard/capture" className="shrink-0">
            <Button
              size="lg"
              className="w-full gap-2 bg-white text-primary shadow-md hover:bg-blue-50 sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Capturer un lead
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
