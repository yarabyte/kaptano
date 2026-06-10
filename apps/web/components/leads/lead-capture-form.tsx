"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  User,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { normalizePhoneToE164 } from "@/lib/phone";

type LeadFormValues = {
  fullName: string;
  whatsappNumber: string;
  email?: string;
  company?: string;
  interest?: string;
  optInConsent: boolean;
};

type Props = {
  onSubmit: (values: LeadFormValues) => Promise<void>;
  resetAfterSubmit?: boolean;
  variant?: "default" | "agent";
};

const emptyForm = {
  fullName: "",
  whatsappNumber: "",
  email: "",
  company: "",
  interest: "",
  optInConsent: false,
};

export function LeadCaptureForm({
  onSubmit,
  resetAfterSubmit = false,
  variant = "default",
}: Props) {
  const isAgent = variant === "agent";
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [showOptional, setShowOptional] = useState(!isAgent);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (isAgent) {
      nameRef.current?.focus();
    }
  }, [focusKey, isAgent]);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setShowOptional(!isAgent);
    setFocusKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.optInConsent) {
      setError("Le visiteur doit accepter de recevoir le catalogue par WhatsApp");
      return;
    }

    const normalized = normalizePhoneToE164(form.whatsappNumber);
    if (!normalized) {
      setError("Numéro WhatsApp invalide — vérifiez le format (+237…)");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        whatsappNumber: normalized,
        email: form.email.trim() || undefined,
        company: form.company.trim() || undefined,
        interest: form.interest.trim() || undefined,
        optInConsent: true,
      });

      if (resetAfterSubmit) {
        resetForm();
      }
    } catch {
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = cn(isAgent && "h-12 text-base");
  const labelClass = cn(isAgent && "text-sm font-medium");

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 shadow-sm",
        isAgent && "border-primary/15 shadow-md"
      )}
    >
      {isAgent && (
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-accent/30 to-white pb-4">
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            Nouveau visiteur
          </CardTitle>
          <CardDescription>
            Saisissez les informations essentielles — un message de remerciement part par WhatsApp.
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={cn("pt-6", isAgent && "pt-5")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={cn("grid gap-4", isAgent && "sm:grid-cols-2")}>
            <div className="space-y-2">
              <Label htmlFor="fullName" className={labelClass}>
                Nom complet *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={nameRef}
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jean Dupont"
                  className={cn(inputClass, "pl-10")}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className={labelClass}>
                WhatsApp *
              </Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <Input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => update("whatsappNumber", e.target.value)}
                  placeholder="+237 6 12 34 56 78"
                  required
                  autoComplete="tel"
                  className={cn(inputClass, "pl-10")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {isAgent && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-full gap-2 text-muted-foreground"
              onClick={() => setShowOptional((v) => !v)}
            >
              {showOptional ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Masquer les champs optionnels
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Email, entreprise, commentaire (optionnel)
                </>
              )}
            </Button>
          )}

          {showOptional && (
            <div
              className={cn(
                "space-y-4",
                isAgent && "rounded-xl border border-dashed border-border/80 bg-accent/20 p-4"
              )}
            >
              {isAgent && (
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Informations complémentaires
                </p>
              )}
              <div className={cn("grid gap-4", isAgent && "sm:grid-cols-2")}>
                <div className="space-y-2">
                  <Label htmlFor="email" className={labelClass}>
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      autoComplete="email"
                      placeholder="contact@entreprise.com"
                      className={cn(inputClass, "pl-10")}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className={labelClass}>
                    Entreprise
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className={cn(inputClass, "pl-10")}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest" className={labelClass}>
                  Intérêt / commentaire
                </Label>
                <textarea
                  id="interest"
                  value={form.interest}
                  onChange={(e) => update("interest", e.target.value)}
                  placeholder="Produit consulté, besoin exprimé…"
                  rows={isAgent ? 2 : 3}
                  disabled={loading}
                  className={cn(
                    "flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    isAgent && "min-h-[4.5rem] text-base"
                  )}
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              isAgent
                ? "border-emerald-200/80 bg-emerald-50/80"
                : "border-primary/20 bg-accent/50"
            )}
          >
            <Checkbox
              id="optIn"
              checked={form.optInConsent}
              onCheckedChange={(checked) => update("optInConsent", checked === true)}
              disabled={loading}
              className={cn(isAgent && "mt-0.5 h-5 w-5")}
            />
            <Label
              htmlFor="optIn"
              className={cn(
                "cursor-pointer leading-relaxed",
                isAgent ? "text-sm text-emerald-950" : "text-sm"
              )}
            >
              Le visiteur accepte de recevoir le catalogue et les informations de
              l&apos;exposant par WhatsApp *
            </Label>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className={cn("w-full gap-2", isAgent && "h-12 text-base font-semibold")}
            size={isAgent ? "lg" : "lg"}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {isAgent ? "Enregistrer le lead" : "Envoyer"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
