"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  Mail,
  User,
  XCircle,
} from "lucide-react";
import { signupSchema } from "@kaptano/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KaptanoBrand } from "@/components/auth/kaptano-brand";
import { cn, slugify } from "@/lib/utils";

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; slug: string }
  | { state: "taken"; slug: string; suggestion: string }
  | { state: "invalid"; message: string };

const wizardSteps = [
  { number: 1, label: "Entreprise" },
  { number: 2, label: "Votre compte" },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    companyName: "",
    companySlug: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step1Loading, setStep1Loading] = useState(false);
  const slugCheckRef = useRef(0);

  const checkSlug = useCallback(async (slug: string): Promise<boolean> => {
    const normalized = slugify(slug);
    if (!normalized || normalized.length < 2) {
      setSlugStatus({ state: "idle" });
      return false;
    }

    const requestId = ++slugCheckRef.current;
    setSlugStatus({ state: "checking" });

    try {
      const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(normalized)}`);
      const data = (await res.json()) as {
        available?: boolean;
        valid?: boolean;
        slug?: string;
        suggestion?: string;
        error?: string;
      };

      if (requestId !== slugCheckRef.current) {
        return false;
      }

      if (!res.ok || !data.valid) {
        setSlugStatus({
          state: "invalid",
          message: data.error ?? "Identifiant invalide",
        });
        return false;
      }

      if (data.available) {
        setSlugStatus({ state: "available", slug: data.slug ?? normalized });
        return true;
      }

      setSlugStatus({
        state: "taken",
        slug: data.slug ?? normalized,
        suggestion: data.suggestion ?? `${normalized}-2`,
      });
      return false;
    } catch {
      if (requestId !== slugCheckRef.current) {
        return false;
      }
      setSlugStatus({ state: "invalid", message: "Impossible de vérifier l'identifiant" });
      return false;
    }
  }, []);

  useEffect(() => {
    if (!form.companySlug) {
      setSlugStatus({ state: "idle" });
      return;
    }

    const timer = setTimeout(() => {
      void checkSlug(form.companySlug);
    }, 450);

    return () => clearTimeout(timer);
  }, [form.companySlug, checkSlug]);

  function updateCompanyName(value: string) {
    setForm((prev) => {
      const next = { ...prev, companyName: value };
      if (!slugTouched) {
        next.companySlug = slugify(value);
      }
      return next;
    });
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    setForm((prev) => ({
      ...prev,
      companySlug: slugify(value),
    }));
  }

  function applySuggestion(suggestion: string) {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, companySlug: suggestion }));
  }

  const normalizedSlug = slugify(form.companySlug);
  const slugFormatValid =
    normalizedSlug.length >= 2 && /^[a-z0-9-]+$/.test(normalizedSlug);
  const slugVerified =
    slugStatus.state === "available" && slugStatus.slug === normalizedSlug;
  const slugStatusMatchesCurrent =
    slugStatus.state === "idle" ||
    slugStatus.state === "checking" ||
    ("slug" in slugStatus && slugStatus.slug === normalizedSlug) ||
    slugStatus.state === "invalid";

  const step1Ready =
    form.companyName.trim().length >= 2 && slugFormatValid;

  async function goToStep2() {
    if (!step1Ready || step1Loading) return;
    setError(null);
    setStep1Loading(true);

    const isAvailable = slugVerified || (await checkSlug(form.companySlug));

    setStep1Loading(false);
    if (isAvailable) {
      setStep(2);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Données invalides");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-white via-accent/30 to-slate-100/60 px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-30" />
      <div className="absolute left-1/2 top-0 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/95 shadow-xl shadow-primary/10 backdrop-blur-sm">
          <div className="border-b border-border/40 bg-gradient-to-r from-accent/50 to-white px-8 pb-6 pt-8 text-center">
            <KaptanoBrand showText={false} />
            <h1 className="mt-6 font-heading text-2xl font-bold tracking-tight">
              Créer votre compte
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 1
                ? "Étape 1 — Identifiez votre entreprise"
                : "Étape 2 — Vos informations de connexion"}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              {wizardSteps.map((item) => (
                <div key={item.number} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        step >= item.number
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.number}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  {item.number < wizardSteps.length && (
                    <div
                      className={cn(
                        "mb-4 h-0.5 w-10 rounded-full",
                        step > item.number ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companySlug">Identifiant de votre entreprise</Label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="companySlug"
                      placeholder="afribank"
                      className={cn(
                        "h-11 pl-10 pr-10",
                        slugVerified && "border-emerald-500/60",
                        slugStatusMatchesCurrent &&
                          slugStatus.state === "taken" &&
                          "border-destructive/60"
                      )}
                      value={form.companySlug}
                      onChange={(e) => updateSlug(e.target.value)}
                      onBlur={() => {
                        if (form.companySlug) {
                          void checkSlug(form.companySlug);
                        }
                      }}
                      required
                      autoComplete="off"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {(slugStatus.state === "checking" || step1Loading) && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {slugVerified && !step1Loading && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                      {slugStatusMatchesCurrent &&
                        slugStatus.state === "taken" &&
                        !step1Loading && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      {slugStatusMatchesCurrent &&
                        slugStatus.state === "invalid" &&
                        !step1Loading && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lettres minuscules, chiffres et tirets — ex.{" "}
                    <span className="font-medium text-foreground">afribank</span>
                  </p>

                  {slugVerified && (
                    <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-medium">{normalizedSlug}</span> est disponible
                      </span>
                    </p>
                  )}

                  {slugStatusMatchesCurrent && slugStatus.state === "taken" && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                      <p className="text-destructive">
                        <span className="font-medium">{slugStatus.slug}</span> est déjà pris.
                      </p>
                      <button
                        type="button"
                        onClick={() => applySuggestion(slugStatus.suggestion)}
                        className="mt-1 font-medium text-primary hover:underline"
                      >
                        Utiliser {slugStatus.suggestion} à la place
                      </button>
                    </div>
                  )}

                  {slugStatusMatchesCurrent && slugStatus.state === "invalid" && (
                    <p className="text-sm text-destructive">{slugStatus.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="AfriBank SARL"
                      className="h-11 pl-10"
                      value={form.companyName}
                      onChange={(e) => updateCompanyName(e.target.value)}
                      required
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-11 w-full shadow-md shadow-primary/25"
                  disabled={!step1Ready || step1Loading || slugStatus.state === "checking"}
                  onClick={() => void goToStep2()}
                >
                  {step1Loading ? "Vérification..." : "Continuer"}
                  {!step1Loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Entreprise : </span>
                  <span className="font-medium">{form.companyName}</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span className="font-medium text-primary">{form.companySlug}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Votre nom</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Jean Dupont"
                      className="h-11 pl-10"
                      value={form.fullName}
                      onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@entreprise.com"
                      className="h-11 pl-10"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="8 caractères minimum"
                      className="h-11 pl-10"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 flex-1 shadow-md shadow-primary/25"
                    disabled={loading}
                  >
                    {loading ? "Création..." : "Créer mon compte"}
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
