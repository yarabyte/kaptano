import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardVariant = "blue" | "emerald" | "violet" | "amber";

const variantStyles: Record<
  StatCardVariant,
  { icon: string; value: string; ring: string }
> = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    value: "text-blue-950",
    ring: "from-blue-500/5 to-blue-500/0",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    value: "text-emerald-950",
    ring: "from-emerald-500/5 to-emerald-500/0",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600",
    value: "text-violet-950",
    ring: "from-violet-500/5 to-violet-500/0",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
    value: "text-amber-950",
    ring: "from-amber-500/5 to-amber-500/0",
  },
};

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  hint?: string;
  variant?: StatCardVariant;
  footer?: React.ReactNode;
  className?: string;
};

export function StatCard({
  title,
  value,
  icon,
  hint,
  variant = "blue",
  footer,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          styles.ring
        )}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className={cn(
                "mt-2 font-heading text-3xl font-bold tracking-tight",
                styles.value
              )}
            >
              {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              styles.icon
            )}
          >
            {icon}
          </div>
        </div>
        {footer && <div className="mt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}
