export const LEGAL_LAST_UPDATED = "9 juin 2026";

export const RATE_LIMIT_SECTION = {
  title: "Limites d'envoi WhatsApp et protection anti-ban",
  intro:
    "Kaptano s'appuie sur l'API Wasender pour l'envoi de messages WhatsApp. Des limites techniques s'appliquent pour garantir la stabilité de la plateforme, le respect des règles WhatsApp et la protection de votre numéro contre les restrictions ou suspensions.",
  items: [
    {
      label: "Protection compte (recommandée)",
      detail:
        "Lorsque la protection compte est activée sur Wasender, la limite est d'environ 1 requête d'envoi toutes les 5 secondes. Cette règle prime sur les limites des plans payants.",
    },
    {
      label: "Plans payants Wasender",
      detail: "Jusqu'à 256 requêtes d'envoi par minute, sous réserve des paramètres de sécurité du compte.",
    },
    {
      label: "Essai gratuit Wasender",
      detail: "1 message par minute maximum et 50 messages par jour.",
    },
    {
      label: "Plafonds Kaptano",
      detail:
        "Des plafonds quotidiens par exposant et globaux peuvent s'appliquer (par défaut 200 messages par exposant et par jour sur la plateforme). Kaptano étale automatiquement les envois (intervalle de 3 à 8 secondes en envoi manuel, 20 à 60 secondes en envoi programmé) pour limiter les risques de restriction.",
    },
    {
      label: "Concurrence",
      detail:
        "Les envois simultanés sont limités (1 à 5 requêtes concurrentes par session). Un envoi massif simultané, même dans les limites par minute, peut entraîner des restrictions WhatsApp.",
    },
    {
      label: "Consentement opt-in",
      detail:
        "Aucun message ne peut être envoyé sans consentement explicite du destinataire. Le non-respect de cette règle expose votre compte à des sanctions WhatsApp et Kaptano.",
    },
    {
      label: "Endpoints sensibles",
      detail:
        "Certaines actions Wasender (vérification de numéro, photo de profil, métadonnées de groupe) sont soumises à des quotas journaliers stricts et ne doivent pas être utilisées de manière automatisée ou massive.",
    },
  ],
  footer:
    "Kaptano peut suspendre ou ralentir temporairement les envois en cas de dépassement répété des limites ou de comportement jugé à risque. Consultez la documentation Wasender : https://wasenderapi.com/api-docs/rate-limits/understanding-rate-limits",
};
