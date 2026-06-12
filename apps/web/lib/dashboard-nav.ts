import type { UserRole } from "@kaptano/db";

export type DashboardNavIcon =
  | "layout-dashboard"
  | "users"
  | "user-plus"
  | "calendar"
  | "qr-code"
  | "file-text"
  | "message-circle"
  | "credit-card";

export type DashboardNavConfigItem = {
  href: string;
  label: string;
  icon: DashboardNavIcon;
  roles: UserRole[];
};

export const dashboardNavItems: DashboardNavConfigItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "layout-dashboard", roles: ["EXHIBITOR_ADMIN", "AGENT"] },
  { href: "/dashboard/leads", label: "Leads", icon: "users", roles: ["EXHIBITOR_ADMIN", "AGENT"] },
  { href: "/dashboard/capture", label: "Capture agent", icon: "user-plus", roles: ["EXHIBITOR_ADMIN", "AGENT"] },
  { href: "/dashboard/events", label: "Événements", icon: "calendar", roles: ["EXHIBITOR_ADMIN"] },
  { href: "/dashboard/stands", label: "Stands", icon: "qr-code", roles: ["EXHIBITOR_ADMIN"] },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: "message-circle", roles: ["EXHIBITOR_ADMIN"] },
  { href: "/dashboard/team", label: "Équipe", icon: "users", roles: ["EXHIBITOR_ADMIN"] },
  { href: "/dashboard/billing", label: "Facturation", icon: "credit-card", roles: ["EXHIBITOR_ADMIN"] },
];

export function filterNavForRole(role: UserRole) {
  return dashboardNavItems
    .filter((item) => item.roles.includes(role))
    .map(({ href, label, icon }) => ({ href, label, icon }));
}
