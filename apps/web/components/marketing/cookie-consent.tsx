"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "kaptano-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function saveChoice(value: "accepted" | "refused") {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-border/60 bg-white p-5 shadow-2xl shadow-primary/10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:p-6"
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cookie className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p id="cookie-consent-title" className="font-heading text-base font-semibold">
            Consentement cookies
          </p>
          <p id="cookie-consent-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Kaptano utilise des cookies essentiels pour l&apos;authentification et le bon
            fonctionnement du service. En continuant, vous acceptez leur utilisation.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/pricing"
          className="text-center text-sm text-primary hover:underline sm:mr-auto sm:text-left"
        >
          En savoir plus
        </Link>
        <Button variant="outline" size="sm" onClick={() => saveChoice("refused")}>
          Refuser
        </Button>
        <Button size="sm" onClick={() => saveChoice("accepted")}>
          Accepter
        </Button>
      </div>
    </div>
  );
}
