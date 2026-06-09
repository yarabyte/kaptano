"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type UsageSummary = {
  used: number;
  quota: number;
  remaining: number;
  isAtLimit: boolean;
  subscriptionStatus: string;
  effectiveTier: string;
  planTier: string;
};

export function QuotaBanner() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { usage?: UsageSummary } | null) => {
        if (data?.usage) setUsage(data.usage);
      })
      .catch(() => {});
  }, []);

  if (!usage) return null;

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
