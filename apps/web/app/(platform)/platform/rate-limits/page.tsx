import Link from "next/link";
import { ExternalLink, Shield } from "lucide-react";
import { loadPlatformRateLimitDashboard } from "@/lib/platform/rate-limit-data";
import { META_WHATSAPP_RATE_LIMITS_URL } from "@/lib/legal/content";
import { PageHeader } from "@/components/dashboard/page-header";
import { DbAlert } from "@/components/platform/db-alert";
import { RateLimitsManager } from "@/components/platform/rate-limits-manager";
export default async function PlatformRateLimitsPage() {
  let data: Awaited<ReturnType<typeof loadPlatformRateLimitDashboard>> | null = null;
  let dbError: string | null = null;

  try {
    data = await loadPlatformRateLimitDashboard();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur base de données";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rate limits WhatsApp"
        description="Pilotez le débit d'envoi, surveillez la consommation et protégez le numéro partagé contre les restrictions Meta."
      >
        <Link
          href={META_WHATSAPP_RATE_LIMITS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Shield className="mr-2 h-4 w-4" />
          Doc Meta
          <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-60" />
        </Link>
      </PageHeader>

      {dbError && <DbAlert />}

      {!dbError && data && (
        <RateLimitsManager
          initial={{
            ...data,
            limits: {
              ...data.limits,
              lastSharedSendAt: data.limits.lastSharedSendAt?.toISOString() ?? null,
              lastRateLimitResetAt: data.limits.lastRateLimitResetAt?.toISOString() ?? null,
            },
            recentSends: data.recentSends.map((j) => ({
              ...j,
              sentAt: j.sentAt?.toISOString() ?? null,
            })),
          }}
        />
      )}
    </div>
  );
}
