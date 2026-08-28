import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DataTable,
  ErrorState,
  FilterBar,
  PageHeader,
  PriorityIndicator,
  SlaIndicator,
  StatusChip,
} from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";
import { toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { isWaitingOnCitizen, lastMeaningfulActionLabel } from "@/lib/cpgrams/officer-presentation";
import { ADMIN_STATUS_META, type GrievanceSummary } from "@/lib/cpgrams/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  queryErrorDetail,
  useAuthorizedGrievancePageQuery,
  useIntakeTaxonomyQuery,
  useProfileQuery,
} from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import {
  authorizedOrganizationIds,
  effectiveNormalQueueAssignee,
} from "@/lib/cpgrams/officer-assignment";

export const Route = createFileRoute("/office/cases/")({
  validateSearch: (search: Record<string, unknown>) => ({
    attention: search["attention"] === "appeal" ? ("appeal" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cases — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "All grievances assigned to your office, with government status and citizen outcome side by side.",
      },
      { property: "og:title", content: "Cases" },
      {
        property: "og:description",
        content: "Dense case list for officers, filterable by status and timeline.",
      },
    ],
  }),
  component: OfficeCases,
});

function OfficeCases() {
  const navigate = useNavigate();
  const { attention } = Route.useSearch();
  const { user } = useSession();
  const profileQuery = useProfileQuery(user?.id);
  const taxonomyQuery = useIntakeTaxonomyQuery();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [priority, setPriority] = useState("all");
  const [organization, setOrganization] = useState("all");
  const [location, setLocation] = useState("");
  const [assignee, setAssignee] = useState("all");
  // A GRO's normal work queue is assignment-scoped. Nodal officers retain the
  // broader, RLS-authorized subtree filters needed for supervision.
  const effectiveAssignee = effectiveNormalQueueAssignee(
    user?.role,
    assignee as "all" | "mine" | "other" | "unassigned",
  );
  const casesQuery = useAuthorizedGrievancePageQuery({
    page,
    pageSize,
    currentUserId: user?.id ?? "",
    ...(search.trim() ? { search } : {}),
    ...(state !== "all"
      ? {
          administrativeState:
            state as import("@/integrations/supabase/types").Database["public"]["Enums"]["administrative_state"],
        }
      : {}),
    ...(priority !== "all"
      ? {
          priority:
            priority as import("@/integrations/supabase/types").Database["public"]["Enums"]["priority_level"],
        }
      : {}),
    ...(organization !== "all" ? { organizationId: organization } : {}),
    ...(location.trim() ? { location } : {}),
    ...(effectiveAssignee !== "all"
      ? { assignee: effectiveAssignee as "mine" | "other" | "unassigned" }
      : {}),
    ...(attention === "appeal" ? { appealAttention: true } : {}),
  });
  const grievances = (casesQuery.data?.grievances ?? []).map((row) =>
    toGrievanceSummary(
      row,
      row.organization_id ? casesQuery.data?.organizations[row.organization_id]?.name : undefined,
      casesQuery.data?.appealsByGrievance[row.id] ?? [],
      casesQuery.data?.requestsByGrievance[row.id] ?? [],
      row.category_id ? casesQuery.data?.categories[row.category_id]?.name : undefined,
    ),
  );
  const rows = grievances;
  const authorizedOrganizations = useMemo(() => {
    const all = taxonomyQuery.data?.organizations ?? [];
    const rootId = profileQuery.data?.organization_id;
    if (!rootId || !user) return [];
    if (!["gro", "nodal"].includes(user.role)) return [];
    const ids = authorizedOrganizationIds(all, rootId, user.role === "nodal");
    return all.filter((entry) => ids.has(entry.id));
  }, [profileQuery.data?.organization_id, taxonomyQuery.data?.organizations, user]);

  const columns: DataTableColumn<GrievanceSummary>[] = [
    {
      id: "title",
      header: "Grievance",
      cell: (r) => (
        <div>
          <span className="font-medium">{r.shortTitle}</span>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">
            {r.registrationNumber}
          </span>
        </div>
      ),
    },
    { id: "category", header: "Category", hideBelow: "lg", cell: (r) => r.category ?? "—" },
    {
      id: "location",
      header: "Location",
      hideBelow: "lg",
      cell: (r) =>
        casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.location_text ?? "—",
    },
    {
      id: "age",
      header: "Age",
      hideBelow: "lg",
      cell: (r) =>
        `${Math.max(0, Math.ceil((Date.now() - new Date(casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.submitted_at ?? Date.now()).getTime()) / 86_400_000))} days`,
    },
    {
      id: "action",
      header: "Current action state",
      hideBelow: "md",
      cell: (r) => {
        const priority = casesQuery.data?.prioritiesByGrievance[r.id];
        const waitingOnCitizen = isWaitingOnCitizen(r, priority);
        return (
          <div className="space-y-1">
            <StatusChip
              label={
                waitingOnCitizen ? "Waiting for citizen" : ADMIN_STATUS_META[r.adminStatus].label
              }
              tone={waitingOnCitizen ? "info" : ADMIN_STATUS_META[r.adminStatus].tone}
            />
            {priority?.waiting_on_citizen && (
              <p className="max-w-44 text-xs text-info">Government inactivity escalation paused</p>
            )}
          </div>
        );
      },
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
      cell: (r) =>
        r.sla ? (
          <SlaIndicator {...r.sla} compact />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "last",
      header: "Last meaningful action",
      hideBelow: "lg",
      cell: (r) => lastMeaningfulActionLabel(casesQuery.data?.prioritiesByGrievance[r.id]),
    },
    {
      id: "officer",
      header: "Assignee",
      hideBelow: "lg",
      cell: (r) =>
        casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.assigned_officer_id ===
        user?.id
          ? "You"
          : casesQuery.data?.grievances.find((entry) => entry.id === r.id)?.assigned_officer_id
            ? "Another officer"
            : "Unassigned",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title={attention === "appeal" ? "Appeal supervision cases" : "Cases"}
        description={
          attention === "appeal"
            ? "Authorized cases where a citizen reports the problem persists or an appeal is active. This is supervisory review, not appellate adjudication."
            : "Ordered by recorded priority, then score. Government status and citizen outcome remain separate facts."
        }
      />

      <FilterBar
        searchPlaceholder="Search grievance, category, location, or registration"
        searchValue={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        filters={[
          {
            id: "admin",
            label: "Case state",
            value: state,
            options: [
              { value: "all", label: "All statuses" },
              { value: "ASSIGNED", label: "Assigned" },
              { value: "UNDER_EXAMINATION", label: "Under examination" },
              { value: "CLARIFICATION_REQUIRED", label: "Waiting for citizen" },
              { value: "ACTION_IN_PROGRESS", label: "Action in progress" },
              { value: "RESOLUTION_PROVIDED", label: "Resolution review" },
            ],
          },
          {
            id: "priority",
            label: "Priority",
            value: priority,
            options: [
              { value: "all", label: "All priorities" },
              { value: "CRITICAL", label: "Critical" },
              { value: "HIGH", label: "High" },
              { value: "ELEVATED", label: "Elevated" },
              { value: "NORMAL", label: "Normal" },
            ],
          },
          {
            id: "organization",
            label: "Organization",
            value: organization,
            options: [
              { value: "all", label: "All authorized organizations" },
              ...authorizedOrganizations.map((entry) => ({ value: entry.id, label: entry.name })),
            ],
          },
          ...(user?.role === "gro"
            ? []
            : [
                {
                  id: "assignee",
                  label: "Assignee",
                  value: assignee,
                  options: [
                    { value: "all", label: "All assignees" },
                    { value: "mine", label: "Assigned to me" },
                    { value: "other", label: "Another officer" },
                    { value: "unassigned", label: "Unassigned" },
                  ],
                },
              ]),
        ]}
        onFilterChange={(id, value) => {
          setPage(1);
          if (id === "admin") setState(value);
          if (id === "priority") setPriority(value);
          if (id === "organization") setOrganization(value);
          if (id === "assignee") setAssignee(value);
        }}
        onReset={() => {
          setPage(1);
          setSearch("");
          setState("all");
          setPriority("all");
          setOrganization("all");
          setLocation("");
          setAssignee("all");
        }}
      >
        <Input
          value={location}
          onChange={(event) => {
            setPage(1);
            setLocation(event.target.value);
          }}
          placeholder="Filter location"
          aria-label="Filter by location"
          className="min-w-40 md:w-44"
        />
      </FilterBar>

      {casesQuery.isError ? (
        <ErrorState
          detail={queryErrorDetail(casesQuery.error)}
          onRetry={() => void casesQuery.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate({ to: "/office/cases/$id", params: { id: r.id } })}
          caption="Authorized cases, ordered by recorded priority. Expand Why this priority? for the engine's recorded reasons."
          emptyTitle="No authorized cases"
          emptyDescription="Cases visible under your role and organization scope will appear here."
          isLoading={casesQuery.isPending}
        />
      )}

      {!casesQuery.isError && !casesQuery.isPending && casesQuery.data && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            {casesQuery.data.totalCount === 0
              ? "No cases"
              : `Showing ${(casesQuery.data.page - 1) * casesQuery.data.pageSize + 1}–${Math.min(casesQuery.data.page * casesQuery.data.pageSize, casesQuery.data.totalCount)} of ${casesQuery.data.totalCount}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-muted-foreground">
              Per page
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-foreground"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={casesQuery.data.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span aria-live="polite">
              Page {casesQuery.data.page} of {casesQuery.data.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={casesQuery.data.page >= casesQuery.data.totalPages}
              onClick={() =>
                setPage((current) => Math.min(casesQuery.data!.totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
