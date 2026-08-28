import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusChip } from "./StatusChip";
import { SlaIndicator } from "./SlaIndicator";
import { PriorityIndicator } from "./PriorityIndicator";
import type { GrievancePriorityRow } from "@/lib/cpgrams/data-access";
import { ADMIN_STATUS_META, type GrievanceSummary } from "@/lib/cpgrams/types";
import { citizenOutcomeMetaForViewer } from "@/lib/cpgrams/resolution-lifecycle";

export interface GrievanceCardProps {
  grievance: GrievanceSummary;
  /** Officer view shows office-side metadata rather than citizen guidance. */
  variant?: "citizen" | "officer";
  priority?: GrievancePriorityRow | null | undefined;
  className?: string;
}

export function GrievanceCard({
  grievance: g,
  variant = "citizen",
  priority,
  className,
}: GrievanceCardProps) {
  const admin = ADMIN_STATUS_META[g.adminStatus];
  const citizen = citizenOutcomeMetaForViewer(
    g.citizenOutcome,
    variant === "citizen" ? "citizen" : "government",
  );

  return (
    <Card className={cn("transition-shadow hover:shadow-raised", className)}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip lane="Government" label={admin.label} tone={admin.tone} />
          <StatusChip
            lane={variant === "citizen" ? "You" : "Citizen"}
            label={citizen.label}
            tone={citizen.tone}
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-base leading-snug font-semibold">{g.shortTitle}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{g.originalText}</p>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1.5">
            <dt className="font-medium">Reg. no.</dt>
            <dd className="font-mono">{g.registrationNumber}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium">Lodged</dt>
            <dd>{g.lodgedAt}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium">Updated</dt>
            <dd>{g.lastUpdated}</dd>
          </div>
          {g.category && (
            <div className="flex gap-1.5">
              <dt className="font-medium">Category</dt>
              <dd>{g.category}</dd>
            </div>
          )}
          {g.office && (
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5" aria-hidden />
              <dd>{g.office}</dd>
            </div>
          )}
        </dl>

        {g.sla && <SlaIndicator {...g.sla} />}

        {variant === "officer" && <PriorityIndicator priority={priority} />}

        {g.actionRequired && (
          <div className="rounded-md border border-warning/35 bg-warning-surface px-3 py-2">
            <p className="text-xs font-bold tracking-wide text-warning-foreground uppercase">
              Action required
            </p>
            <p className="mt-1 text-sm text-warning-foreground">{g.actionRequired}</p>
          </div>
        )}

        <Link
          to={variant === "officer" ? "/office/cases/$id" : "/citizen/grievances/$id"}
          params={{ id: g.id }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary hover:underline"
        >
          {variant === "officer" ? "Open case file" : "View case"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
