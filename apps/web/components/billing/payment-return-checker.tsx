"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export function PaymentReturnChecker() {
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "error">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const tx = sessionStorage.getItem("cinetpay_transaction_id");
    if (!tx) {
      setStatus("pending");
      return;
    }

    fetch(`/api/cinetpay/check?transactionId=${encodeURIComponent(tx)}`)
      .then((r) => r.json())
      .then((data: { status?: string; error?: string; message?: string }) => {
        if (data.status === "SUCCESS") {
          setStatus("success");
          sessionStorage.removeItem("cinetpay_transaction_id");
        } else if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("pending");
          setMessage(data.message ?? "Paiement en cours de validation…");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-accent/50 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Vérification du paiement en cours…
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <CheckCircle2 className="h-4 w-4" />
        Paiement confirmé — votre abonnement est actif.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-red-50 p-4 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        {message ?? "Erreur lors de la vérification du paiement"}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-accent/50 p-4 text-sm">
      {message ??
        "Retour depuis CinetPay — votre abonnement sera activé dès confirmation du paiement."}
    </div>
  );
}
