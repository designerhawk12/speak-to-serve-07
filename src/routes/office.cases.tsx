import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable, FilterBar, PageHeader, SlaIndicator, StatusChip } from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";
import { SAMPLE_GRIEVANCES } from "@/lib/cpgrams/sample-data";
import { ADMIN_STATUS_META, CITIZEN_OUTCOME_META, type GrievanceSummary } from "@/lib/cpgrams/types";

export const Route = createFileRoute("/office/cases")({
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

  const columns: DataTableColumn<GrievanceSummary>[] = [
    { id: "reg", header: "Registration", cell: (r) => <span className="font-mono text-xs">{r.registrationNumber}</span> },
    { id: "title", header: "Problem", cell: (r) => <span className="font-medium">{r.shortTitle}</span> },
    {
      id: "admin",
      header: "Government status",
      hideBelow: "md",
      cell: (r) => <StatusChip label={ADMIN_STATUS_META[r.adminStatus].label} tone={ADMIN_STATUS_META[r.adminStatus].tone} />,
    },
    {
      id: "citizen",
      header: "Citizen outcome",
      hideBelow: "md",
      cell: (r) => (
        <StatusChip label={CITIZEN_OUTCOME_META[r.citizenOutcome].label} tone={CITIZEN_OUTCOME_META[r.citizenOutcome].tone} />
      ),
    },
    {
      id: "sla",
      header: "Timeline",
      hideBelow: "lg",
      cell: (r) => (r.sla ? <SlaIndicator {...r.sla} compact /> : <span className="text-muted-foreground">—</span>),
    },
    { id: "lodged", header: "Lodged", hideBelow: "sm", cell: (r) => r.lodgedAt },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue"
        title="Cases"
        description="Government status and citizen outcome are always shown as two separate facts."
      />

      <FilterBar
        searchPlaceholder="Search registration number or problem"
        filters={[
          {
            id: "admin",
            label: "Government status",
            options: [
              { value: "all", label: "All statuses" },
              { value: "under_examination", label: "Under examination" },
              { value: "action_taken", label: "Action taken" },
              { value: "disposed", label: "Disposed" },
            ],
          },
          {
            id: "outcome",
            label: "Citizen outcome",
            options: [
              { value: "all", label: "All outcomes" },
              { value: "problem_persists", label: "Problem persists" },
              { value: "confirmed_solved", label: "Confirmed solved" },
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={SAMPLE_GRIEVANCES}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/office/cases/$id", params: { id: r.id } })}
        caption="Cases assigned to this office"
        emptyTitle="No cases match these filters"
      />
    </div>
  );
}
