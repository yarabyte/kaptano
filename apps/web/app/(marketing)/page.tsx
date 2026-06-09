import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  MessageCircle,
  BarChart3,
  WifiOff,
  Shield,
  Zap,
  CheckCircle2,
  Building2,
  Users,
  UserPlus,
  Send,
  ImageIcon,
  FileText,
  ListChecks,
  Eye,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "@/components/marketing/hero-mockup";

const stats = [
  { value: "3×", label: "Plus de leads qualifiés", icon: Users },
  { value: "4", label: "Formats WhatsApp", icon: MessageCircle },
  { value: "0", label: "Cahier papier", icon: QrCode },
];

const useCases = [
  {
    icon: Building2,
    title: "Exposants BTP & industrie",
    description:
      "Catalogue PDF, visuels produits ou sondage d'intérêt — vous lancez l'envoi WhatsApp quand vous quittez le stand.",
  },
  {
    icon: Users,
    title: "Équipes commerciales",
    description:
      "Agents sur tablette, capture rapide, filtre par stand et suivi centralisé pour le responsable.",
  },
  {
    icon: WifiOff,
    title: "Foires à réseau faible",
    description:
      "PWA offline-first : zéro lead perdu quand le Wi-Fi du hall lâche. Sync dès le retour de connexion.",
  },
];

const steps = [
  {
    step: "01",
    icon: QrCode,
    title: "Créez votre stand",
    description: "Générez un QR code unique et affichez-le sur votre stand.",
  },
  {
    step: "02",
    icon: UserPlus,
    title: "Capturez les visiteurs",
    description: "Ils scannent et laissent leurs coordonnées, même sans réseau.",
  },
  {
    step: "03",
    icon: Send,
    title: "Lancez l'envoi WhatsApp",
    description:
      "Connectez votre numéro, choisissez le format et envoyez quand vous voulez — avec suivi en direct.",
  },
];

const messageFormats = [
  {
    icon: MessageCircle,
    title: "Texte personnalisé",
    description: "Message avec variables {prenom}, {entreprise} et {lien} vers votre catalogue.",
    accent: "from-blue-50 to-white border-blue-200/60",
  },
  {
    icon: ImageIcon,
    title: "Image & visuel",
    description: "Photo produit ou bannière avec légende personnalisée pour chaque lead.",
    accent: "from-violet-50 to-white border-violet-200/60",
  },
  {
    icon: FileText,
    title: "Catalogue PDF",
    description: "Votre brochure uploadée, envoyée directement dans la conversation WhatsApp.",
    accent: "from-amber-50 to-white border-amber-200/60",
  },
  {
    icon: ListChecks,
    title: "Sondage",
    description: "Question à choix multiples pour qualifier l'intérêt de vos visiteurs.",
    accent: "from-emerald-50 to-white border-emerald-200/60",
  },
];

const testimonials = [
  {
    quote:
      "On a capturé 3× plus de contacts qu'avec le cahier. Et on envoie le catalogue quand on veut, en un clic.",
    author: "Directeur commercial, exposant BTP",
  },
  {
    quote:
      "Le mode hors-ligne nous a sauvé à la foire de Douala — le réseau était inexistant.",
    author: "Responsable stand, tech & services",
  },
];

export default function MarketingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-40" />
        <div className="hero-glow absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="container relative mx-auto px-4 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/60 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                Salons professionnels · Foires · Expositions
              </div>

              <h1 className="animate-fade-in-up animate-delay-100 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-foreground opacity-0 sm:text-5xl lg:text-[3.5rem]">
                Transformez chaque visiteur en{" "}
                <span className="bg-gradient-to-r from-primary via-blue-500 to-blue-400 bg-clip-text text-transparent">
                  lead qualifié
                </span>
              </h1>

              <p className="animate-fade-in-up animate-delay-200 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground opacity-0 lg:mx-0">
                Kaptano digitalise la capture sur stand et relance vos visiteurs par
                WhatsApp — texte, image, catalogue ou sondage — quand vous décidez
                de lancer l&apos;envoi.
              </p>

              <div className="animate-fade-in-up animate-delay-300 mt-10 flex flex-col items-center justify-center gap-3 opacity-0 sm:flex-row lg:justify-start">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/35"
                  >
                    Démarrer gratuitement
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                    Voir les tarifs
                  </Button>
                </Link>
              </div>

              <ul className="animate-fade-in-up animate-delay-400 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground opacity-0 lg:justify-start">
                {["50 leads offerts", "Sans carte bancaire", "PWA hors-ligne"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-fade-in-up animate-delay-200 opacity-0 lg:pl-4">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/60">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center px-4 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mb-0">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading text-3xl font-bold text-primary sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section
        id="cas-usage"
        className="scroll-mt-20 border-y border-border/40 bg-gradient-to-b from-slate-100/90 via-slate-50/60 to-white py-20 lg:scroll-mt-[4.5rem] lg:py-24"
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Cas d&apos;usage</span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Pensé pour les exposants sur le terrain
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.04] via-accent/25 to-white/40 p-6 shadow-sm shadow-primary/5 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp formats */}
      <section className="border-t bg-white py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">WhatsApp</span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              4 formats de relance
            </h2>
            <p className="mt-4 text-muted-foreground">
              Configurez le type de message une fois, personnalisez avec les variables
              de chaque lead, puis lancez l&apos;envoi manuellement.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {messageFormats.map((format) => (
              <div
                key={format.title}
                className={`rounded-2xl border bg-gradient-to-br p-5 ${format.accent}`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-primary">
                  <format.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading font-semibold">{format.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {format.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Variables disponibles :</span>
            {["{prenom}", "{entreprise}", "{lien}"].map((v) => (
              <code
                key={v}
                className="rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-xs"
              >
                {v}
              </code>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="fonctionnalites"
        className="scroll-mt-20 border-y border-border/40 bg-accent/20 py-20 lg:scroll-mt-[4.5rem] lg:py-28"
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Fonctionnalités</span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Tout ce qu&apos;il faut pour votre stand
            </h2>
            <p className="mt-4 text-muted-foreground">
              De la capture offline à la relance WhatsApp pilotée — conçu pour les
              salons professionnels, foires et expositions à réseau instable.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={QrCode}
              title="QR code par stand"
              description="Chaque stand a son QR. Les visiteurs saisissent leurs infos eux-mêmes, en autonomie."
            />
            <FeatureCard
              icon={WifiOff}
              title="Mode hors-ligne"
              description="La PWA enregistre les leads sans réseau et synchronise dès le retour de connexion."
            />
            <FeatureCard
              icon={Play}
              title="Envoi manuel piloté"
              description="Vous décidez quand lancer l'envoi. Barre de progression en temps réel, filtre par stand."
            />
            <FeatureCard
              icon={MessageCircle}
              title="Connexion WhatsApp"
              description="Connectez votre numéro par QR code. Reconnexion simple si la session expire."
            />
            <FeatureCard
              icon={BarChart3}
              title="Stats détaillées"
              description="Envoyés, livrés, lus, échecs et clics catalogue — aujourd'hui et sur l'historique global."
            />
            <FeatureCard
              icon={Eye}
              title="Suivi par lead"
              description="Chaque message est tracé : en attente, envoyé, livré, lu ou en échec."
            />
            <FeatureCard
              icon={Shield}
              title="Opt-in obligatoire"
              description="Conformité et protection anti-ban : aucun envoi sans consentement explicite."
            />
            <FeatureCard
              icon={Zap}
              title="Envoi throttlé"
              description="Messages étalés automatiquement (3 à 8 s) pour protéger votre numéro WhatsApp."
            />
            <FeatureCard
              icon={Users}
              title="Multi-stand & agents"
              description="Plusieurs stands, équipe sur tablette, événements et un seul compte exposant."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="processus"
        className="scroll-mt-20 border-b border-border/40 bg-gradient-to-b from-slate-100/90 via-slate-50/60 to-white py-20 lg:scroll-mt-[4.5rem] lg:py-28"
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Processus</span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Comment ça marche
            </h2>
            <p className="mt-4 text-muted-foreground">Opérationnel en moins de 10 minutes</p>
          </div>

          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <div className="absolute left-[16.666%] right-[16.666%] top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />
            {steps.map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className="relative z-10 mx-auto mb-4 w-fit md:mx-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary text-primary-foreground shadow-md">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-xs font-bold text-primary shadow-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-white py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <blockquote
                key={t.author}
                className="rounded-2xl border border-border/60 bg-accent/20 p-8"
              >
                <p className="text-lg leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-medium text-muted-foreground">
                  — {t.author}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-blue-600 px-8 py-16 text-center text-primary-foreground shadow-2xl shadow-primary/35 sm:px-16">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="hero-grid absolute inset-0 opacity-20" />
            <div className="relative">
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">
                Prêt pour votre prochain événement ?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90">
                Rejoignez les exposants qui capturent, relancent et suivent chaque
                contact — sans cahier, sans spam, sans lead perdu.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 bg-white px-8 text-base text-primary hover:bg-white/90"
                  >
                    Créer mon compte gratuit
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-white/40 bg-white/10 px-8 text-base text-white hover:bg-white/20 hover:text-white"
                  >
                    Comparer les plans
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
