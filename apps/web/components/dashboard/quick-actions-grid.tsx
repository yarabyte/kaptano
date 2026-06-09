import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  QrCode,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const accentStyles: Record<string, { bg: string; icon: string }> = {
  blue: { bg: "from-blue-50/80 to-white", icon: "bg-blue-500/10 text-blue-600" },
  emerald: { bg: "from-emerald-50/80 to-white", icon: "bg-emerald-500/10 text-emerald-600" },
  violet: { bg: "from-violet-50/80 to-white", icon: "bg-violet-500/10 text-violet-600" },
  amber: { bg: "from-amber-50/80 to-white", icon: "bg-amber-500/10 text-amber-600" },
};

type QuickActionsGridProps = {
  actions: QuickAction[];
};

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg">Actions rapides</CardTitle>
        <p className="text-sm text-muted-foreground">
          Accédez aux outils essentiels de votre stand
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ href, label, description, icon: Icon, accent }) => {
          const styles = accentStyles[accent] ?? accentStyles.blue;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border border-border/60 bg-gradient-to-br p-4 transition-all hover:border-primary/30 hover:shadow-md",
                styles.bg
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    styles.icon
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export const quickActionPresets = {
  capture: {
    href: "/dashboard/capture",
    label: "Capturer un lead",
    description: "Enregistrer un contact sur le terrain",
    icon: UserPlus,
    accent: "blue",
  },
  leads: {
    href: "/dashboard/leads",
    label: "Voir les leads",
    description: "Consulter et filtrer vos contacts",
    icon: Users,
    accent: "emerald",
  },
  stands: {
    href: "/dashboard/stands",
    label: "Gérer les stands",
    description: "QR codes et configuration par stand",
    icon: QrCode,
    accent: "violet",
  },
  events: {
    href: "/dashboard/events",
    label: "Événements",
    description: "Salons, foires et expositions",
    icon: Calendar,
    accent: "amber",
  },
} as const;
