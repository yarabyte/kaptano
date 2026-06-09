"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
};

export function LeadCaptureForm({ onSubmit, resetAfterSubmit = false }: Props) {
  const [form, setForm] = useState({
    fullName: "",
    whatsappNumber: "",
    email: "",
    company: "",
    interest: "",
    optInConsent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.optInConsent) {
      setError("Vous devez accepter de recevoir notre catalogue par WhatsApp");
      return;
    }

    const normalized = normalizePhoneToE164(form.whatsappNumber);
    if (!normalized) {
      setError("Numéro WhatsApp invalide");
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
        setForm({
          fullName: "",
          whatsappNumber: "",
          email: "",
          company: "",
          interest: "",
          optInConsent: false,
        });
      }
    } catch {
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => update("whatsappNumber", e.target.value)}
              placeholder="+237 6XX XXX XXX"
              required
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest">Intérêt / commentaire</Label>
            <Input
              id="interest"
              value={form.interest}
              onChange={(e) => update("interest", e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-accent/50 p-3">
            <Checkbox
              id="optIn"
              checked={form.optInConsent}
              onCheckedChange={(checked) => update("optInConsent", checked === true)}
            />
            <Label htmlFor="optIn" className="text-sm leading-relaxed">
              J&apos;accepte de recevoir le catalogue et les informations de l&apos;exposant par WhatsApp *
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
