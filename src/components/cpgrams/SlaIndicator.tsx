import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLA_STATE_META, type SlaState } from "@/lib/cpgrams/types";

const barTone: Record<SlaState, string> = {
  on_track: "bg-success",
  due_soon: "bg-warning",
  breached: "bg-critical",
  paused: "bg-border-strong",
};

const textTone: Record<SlaState, string> = {
  on_track: "text-success",
  due_soon: "text-warning-foreground",
  breached: "text-critical",
  paused: "text-muted-foreground",
};

export interface SlaIndicatorProps {
  state: SlaState;
  /** e.g. "12 of 30 days used" */
  label?: string;
  dueLabel?: string;
  percentElapsed?: number;
  compact?: boolean;
  className?: string;
}

export function SlaIndicator({
  state,
  label,
  dueLabel,
  percentElapsed = 0,
  compact = false,
  className,
}: SlaIndicatorProps) {
  const meta = SLA_STATE_META[state];
  const pct = Math.min(100, Math.max(0, percentElapsed));

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", textTone[state], className)}>
        <Clock className="size-3.5" aria-hidden />
        {meta.label}
        {dueLabel && <span className="text-muted-foreground">· {dueLabel}</span>}
      </span>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", textTone[state])}>
          <Clock className="size-4" aria-hidden />
          {meta.label}
        </span>
        {dueLabel && <span className="text-xs text-muted-foreground">{dueLabel}</span>}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Timeline progress: ${meta.label}`}
      >
        <div className={cn("h-full rounded-full transition-all", barTone[state])} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{label ?? meta.meaning}</p>
    </div>
  );
}
