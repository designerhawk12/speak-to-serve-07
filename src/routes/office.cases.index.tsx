import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DataTable, ErrorState, FilterBar, PageHeader, PriorityIndicator, SlaIndicator, StatusChip } from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";
import { toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAuthorizedGrievancesQuery } from "@/lib/cpgrams/queries";
import { ADMIN_STATUS_META, type GrievanceSummary } from "@/lib/cpgrams/types";
import { PRIORITY_RANK } from "@/lib/cpgrams/priority-engine";

export const Route = createFileRoute("/office/cases/")({
  validateSearch: (search: Record<string, unknown>) => ({ attention: search["attention"] === "appeal" ? "appeal" as const : undefined }),
  head: () => ({
    meta: [
      { title: "Cases — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "All grievances assigned to your office, with government status and citizen outcome side by side.",
      },
      { property: "og:title", content: "Cases" },
      { property: "og:description", content: "Dense case list for officers, filterable by status and timeline." },
    ],
  }),
  component: OfficeCases,
});

function OfficeCases() {
  const navigate = useNavigate();
  const { attention } = Route.useSearch();
  const casesQuery = useAuthorizedGrievancesQuery();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const grievances = (casesQuery.data?.grievances ?? []).map((row) =>
    toGrievanceSummary(
      row,
      row.organization_id ? casesQuery.data?.organizations[row.organization_id]?.name : undefined,
      casesQuery.data?.appealsByGrievance[row.id] ?? [],
      casesQuery.data?.requestsByGrievance[row.id] ?? [],
      row.category_id ? casesQuery.data?.categories[row.category_id]?.name : undefined,
    ),
  );
  const rows = useMemo(() => grievances.filter((row) => {
    const raw = casesQuery.data?.grievances.find((entry) => entry.id === row.id);
    const text = `${row.registrationNumber} ${row.shortTitle} ${row.category ?? ""} ${raw?.location_text ?? ""}`.toLocaleLowerCase();
    const action = row.actionRequired ? "waiting_citizen" : row.adminStatus;
    const hasAppealAttention = row.citizenOutcome === "problem_persists" || (casesQuery.data?.appealsByGrievance[row.id] ?? []).some((appeal) => ["FILED", "UNDER_REVIEW"].includes(appeal.state));
    return text.includes(search.toLocaleLowerCase()) && (state === "all" || action === state) && (!attention || hasAppealAttention);
  }).sort((a, b) => {
    const aPriority = casesQuery.data?.prioritiesByGrievance[a.id];
    const bPriority = casesQuery.data?.prioritiesByGrievance[b.id];
    const levelDifference = PRIORITY_RANK[bPriority?.priority_level ?? "NORMAL"] - PRIORITY_RANK[aPriority?.priority_level ?? "NORMAL"];
    if (levelDifference !== 0) return levelDifference;
    return (bPriority?.priority_score ?? 0) - (aPriority?.priority_score ?? 0);
  }), [attention, casesQuery.data?.appealsByGrievance, casesQuery.data?.grievances, casesQuery.data?.prioritiesByGrievance, grievances, search, state]);

  const columns: DataTableColumn<GrievanceSummary>[] = [
    { id: "title", header: "Grievance", cell: (r) => <div><span className="font-medium">{r.shortTitle}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{r.registrationNumber}</span></div> },
    { id: "category", header: "Category", hideBelow: "lg", cell: (r) => r.category ?? "—" },
    { id: "location", header: "Location", hideBelow: "lg", cell: (r) => casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.location_text ?? "—" },
    { id: "age", header: "Age", hideBelow: "lg", cell: (r) => `${Math.max(0, Math.ceil((Date.now() - new Date(casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.submitted_at ?? Date.now()).getTime()) / 86_400_000))} days` },
    {
      id: "action",
      header: "Current action state",
      hideBelow: "md",
      cell: (r) => <StatusChip label={r.actionRequired ? "Waiting for citizen" : ADMIN_STATUS_META[r.adminStatus].label} tone={r.actionRequired ? "warning" : ADMIN_STATUS_META[r.adminStatus].tone} />,
    },
    {
      id: "priority",
      header: "Priority",
      hideBelow: "md",
      cell: (r) => <PriorityIndicator priority={casesQuery.data?.prioritiesByGrievance[r.id]} />,
    },
    {
      id: "sla",
      header: "SLA",
      hideBelow: "lg",
      cell: (r) => (r.sla ? <SlaIndicator {...r.sla} compact /> : <span className="text-muted-foreground">—</span>),
    },
    { id: "last", header: "Last activity", hideBelow: "lg", cell: (r) => r.lastUpdated },
    { id: "officer", header: "Assigned officer", hideBelow: "lg", cell: (r) => casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.assigned_officer_id ? "Assigned officer" : "Unassigned" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title={attention === "appeal" ? "Appeal supervision cases" : "Cases"}
        description={attention === "appeal" ? "Authorized cases where a citizen reports the problem persists or an appeal is active. This is supervisory review, not appellate adjudication." : "Government status and citizen outcome are always shown as two separate facts."}
      />

      <FilterBar
        searchPlaceholder="Search grievance, category, location, or registration"
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            id: "admin",
            label: "Action state",
            value: state,
            options: [
              { value: "all", label: "All statuses" },
              { value: "under_review", label: "Waiting for officer" },
              { value: "waiting_citizen", label: "Waiting for citizen" },
              { value: "assigned", label: "Newly assigned" },
            ],
          },
        ]}
        onFilterChange={(_id, value) => setState(value)}
        onReset={() => { setSearch(""); setState("all"); }}
      />

      {casesQuery.isError ? <ErrorState detail={queryErrorDetail(casesQuery.error)} onRetry={() => void casesQuery.refetch()} /> : <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/office/cases/$id", params: { id: r.id } })}
        caption="Cases assigned to this office"
        emptyTitle="No authorized cases"
        emptyDescription="Cases visible under your role and organization scope will appear here."
        isLoading={casesQuery.isPending}
      />}
    </div>
  );
}
