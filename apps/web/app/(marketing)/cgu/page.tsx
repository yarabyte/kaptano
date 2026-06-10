import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { RateLimitsLegalSection } from "@/components/legal/rate-limits-section";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Kaptano",
  description:
    "CGU de la plateforme Kaptano : utilisation du service, WhatsApp, limites d'envoi et protection anti-ban.",
};

export default function CguPage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      description="Règles d'utilisation de la plateforme Kaptano pour les exposants, agents et visiteurs."
      sections={[
        {
          title: "1. Objet",
          paragraphs: [
            "Les présentes Conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Kaptano (https://www.kaptano.cloud), éditée par Kaptano, destinée à la capture de leads en salon professionnel et à la relance par WhatsApp.",
            "En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes CGU ainsi que les Conditions générales de vente (CGV) lors de la souscription d'un plan payant.",
          ],
        },
        {
          title: "2. Compte et accès",
          paragraphs: [
            "L'inscription est réservée aux professionnels agissant pour le compte d'une entreprise exposante. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.",
            "Kaptano se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes conditions, d'usage frauduleux ou de mise en danger de la plateforme ou des numéros WhatsApp connectés.",
          ],
        },
        {
          title: "3. Capture de leads et consentement",
          paragraphs: [
            "Tout lead enregistré via Kaptano doit avoir donné un consentement explicite (opt-in) pour être contacté par WhatsApp. Vous garantissez disposer des autorisations nécessaires pour traiter les données personnelles collectées sur votre stand.",
            "Vous vous engagez à respecter le RGPD, les lois locales sur la protection des données et les politiques de Meta/WhatsApp applicables à la messagerie commerciale.",
          ],
        },
        {
          title: "4. Messagerie WhatsApp",
          paragraphs: [
            "L'envoi de messages WhatsApp via Kaptano est déclenché manuellement par l'exposant ou selon les règles configurées dans son espace. Kaptano n'est pas responsable du contenu des messages que vous rédigez ou configurez.",
            "Vous vous interdisez tout envoi de spam, de contenu illicite, trompeur ou non sollicité. Le non-respect des règles WhatsApp peut entraîner la suspension de votre numéro, indépendamment de Kaptano.",
          ],
        },
        {
          title: "5. Disponibilité et maintenance",
          paragraphs: [
            "Kaptano est fourni en l'état. Nous nous efforçons d'assurer une haute disponibilité mais ne garantissons pas un fonctionnement ininterrompu, notamment en cas de maintenance, de panne réseau en salon ou d'indisponibilité des services tiers (WhatsApp, Wasender, hébergement).",
            "La PWA hors-ligne permet de stocker localement des leads en attente de synchronisation ; la responsabilité de la sauvegarde des données locales incombe à l'utilisateur de l'appareil.",
          ],
        },
        {
          title: "6. Propriété intellectuelle",
          paragraphs: [
            "Kaptano, son logo, son interface et ses logiciels restent la propriété de Kaptano. Vous conservez la propriété de vos catalogues, contenus et données leads.",
          ],
        },
        {
          title: "7. Limitation de responsabilité",
          paragraphs: [
            "Dans les limites autorisées par la loi, Kaptano ne pourra être tenu responsable des dommages indirects, pertes de chiffre d'affaires, restrictions WhatsApp ou sanctions imposées par des tiers résultant d'un usage non conforme du service.",
          ],
        },
        {
          title: "8. Contact",
          paragraphs: ["Pour toute question relative aux CGU : hello@kaptano.app"],
        },
      ]}
      extra={<RateLimitsLegalSection />}
    />
  );
}
