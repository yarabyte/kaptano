import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DispatchProgress = {
  batchId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  total: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progress: number;
};

type DispatchProgressBarProps = {
  progress: DispatchProgress;
  preparing?: boolean;
};

function ProgressChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", color)}>
      {label} : {count}
    </span>
  );
}

export function DispatchProgressBar({
  progress,
  preparing = false,
}: DispatchProgressBarProps) {
  const isRunning = progress.status === "RUNNING" || preparing;
  const processed =
    progress.sent + progress.delivered + progress.read + progress.failed;
  const displayProgress = preparing ? 0 : progress.progress;

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {preparing
            ? "Préparation de l'envoi…"
            : progress.status === "RUNNING"
              ? "Envoi en cours"
              : progress.status === "COMPLETED"
                ? "Envoi terminé"
                : "Envoi terminé avec erreurs"}
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {processed}/{progress.total} · {displayProgress}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-500",
            isRunning && displayProgress < 100 && "animate-pulse"
          )}
          style={{ width: `${Math.max(displayProgress, isRunning ? 4 : 0)}%` }}
        />
      </div>

      {!preparing && (
        <div className="flex flex-wrap gap-2">
          <ProgressChip
            label="En attente"
            count={progress.queued + progress.sending}
            color="bg-muted text-muted-foreground"
          />
          <ProgressChip
            label="Envoyés"
            count={progress.sent}
            color="bg-primary/10 text-primary"
          />
          <ProgressChip
            label="Livrés"
            count={progress.delivered}
            color="bg-emerald-50 text-emerald-700"
          />
          <ProgressChip
            label="Lus"
            count={progress.read}
            color="bg-blue-50 text-blue-700"
          />
          <ProgressChip
            label="Échecs"
            count={progress.failed}
            color="bg-destructive/10 text-destructive"
          />
        </div>
      )}
    </div>
  );
}
