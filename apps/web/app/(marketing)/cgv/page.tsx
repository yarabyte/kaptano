import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { RateLimitsLegalSection } from "@/components/legal/rate-limits-section";

export const metadata: Metadata = {
  title: "Conditions générales de vente — Kaptano",
  description:
    "CGV Kaptano : abonnements, tarifs, paiement, résiliation et limites d'utilisation WhatsApp.",
};

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      description="Conditions applicables à la souscription et à l'utilisation des plans Kaptano."
      sections={[
        {
          title: "1. Offres et tarifs",
          paragraphs: [
            "Les plans (Gratuit, Starter, Growth, Scale) et leurs tarifs sont présentés sur la page Tarifs de kaptano.cloud. Les prix sont indiqués en francs CFA (XAF) hors taxes, sauf mention contraire.",
            "Kaptano peut faire évoluer ses tarifs avec un préavis raisonnable. Les abonnements en cours sont régis par les conditions acceptées au moment de la souscription, sauf accord contraire.",
          ],
        },
        {
          title: "2. Souscription et paiement",
          paragraphs: [
            "La souscription à un plan payant s'effectue depuis l'espace exposant après création du compte. Le paiement est traité via notre prestataire CinetPay (ou tout autre moyen indiqué sur la plateforme).",
            "L'accès aux fonctionnalités du plan choisi est activé après confirmation du paiement. En cas d'échec de paiement, le compte peut être rétrogradé ou suspendu.",
          ],
        },
        {
          title: "3. Durée et résiliation",
          paragraphs: [
            "Les abonnements payants sont conclus pour une période mensuelle renouvelable, sauf indication contraire. Vous pouvez résilier à tout moment depuis votre espace ; la résiliation prend effet à la fin de la période en cours, sans remboursement au prorata sauf obligation légale.",
            "Kaptano peut résilier un abonnement en cas de manquement grave aux CGU/CGV, notamment en cas d'abus d'envoi WhatsApp ou de non-respect du consentement opt-in.",
          ],
        },
        {
          title: "4. Quotas et fair use",
          paragraphs: [
            "Chaque plan inclut des quotas de leads et des plafonds d'envoi WhatsApp. Le plan Gratuit peut utiliser un numéro WhatsApp partagé géré par Kaptano ; les plans supérieurs peuvent connecter un numéro dédié selon les conditions du plan.",
            "Un usage manifestement excessif, automatisé ou contraire aux bonnes pratiques WhatsApp peut entraîner une limitation temporaire des envois, même si le quota théorique du plan n'est pas atteint.",
          ],
        },
        {
          title: "5. Remboursement",
          paragraphs: [
            "Sauf disposition légale impérative, les sommes versées pour un abonnement en cours ne sont pas remboursables. En cas de dysfonctionnement majeur imputable à Kaptano, contactez hello@kaptano.app.",
          ],
        },
        {
          title: "6. Acceptation",
          paragraphs: [
            "La création d'un compte implique l'acceptation des présentes CGV et des CGU. La case à cocher lors de l'inscription vaut signature électronique de votre part.",
          ],
        },
        {
          title: "7. Droit applicable",
          paragraphs: [
            "Les présentes CGV sont soumises au droit applicable au siège de Kaptano. Tout litige sera soumis aux tribunaux compétents après tentative de résolution amiable.",
          ],
        },
      ]}
      extra={<RateLimitsLegalSection />}
    />
  );
}
