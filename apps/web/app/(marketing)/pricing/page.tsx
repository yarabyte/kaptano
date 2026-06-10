import Link from "next/link";
import { PLAN_QUOTAS, PLAN_PRICES_XAF } from "@kaptano/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  MessageCircle,
  QrCode,
  WifiOff,
  BarChart3,
  Send,
  ImageIcon,
  FileText,
  ListChecks,
  Users,
  Shield,
} from "lucide-react";
import { PricingRateLimits } from "@/components/marketing/pricing-rate-limits";

const plans = [
  { tier: "FREE", label: "Gratuit", priceXaf: 0, highlight: false, tagline: "Tester sur un événement" },
  { tier: "STARTER", label: "Starter", priceXaf: PLAN_PRICES_XAF.STARTER, highlight: false, tagline: "Exposant solo" },
  { tier: "GROWTH", label: "Growth", priceXaf: PLAN_PRICES_XAF.GROWTH, highlight: true, tagline: "Équipe & multi-stands" },
  { tier: "SCALE", label: "Scale", priceXaf: PLAN_PRICES_XAF.SCALE, highlight: false, tagline: "Grands salons" },
] as const;

const includedFeatures = [
  { icon: QrCode, label: "QR code par stand & capture visiteur" },
  { icon: WifiOff, label: "PWA hors-ligne avec sync automatique" },
  { icon: MessageCircle, label: "WhatsApp partagé (Gratuit/Starter) ou votre numéro (Growth/Scale)" },
  { icon: Send, label: "Envoi manuel piloté avec barre de progression" },
  { icon: ImageIcon, label: "4 formats : texte, image, PDF, sondage" },
  { icon: FileText, label: "Variables {prenom}, {entreprise}, {lien}" },
  { icon: BarChart3, label: "Stats temps réel : envoyés, livrés, lus, échecs" },
  { icon: ListChecks, label: "Filtre par stand & historique global" },
  { icon: Users, label: "Équipe d'agents & gestion d'événements" },
  { icon: Shield, label: "Opt-in obligatoire & envoi throttlé anti-ban" },
];

const comparisonRows = [
  { feature: "Leads inclus / mois", free: "50", starter: "500", growth: "2 000", scale: "10 000" },
  { feature: "Stands & QR codes", free: "1", starter: "1", growth: "Illimité", scale: "Illimité" },
  { feature: "Agents sur tablette", free: "Oui", starter: "Oui", growth: "Oui", scale: "Oui" },
  { feature: "Formats WhatsApp", free: "4 types", starter: "4 types", growth: "4 types", scale: "4 types" },
  { feature: "Numéro WhatsApp", free: "Partagé Kaptano", starter: "Partagé Kaptano", growth: "Votre numéro", scale: "Votre numéro" },
  { feature: "Envoi manuel", free: "Oui", starter: "Oui", growth: "Oui", scale: "Oui" },
  { feature: "Suivi livraison & lectures", free: "Oui", starter: "Oui", growth: "Oui", scale: "Oui" },
  { feature: "Paiement Mobile Money", free: "—", starter: "Oui", growth: "Oui", scale: "Oui" },
  { feature: "Plafond envois / jour", free: "200", starter: "200", growth: "200", scale: "200" },
  {
    feature: "Intervalle anti-ban (manuel)",
    free: "3–8 s",
    starter: "3–8 s",
    growth: "3–8 s",
    scale: "3–8 s",
  },
  {
    feature: "Protection Meta (partagé)",
    free: "1 / 5 s",
    starter: "1 / 5 s",
    growth: "—",
    scale: "—",
  },
];

const faqs = [
  {
    q: "Comment fonctionne l'envoi WhatsApp ?",
    a: "Vous connectez votre numéro via QR code, configurez le format du message (texte, image, catalogue PDF ou sondage), puis lancez l'envoi manuellement quand vous êtes prêt. Une barre de progression suit chaque message en temps réel.",
  },
  {
    q: "Y a-t-il une limite d'envois par jour ?",
    a: "Oui. Kaptano applique un plafond de 200 envois par exposant et par jour. Sur le numéro partagé (plans Gratuit et Starter), la protection compte Meta impose environ 1 envoi toutes les 5 secondes et un maximum d'environ 12 envois par minute. Les envois manuels sont étalés de 3 à 8 secondes entre chaque message.",
  },
  {
    q: "Pourquoi mes envois sont-ils ralentis ?",
    a: "Pour protéger votre numéro WhatsApp, Kaptano respecte les limites de la plateforme Meta : intervalle minimum entre envois, plafond par minute, concurrence limitée (1 à 5 envois simultanés) et opt-in obligatoire. Un envoi massif peut être temporairement suspendu même si votre quota de leads n'est pas atteint.",
  },
  {
    q: "Que se passe-t-il si je dépasse mon quota de leads ?",
    a: "La capture de nouveaux leads est suspendue jusqu'au renouvellement mensuel ou à la montée en plan. Vos leads existants et l'envoi WhatsApp restent accessibles.",
  },
  {
    q: "Puis-je payer avec Orange Money ou MTN Money ?",
    a: "Oui, les plans payants se règlent via CinetPay (Orange Money, MTN Money) directement depuis votre tableau de bord.",
  },
];

export default function PricingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-accent/40 via-white to-white py-16 lg:py-24">
        <div className="hero-glow absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Tarification</span>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              Un plan pour chaque salon
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Quota de leads mensuel, toutes les fonctionnalités incluses dès le plan gratuit.
              Paiement via Orange Money et MTN Money.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.tier}
                className={
                  plan.highlight
                    ? "relative border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                    : "border-border/60"
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Populaire
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="font-heading">{plan.label}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {plan.priceXaf === 0
                      ? "Gratuit"
                      : `${plan.priceXaf.toLocaleString("fr-FR")} XAF`}
                  </p>
                  {plan.priceXaf > 0 && (
                    <p className="text-sm text-muted-foreground">par mois</p>
                  )}

                  <Badge
                    variant="outline"
                    className="mt-4 gap-1.5 rounded-full border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-normal shadow-sm"
                  >
                    <span className="font-bold text-primary">
                      {PLAN_QUOTAS[plan.tier]?.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-muted-foreground">leads / mois</span>
                  </Badge>

                  <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {plan.tier === "FREE" || plan.tier === "STARTER"
                        ? "1 stand & QR code"
                        : "Stands & QR codes illimités"}
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {plan.tier === "FREE" || plan.tier === "STARTER"
                        ? "WhatsApp via numéro partagé Kaptano"
                        : "Votre propre numéro WhatsApp"}
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Envoi manuel & suivi temps réel
                    </li>
                    {plan.tier !== "FREE" && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Paiement Mobile Money
                      </li>
                    )}
                  </ul>

                  <Link
                    href={plan.tier === "FREE" ? "/signup" : "/signup?plan=" + plan.tier.toLowerCase()}
                    className="mt-6 block"
                  >
                    <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                      {plan.tier === "FREE" ? "Commencer gratuitement" : "Choisir ce plan"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Après inscription, activez votre plan payant depuis{" "}
            <Link href="/dashboard/billing" className="font-medium text-primary hover:underline">
              Facturation
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Tout inclus */}
      <section className="border-y border-border/40 bg-accent/20 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">
              Tout inclus, quel que soit le plan
            </h2>
            <p className="mt-3 text-muted-foreground">
              Seul le volume de leads capturés change. Aucune fonctionnalité verrouillée.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {includedFeatures.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-relaxed text-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingRateLimits />

      {/* Comparaison */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">
              Comparaison des plans
            </h2>
          </div>

          <div className="mt-10 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-accent/30">
                  <th className="px-4 py-3 text-left font-medium">Fonctionnalité</th>
                  <th className="px-4 py-3 text-center font-medium">Gratuit</th>
                  <th className="px-4 py-3 text-center font-medium">Starter</th>
                  <th className="px-4 py-3 text-center font-medium text-primary">Growth</th>
                  <th className="px-4 py-3 text-center font-medium">Scale</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-accent/10"}>
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.free}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.starter}</td>
                    <td className="px-4 py-3 text-center font-medium text-primary">{row.growth}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.scale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 bg-gradient-to-b from-slate-50 to-white py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight">Questions fréquentes</h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-border/60 bg-white p-6 shadow-sm"
              >
                <h3 className="font-heading font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8">
                Démarrer gratuitement — 50 leads offerts
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
