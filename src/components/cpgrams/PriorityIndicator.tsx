import { StatusChip } from "./StatusChip";
import type { GrievancePriorityRow } from "@/lib/cpgrams/data-access";
import type { StatusTone } from "@/lib/cpgrams/types";

const TONES: Record<GrievancePriorityRow["priority_level"], StatusTone> = {
  NORMAL: "neutral",
  ELEVATED: "info",
  HIGH: "warning",
  CRITICAL: "critical",
};

export function PriorityIndicator({
  priority,
  compact = false,
  showCitizenWait = true,
}: {
  priority: GrievancePriorityRow | null | undefined;
  compact?: boolean;
  /** Shows the persisted pause fact; it never recalculates priority in the UI. */
  showCitizenWait?: boolean;
}) {
  if (!priority) return <span className="text-sm text-muted-foreground">Not evaluated</span>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip label={priority.priority_level} tone={TONES[priority.priority_level]} />
        <span className="text-xs text-muted-foreground">Score {priority.priority_score}</span>
      </div>
      {showCitizenWait && priority.waiting_on_citizen && (
        <div className="rounded-md border border-info/30 bg-info-surface px-3 py-2 text-xs text-info">
          <span className="font-semibold">Waiting for citizen. </span>
          Government inactivity escalation is paused while required citizen action is outstanding.
        </div>
      )}
      {!compact && (
        <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-semibold text-foreground">
            Why this priority?
          </summary>
          {priority.priority_reasons.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              {priority.priority_reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">
              No dynamic escalation factor currently applies.
            </p>
          )}
          {priority.next_escalation_at && (
            <p className="mt-2 text-muted-foreground">
              Next threshold: {new Date(priority.next_escalation_at).toLocaleString("en-IN")}
            </p>
          )}
        </details>
      )}
    </div>
  );
}
