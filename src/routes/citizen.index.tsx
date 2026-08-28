import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  GrievanceCard,
  KpiCard,
  LoadingState,
  PageHeader,
} from "@/components/cpgrams";
import {
  getCitizenActionItems,
  getCitizenActionState,
  matchesCitizenDashboardFilter,
  type CitizenDashboardFilter,
} from "@/lib/cpgrams/citizen-case";
import { toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useCitizenGrievancesQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/citizen/")({
  head: () => ({
    meta: [
      { title: "My grievances — CPGRAMS Resolution Workspace" },
      { name: "description", content: "Your authenticated grievance workspace and case updates." },
    ],
  }),
  component: CitizenHome,
});

function CitizenHome() {
  const { user } = useSession();
  const casesQuery = useCitizenGrievancesQuery(user?.id);
  const [filter, setFilter] = useState<CitizenDashboardFilter>("all");
  const [search, setSearch] = useState("");

  const cases = useMemo(
    () =>
      (casesQuery.data?.grievances ?? []).map((row) => {
        const appeals = casesQuery.data?.appealsByGrievance[row.id] ?? [];
        const requests = casesQuery.data?.requestsByGrievance[row.id] ?? [];
        const clarifications = casesQuery.data?.clarificationsByGrievance[row.id] ?? [];
        const requestItems = requests.flatMap(
          (request) => casesQuery.data?.requestItemsByRequest[request.id] ?? [],
        );
        const category = row.category_id
          ? casesQuery.data?.categories[row.category_id]?.name
          : undefined;
        const action = getCitizenActionState(row, requests, requestItems, appeals, clarifications);
        const actions = getCitizenActionItems(row, requests, requestItems, appeals, clarifications);
        const summary = toGrievanceSummary(
          row,
          row.organization_id
            ? casesQuery.data?.organizations[row.organization_id]?.name
            : undefined,
          appeals,
          requests,
          category,
          clarifications,
        );
        return {
          row,
          appeals,
          category,
          action,
          actions,
          summary: action.requiresAction
            ? {
                ...summary,
                actionRequired: `${action.title}: ${summary.actionRequired ?? action.description}`,
              }
            : summary,
        };
      }),
    [casesQuery.data],
  );

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleCases = cases
    .filter(
      ({ row, appeals, action, summary, category }) =>
        matchesCitizenDashboardFilter(filter, row, action, appeals) &&
        (!normalizedSearch ||
          [summary.shortTitle, summary.registrationNumber, category ?? ""].some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch),
          )),
    )
    .sort((left, right) => {
      if (left.action.requiresAction !== right.action.requiresAction)
        return left.action.requiresAction ? -1 : 1;
      return new Date(right.row.updated_at).getTime() - new Date(left.row.updated_at).getTime();
    });
  const active = cases.filter(
    ({ row }) => !["DISPOSED", "CLOSED"].includes(row.administrative_state),
  );
  const actionRequired = cases.filter(
    ({ action }) => action.requiresAction && action.state !== "review_government_resolution",
  );
  const actionGroups = cases.filter(({ actions }) => actions.length > 0);
  const resolutionReview = cases.filter(
    ({ action }) => action.state === "review_government_resolution",
  );
  const appealsInProgress = cases.filter(({ appeals }) =>
    appeals.some((appeal) => ["FILED", "UNDER_REVIEW"].includes(appeal.state)),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your workspace"
        title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
        description="Your cases are here automatically. Cases needing your attention appear first."
        actions={
          <Button asChild>
            <Link to="/citizen/grievances/new">
              <FilePlus2 className="size-4" aria-hidden />
              Describe a problem
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active grievances"
          value={active.length}
          helpText="Still progressing in the government workflow"
        />
        <KpiCard
          label="Action required"
          value={actionRequired.length}
          tone="warning"
          helpText="Waiting for your documents, answer, or appeal choice"
        />
        <KpiCard
          label="Awaiting resolution review"
          value={resolutionReview.length}
          tone="info"
          helpText="The office has proposed a resolution for you to review"
        />
        <KpiCard
          label="Appeals in progress"
          value={appealsInProgress.length}
          tone="info"
          helpText="Filed appeals that are not yet decided"
        />
      </div>

      {actionGroups.length > 0 && (
        <section className="space-y-4" aria-labelledby="current-actions">
          <div>
            <h2 id="current-actions" className="text-lg font-semibold">
              Action required
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current tasks are grouped by grievance. Your case timelines remain chronological
              inside each case.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {actionGroups.map(({ summary, actions }) => (
              <article
                key={summary.id}
                className="space-y-3 rounded-lg border border-warning/40 bg-warning-surface p-5"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{summary.shortTitle}</h3>
                  <p className="text-xs font-medium text-muted-foreground">
                    {summary.registrationNumber}
                  </p>
                </div>
                <ul className="space-y-2">
                  {actions.map((action) => (
                    <li key={action.id} className="rounded-md bg-background/70 p-3">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/citizen/grievances/$id"
                  params={{ id: summary.id }}
                  className="inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Open case
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="all-cases">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="all-cases" className="text-lg font-semibold">
            Your cases
          </h2>
          <span className="text-sm text-muted-foreground">{visibleCases.length} shown</span>
        </div>
        <FilterBar
          searchPlaceholder="Search title, registration number, or category"
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "case-state",
              label: "Case filter",
              value: filter,
              options: [
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "action_required", label: "Action Required" },
                { value: "resolution_review", label: "Resolution Review" },
                { value: "appealed", label: "Appealed" },
                { value: "closed", label: "Closed" },
              ],
            },
          ]}
          onFilterChange={(_, value) => setFilter(value as CitizenDashboardFilter)}
          onReset={() => {
            setFilter("all");
            setSearch("");
          }}
        />
        {casesQuery.isPending ? (
          <LoadingState label="Loading your grievances" />
        ) : casesQuery.isError ? (
          <ErrorState
            detail={queryErrorDetail(casesQuery.error)}
            onRetry={() => void casesQuery.refetch()}
          />
        ) : visibleCases.length === 0 ? (
          <EmptyState
            title={
              cases.length ? "No cases match this view" : "You have not lodged a grievance yet"
            }
            description={
              cases.length
                ? "Try a different filter or search phrase."
                : "Describe a problem to start a case and follow each recorded step here."
            }
            action={
              !cases.length ? (
                <Button asChild>
                  <Link to="/citizen/grievances/new">Describe a problem</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleCases.map(({ summary }) => (
              <GrievanceCard key={summary.id} grievance={summary} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
