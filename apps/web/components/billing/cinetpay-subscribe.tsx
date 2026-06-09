"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_PRICES_XAF } from "@kaptano/shared";

type PlanTier = "STARTER" | "GROWTH" | "SCALE";

const paidPlans: Array<{ tier: PlanTier; label: string }> = [
  { tier: "STARTER", label: "Starter" },
  { tier: "GROWTH", label: "Growth" },
  { tier: "SCALE", label: "Scale" },
];

export function CinetPaySubscribeButtons({
  currentTier,
}: {
  currentTier: string;
}) {
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(planTier: PlanTier) {
    setLoading(planTier);
    setError(null);

    const res = await fetch("/api/cinetpay/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier }),
    });

    const data = (await res.json()) as { paymentUrl?: string; transactionId?: string; error?: string };

    if (!res.ok || !data.paymentUrl) {
      setError(data.error ?? "Impossible d'initialiser le paiement");
      setLoading(null);
      return;
    }

    if (data.transactionId) {
      sessionStorage.setItem("cinetpay_transaction_id", data.transactionId);
    }

    window.location.href = data.paymentUrl;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paiement sécurisé via Orange Money et MTN Money
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {paidPlans.map(({ tier, label }) => (
          <Card key={tier} className={currentTier === tier ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {PLAN_PRICES_XAF[tier]?.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-normal text-muted-foreground">XAF/mois</span>
              </p>
              <Button
                className="mt-4 w-full"
                variant={currentTier === tier ? "outline" : "default"}
                disabled={loading !== null}
                onClick={() => pay(tier)}
              >
                {loading === tier ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {currentTier === tier ? "Renouveler" : "S'abonner"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
