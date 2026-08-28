import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ActionRequiredCard,
  EmptyState,
  ErrorState,
  GrievanceCard,
  KpiCard,
  LoadingState,
  PageHeader,
} from "@/components/cpgrams";
import { toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { isWaitingOnCitizen } from "@/lib/cpgrams/officer-presentation";
import { queryErrorDetail, useAuthorizedGrievancesQuery } from "@/lib/cpgrams/queries";
import { PRIORITY_RANK } from "@/lib/cpgrams/priority-engine";
import { isOriginalGovernmentProcessingActive } from "@/lib/cpgrams/resolution-lifecycle";

export const Route = createFileRoute("/office/")({
  head: () => ({
    meta: [
      { title: "Office workspace — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Your queue, breached timelines, and cases where citizens report the problem still persists.",
      },
      { property: "og:title", content: "Office workspace" },
      {
        property: "og:description",
        content: "Officer queue with real citizen outcomes, not just disposal counts.",
      },
    ],
  }),
  component: OfficeHome,
});

function OfficeHome() {
  const navigate = useNavigate();
  const casesQuery = useAuthorizedGrievancesQuery();
  const grievances = (casesQuery.data?.grievances ?? []).map((row) =>
    toGrievanceSummary(
      row,
      row.organization_id ? casesQuery.data?.organizations[row.organization_id]?.name : undefined,
      casesQuery.data?.appealsByGrievance[row.id] ?? [],
      casesQuery.data?.requestsByGrievance[row.id] ?? [],
    ),
  );
  const activeGrievanceIds = new Set(
    (casesQuery.data?.grievances ?? [])
      .filter((row) =>
        isOriginalGovernmentProcessingActive(
          row.administrative_state,
          row.citizen_confirmation_state,
        ),
      )
      .map((row) => row.id),
  );
  const activeGrievances = grievances.filter((grievance) => activeGrievanceIds.has(grievance.id));
  const persistent = grievances.filter((g) => g.citizenOutcome === "problem_persists");
  const critical = activeGrievances.filter(
    (g) => casesQuery.data?.prioritiesByGrievance[g.id]?.priority_level === "CRITICAL",
  );
  const highPriority = activeGrievances.filter(
    (g) => casesQuery.data?.prioritiesByGrievance[g.id]?.priority_level === "HIGH",
  );
  const slaRisk = activeGrievances.filter(
    (g) => g.sla?.state === "due_soon" || g.sla?.state === "breached",
  );
  const waitingCitizen = activeGrievances.filter((g) =>
    isWaitingOnCitizen(g, casesQuery.data?.prioritiesByGrievance[g.id]),
  );
  const waitingOfficer = activeGrievances.filter(
    (g) =>
      !isWaitingOnCitizen(g, casesQuery.data?.prioritiesByGrievance[g.id]) &&
      !["action_taken", "disposed", "closed_administratively"].includes(g.adminStatus),
  );
  const newlyAssigned = activeGrievances.filter((g) => g.adminStatus === "assigned");
  const related = grievances.filter(
    (g) =>
      g.category && grievances.some((other) => other.id !== g.id && other.category === g.category),
  ).length;
  const priorityQueue = [...activeGrievances].sort((a, b) => {
    const aPriority = casesQuery.data?.prioritiesByGrievance[a.id];
    const bPriority = casesQuery.data?.prioritiesByGrievance[b.id];
    const levelDifference =
      PRIORITY_RANK[bPriority?.priority_level ?? "NORMAL"] -
      PRIORITY_RANK[aPriority?.priority_level ?? "NORMAL"];
    return levelDifference || (bPriority?.priority_score ?? 0) - (aPriority?.priority_score ?? 0);
  });
  const actionableQueue = priorityQueue.filter(
    (g) => !isWaitingOnCitizen(g, casesQuery.data?.prioritiesByGrievance[g.id]),
  );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Today in your office"
        description="Disposal is not the finish line. Cases where citizens report the problem persists are surfaced first."
        actions={
          <Button asChild variant="outline">
            <Link to="/office/cases" search={{ attention: undefined }}>
              Open full case list
            </Link>
          </Button>
        }
      />

      <section className="space-y-3" aria-labelledby="attention-summary">
        <div>
          <h2 id="attention-summary" className="text-lg font-semibold">
            Work needing attention
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Priority and SLA risk lead the queue. Cases waiting on the citizen are separated so
            paused work is not mistaken for officer inactivity.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Critical"
            value={critical.length}
            tone="critical"
            helpText="Recorded CRITICAL priority"
          />
          <KpiCard
            label="High priority"
            value={highPriority.length}
            tone="warning"
            helpText="Recorded HIGH priority"
          />
          <KpiCard
            label="SLA risk"
            value={slaRisk.length}
            tone="warning"
            helpText="Due soon or overdue"
          />
          <KpiCard
            label="Waiting for officer"
            value={waitingOfficer.length}
            helpText="Actionable by this office"
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="queue-context">
        <h2 id="queue-context" className="text-sm font-semibold text-muted-foreground">
          Queue context
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Waiting for citizen"
            value={waitingCitizen.length}
            tone="info"
            helpText="Government inactivity escalation paused"
          />
          <KpiCard
            label="Newly assigned"
            value={newlyAssigned.length}
            helpText="Assigned and awaiting review"
          />
          <KpiCard
            label="Possible related cases"
            value={related}
            helpText="Shares a category with another visible case"
          />
        </div>
      </section>

      {persistent.length > 0 && (
        <ActionRequiredCard
          severity="critical"
          title={`${persistent.length} ${persistent.length === 1 ? "case was" : "cases were"} reported unresolved by citizens`}
          description="These need a human review before they can be treated as resolved."
          actionLabel="Review these cases"
          onAction={() => void navigate({ to: "/office/cases", search: { attention: "appeal" } })}
        />
      )}

      <section className="space-y-4" aria-labelledby="office-queue">
        <h2 id="office-queue" className="text-lg font-semibold">
          Actionable priority queue
        </h2>
        <p className="text-sm text-muted-foreground">
          Ordered by the persisted priority level and score. Use the full queue to review cases
          waiting on citizen action.
        </p>
        {casesQuery.isPending ? (
          <LoadingState label="Loading authorized cases" />
        ) : casesQuery.isError ? (
          <ErrorState
            detail={queryErrorDetail(casesQuery.error)}
            onRetry={() => void casesQuery.refetch()}
          />
        ) : actionableQueue.length === 0 ? (
          <EmptyState
            title="No actionable cases"
            description="Cases waiting on required citizen action remain available in the full case list."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {actionableQueue.slice(0, 6).map((g) => (
              <GrievanceCard
                key={g.id}
                grievance={g}
                variant="officer"
                priority={casesQuery.data?.prioritiesByGrievance[g.id]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
