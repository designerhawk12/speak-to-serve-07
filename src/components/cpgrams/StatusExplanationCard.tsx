import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusChip } from "./StatusChip";
import {
  ADMIN_STATUS_META,
  CITIZEN_OUTCOME_META,
  type AdminStatus,
  type CitizenOutcomeStatus,
} from "@/lib/cpgrams/types";

export interface StatusExplanationCardProps {
  adminStatus: AdminStatus;
  citizenOutcome: CitizenOutcomeStatus;
  nextStep?: string;
  className?: string;
}

/**
 * Explains what is actually happening, keeping the government lane and the
 * citizen lane visibly separate (BUILD_CONTRACT #3).
 */
export function StatusExplanationCard({
  adminStatus,
  citizenOutcome,
  nextStep,
  className,
}: StatusExplanationCardProps) {
  const admin = ADMIN_STATUS_META[adminStatus];
  const citizen = CITIZEN_OUTCOME_META[citizenOutcome];

  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What the government says
          </p>
          <StatusChip label={admin.label} tone={admin.tone} size="lg" />
          <p className="text-sm leading-relaxed text-muted-foreground">{admin.meaning}</p>
        </div>
        <div className="space-y-2 md:border-l md:pl-6">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What you have confirmed
          </p>
          <StatusChip label={citizen.label} tone={citizen.tone} size="lg" />
          <p className="text-sm leading-relaxed text-muted-foreground">{citizen.meaning}</p>
        </div>
        {nextStep && (
          <div className="rounded-md bg-surface-sunken p-4 text-sm md:col-span-2">
            <span className="font-semibold">What happens next: </span>
            <span className="text-muted-foreground">{nextStep}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
