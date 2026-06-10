import { loadPlatformRateLimitDashboard } from "@/lib/platform/rate-limit-data";
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
    <div className="space-y-6">
      <PageHeader
        title="Rate limits WhatsApp"
        description="Surveillez les envois et respectez les limites Wasender pour éviter les restrictions"
      />

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
