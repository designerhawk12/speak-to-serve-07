import { Check, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppealRow, GrievanceRow } from "@/lib/cpgrams/data-access";

interface JourneyStage {
  id: string;
  label: string;
}

function currentJourneyStage(grievance: GrievanceRow, appeals: AppealRow[]): number {
  if (appeals.length > 0 || grievance.administrative_state === "APPEAL_FILED") return 4;
  if (grievance.citizen_confirmation_state === "CONFIRMED_RESOLVED") return 4;
  if (
    grievance.outcome_state === "RESOLUTION_PROPOSED" &&
    grievance.citizen_confirmation_state === "AWAITING_CONFIRMATION"
  )
    return 3;
  if (
    [
      "CITIZEN_RESPONSE_RECEIVED",
      "ACTION_IN_PROGRESS",
      "INTERIM_RESPONSE",
      "RESOLUTION_PROVIDED",
      "DISPOSED",
      "CLOSED",
    ].includes(grievance.administrative_state)
  )
    return 2;
  if (
    ["ROUTING", "ROUTED", "UNDER_EXAMINATION", "ASSIGNED", "CLARIFICATION_REQUIRED"].includes(
      grievance.administrative_state,
    )
  )
    return 1;
  return 0;
}

export function CaseJourney({
  grievance,
  appeals,
}: {
  grievance: GrievanceRow;
  appeals: AppealRow[];
}) {
  const finalLabel =
    appeals.length > 0 || grievance.administrative_state === "APPEAL_FILED"
      ? "Appealed"
      : "Resolved";
  const stages: JourneyStage[] = [
    { id: "submitted", label: "Submitted" },
    { id: "examination", label: "Under examination" },
    { id: "government-action", label: "Government action" },
    { id: "resolution-review", label: "Resolution review" },
    { id: "final", label: finalLabel },
  ];
  const current = currentJourneyStage(grievance, appeals);

  return (
    <section className="space-y-4" aria-labelledby="case-journey-title">
      <div>
        <h2 id="case-journey-title" className="text-lg font-semibold">
          Case journey
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The recorded government process and your separate outcome confirmation are shown below.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Case journey">
        {stages.map((stage, index) => {
          const state = index < current ? "complete" : index === current ? "current" : "upcoming";
          return (
            <li
              key={stage.id}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "rounded-lg border p-4",
                state === "current"
                  ? "border-primary bg-accent shadow-card"
                  : state === "complete"
                    ? "border-info/35 bg-info-surface"
                    : "border-border bg-surface-raised",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    state === "complete"
                      ? "border-info bg-info text-info-foreground"
                      : state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {state === "complete" ? (
                    <Check className="size-4" />
                  ) : state === "current" ? (
                    <CircleDot className="size-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold">{stage.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {state === "complete"
                      ? "Completed"
                      : state === "current"
                        ? "Current stage"
                        : "Upcoming"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
