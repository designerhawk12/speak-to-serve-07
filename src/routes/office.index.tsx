import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ActionRequiredCard, EmptyState, ErrorState, GrievanceCard, KpiCard, LoadingState, PageHeader } from "@/components/cpgrams";
import { toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAuthorizedGrievancesQuery } from "@/lib/cpgrams/queries";
import { PRIORITY_RANK } from "@/lib/cpgrams/priority-engine";

export const Route = createFileRoute("/office/")({
  head: () => ({
    meta: [
      { title: "Office workspace — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Your queue, breached timelines, and cases where citizens report the problem still persists.",
      },
      { property: "og:title", content: "Office workspace" },
      { property: "og:description", content: "Officer queue with real citizen outcomes, not just disposal counts." },
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
  const persistent = grievances.filter((g) => g.citizenOutcome === "problem_persists");
  const urgent = grievances.filter((g) => casesQuery.data?.prioritiesByGrievance[g.id]?.priority_level === "CRITICAL" || g.urgency === "urgent");
  const highPriority = grievances.filter((g) => casesQuery.data?.prioritiesByGrievance[g.id]?.priority_level === "HIGH");
  const slaRisk = grievances.filter((g) => g.sla?.state === "due_soon" || g.sla?.state === "breached");
  const waitingCitizen = grievances.filter((g) => g.adminStatus === "awaiting_citizen_input" || Boolean(g.actionRequired));
  const waitingOfficer = grievances.filter((g) => !["awaiting_citizen_input", "action_taken", "disposed", "closed_administratively"].includes(g.adminStatus));
  const newlyAssigned = grievances.filter((g) => g.adminStatus === "assigned");
  const related = grievances.filter((g) => g.category && grievances.some((other) => other.id !== g.id && other.category === g.category)).length;
  const priorityQueue = [...grievances].sort((a, b) => {
    const aPriority = casesQuery.data?.prioritiesByGrievance[a.id];
    const bPriority = casesQuery.data?.prioritiesByGrievance[b.id];
    const levelDifference = PRIORITY_RANK[bPriority?.priority_level ?? "NORMAL"] - PRIORITY_RANK[aPriority?.priority_level ?? "NORMAL"];
    return levelDifference || (bPriority?.priority_score ?? 0) - (aPriority?.priority_score ?? 0);
  });
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Today in your office"
        description="Disposal is not the finish line. Cases where citizens report the problem persists are surfaced first."
        actions={
          <Button asChild variant="outline">
            <Link to="/office/cases" search={{ attention: undefined }}>Open full case list</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Critical / urgent" value={urgent.length} tone="critical" helpText="Critical dynamic priority or citizen-marked urgency" />
        <KpiCard label="High priority" value={highPriority.length} tone="warning" helpText="Deterministic priority engine result" />
        <KpiCard label="SLA risk" value={slaRisk.length} tone="warning" helpText="Due soon or overdue" />
        <KpiCard label="Waiting for officer" value={waitingOfficer.length} helpText="Needs an office action" />
        <KpiCard label="Waiting for citizen" value={waitingCitizen.length} tone="warning" helpText="Clarification or documents requested" />
        <KpiCard label="Newly assigned" value={newlyAssigned.length} helpText="Assigned and awaiting review" />
        <KpiCard label="Possible related cases" value={related} helpText="Shares a category with another visible case" />
      </div>

      {persistent.length > 0 && <ActionRequiredCard
        severity="critical"
        title={`${persistent.length} ${persistent.length === 1 ? "case was" : "cases were"} reported unresolved by citizens`}
        description="These need a human review before they can be treated as resolved."
        actionLabel="Review these cases"
        onAction={() => void navigate({ to: "/office/cases", search: { attention: "appeal" } })}
      />}

      <section className="space-y-4" aria-labelledby="office-queue">
        <h2 id="office-queue" className="text-lg font-semibold">
          Priority queue
        </h2>
        {casesQuery.isPending ? <LoadingState label="Loading authorized cases" />
          : casesQuery.isError ? <ErrorState detail={queryErrorDetail(casesQuery.error)} onRetry={() => void casesQuery.refetch()} />
          : grievances.length === 0 ? <EmptyState title="No authorized cases" description="Cases visible under your database role and organization scope will appear here." />
          : <div className="grid gap-4 xl:grid-cols-2">
          {priorityQueue.slice(0, 6).map((g) => (
            <GrievanceCard key={g.id} grievance={g} variant="officer" priority={casesQuery.data?.prioritiesByGrievance[g.id]} />
          ))}
        </div>}
      </section>
    </div>
  );
}
