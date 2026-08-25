import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusChip } from "./StatusChip";
import type { RequestedOutcome } from "@/lib/cpgrams/types";

export interface RequestedOutcomeCardProps {
  outcome: RequestedOutcome;
  /** Verbatim original grievance text (BUILD_CONTRACT #10). */
  originalText?: string;
  className?: string;
}

const urgencyLabel = {
  routine: "Routine",
  time_sensitive: "Time sensitive",
  urgent: "Urgent",
} as const;

export function RequestedOutcomeCard({ outcome, originalText, className }: RequestedOutcomeCardProps) {
  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">What the citizen wants to happen</h3>
          <div className="flex gap-2">
            {outcome.category && <StatusChip label={outcome.category} tone="neutral" dot={false} />}
            {outcome.urgency && (
              <StatusChip
                label={urgencyLabel[outcome.urgency]}
                tone={outcome.urgency === "urgent" ? "critical" : outcome.urgency === "time_sensitive" ? "warning" : "neutral"}
              />
            )}
          </div>
        </div>

        <blockquote className="relative rounded-md border-l-4 border-primary bg-surface-sunken p-4 pl-10 text-sm leading-relaxed">
          <Quote className="absolute top-4 left-3 size-4 text-primary" aria-hidden />
          {outcome.citizenWords}
        </blockquote>

        {originalText && (
          <details className="text-sm">
            <summary className="focus-ring cursor-pointer rounded-md font-medium text-primary">
              Read the original description, unedited
            </summary>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground">{originalText}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
