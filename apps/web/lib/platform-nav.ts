export type PlatformNavIcon =
  | "layout-dashboard"
  | "building"
  | "message-circle"
  | "credit-card"
  | "alert-triangle";

export type PlatformNavItem = {
  href: string;
  label: string;
  icon: PlatformNavIcon;
  description?: string;
};

export const platformNav: PlatformNavItem[] = [
  {
    href: "/platform",
    label: "Vue d'ensemble",
    icon: "layout-dashboard",
    description: "Statistiques et activité récente",
  },
  {
    href: "/platform/tenants",
    label: "Espaces exposants",
    icon: "building",
    description: "Gestion des comptes et plans",
  },
  {
    href: "/platform/whatsapp",
    label: "WhatsApp partagé",
    icon: "message-circle",
    description: "Numéro Gratuit & Starter",
  },
  {
    href: "/platform/payments",
    label: "Paiements",
    icon: "credit-card",
    description: "Historique CinetPay",
  },
  {
    href: "/platform/messages",
    label: "Messages en échec",
    icon: "alert-triangle",
    description: "Jobs WhatsApp échoués",
  },
];
