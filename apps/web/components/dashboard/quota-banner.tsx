import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getTenantUsageSummary } from "@/lib/leads/check-quota";
import { Button } from "@/components/ui/button";

export async function QuotaBanner({ tenantId }: { tenantId: string }) {
  const usage = await getTenantUsageSummary(tenantId);

  const showLimit = usage.isAtLimit;
  const showPastDue =
    usage.subscriptionStatus === "PAST_DUE" ||
    (usage.planTier !== "FREE" && usage.effectiveTier === "FREE");

  if (!showLimit && !showPastDue) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        {showLimit && (
          <p className="font-medium">
            Quota mensuel atteint ({usage.used}/{usage.quota} leads)
          </p>
        )}
        {showPastDue && (
          <p className={showLimit ? "mt-1" : ""}>
            Abonnement expiré ou en retard — renouvelez pour conserver votre plan.
          </p>
        )}
      </div>
      <Link href="/dashboard/billing">
        <Button size="sm">Renouveler</Button>
      </Link>
    </div>
  );
}
