import Link from "next/link";
import { Gauge, Timer, Shield, Users, Zap } from "lucide-react";
import { META_WHATSAPP_RATE_LIMITS_URL, RATE_LIMIT_SECTION } from "@/lib/legal/content";

const highlights = [
  {
    icon: Timer,
    label: "1 envoi / 5 s",
    detail: "Numéro partagé (protection compte Meta)",
  },
  {
    icon: Gauge,
    label: "200 / jour",
    detail: "Plafond par exposant sur Kaptano",
  },
  {
    icon: Zap,
    label: "3–8 s",
    detail: "Intervalle entre envois en mode manuel",
  },
  {
    icon: Users,
    label: "1–5 max",
    detail: "Envois simultanés par session WhatsApp",
  },
];

export function PricingRateLimits() {
  return (
    <section className="border-y border-border/40 bg-white py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Protection anti-ban</span>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight">
            Limites d&apos;envoi WhatsApp
          </h2>
          <p className="mt-3 text-muted-foreground">{RATE_LIMIT_SECTION.intro}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-primary/15 bg-primary/5 p-5 text-center shadow-sm"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-heading text-2xl font-bold text-primary">{item.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {RATE_LIMIT_SECTION.items.map((item) => (
            <div
              key={item.label}
              className="flex gap-3 rounded-xl border border-border/60 bg-accent/10 p-4"
            >
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          Kaptano peut suspendre ou ralentir temporairement les envois en cas de dépassement répété
          des limites ou de comportement jugé à risque.{" "}
          <Link
            href={META_WHATSAPP_RATE_LIMITS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Documentation Meta (limites WhatsApp Business)
          </Link>
          {" · "}
          <Link href="/cgu" className="text-primary hover:underline">
            CGU
          </Link>
          {" · "}
          <Link href="/cgv" className="text-primary hover:underline">
            CGV
          </Link>
        </p>
      </div>
    </section>
  );
}
