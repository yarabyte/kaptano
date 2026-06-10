import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Cible", description: "Filtrer par stand" },
  { id: 2, label: "Message", description: "Format du message" },
  { id: 3, label: "Envoi", description: "Récapitulatif" },
] as const;

export type WizardStep = (typeof STEPS)[number]["id"];

type WhatsappStepIndicatorProps = {
  currentStep: WizardStep;
  maxReached: WizardStep;
  onStepClick?: (step: WizardStep) => void;
};

export function WhatsappStepIndicator({
  currentStep,
  maxReached,
  onStepClick,
}: WhatsappStepIndicatorProps) {
  return (
    <nav aria-label="Étapes de la campagne" className="w-full">
      <ol className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          const reachable = step.id <= maxReached;
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              <button
                type="button"
                disabled={!reachable || !onStepClick}
                onClick={() => reachable && onStepClick?.(step.id)}
                className={cn(
                  "group flex min-w-0 items-center gap-2 sm:gap-3",
                  reachable && onStepClick && "cursor-pointer",
                  !reachable && "cursor-default opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary bg-primary/10 text-primary",
                    !active && !done && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : step.id}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 hidden h-0.5 flex-1 sm:block",
                    step.id < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground sm:hidden">
        Étape {currentStep} sur 3 — {STEPS[currentStep - 1].description}
      </p>
    </nav>
  );
}
