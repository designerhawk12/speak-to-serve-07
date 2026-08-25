import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable, KpiCard, PageHeader, StatusChip } from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";

interface AppealRow {
  id: string;
  reference: string;
  problem: string;
  filedAt: string;
  stage: string;
  tone: "info" | "warning" | "critical";
}

const APPEALS: AppealRow[] = [
  {
    id: "a-2201",
    reference: "DOPST/A/2026/0000221",
    problem: "Pension arrears not credited for four months",
    filedAt: "10 Sep 2026",
    stage: "Awaiting office reply",
    tone: "warning",
  },
  {
    id: "a-2202",
    reference: "MOHUA/A/2026/0000118",
    problem: "Water supply cut without notice",
    filedAt: "05 Sep 2026",
    stage: "Under review",
    tone: "info",
  },
];

export const Route = createFileRoute("/office/appeals/")({
  head: () => ({
    meta: [
      { title: "Appeals — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Appeals awaiting a human decision by an Appellate Authority, with the original grievance intact.",
      },
      { property: "og:title", content: "Appeals" },
      { property: "og:description", content: "Appeals queue for Appellate Authorities." },
    ],
  }),
  component: OfficeAppeals,
});

function OfficeAppeals() {
  const navigate = useNavigate();

  const columns: DataTableColumn<AppealRow>[] = [
    { id: "ref", header: "Appeal reference", cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { id: "problem", header: "Problem", cell: (r) => <span className="font-medium">{r.problem}</span> },
    { id: "stage", header: "Stage", hideBelow: "md", cell: (r) => <StatusChip label={r.stage} tone={r.tone} /> },
    { id: "filed", header: "Filed", hideBelow: "sm", cell: (r) => r.filedAt },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appellate lane"
        title="Appeals"
        description="Every appeal is decided by a person. AI may summarise, but never decides."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open appeals" value={APPEALS.length} />
        <KpiCard label="Overdue replies" value={1} tone="critical" helpText="Office has not replied in time" />
        <KpiCard label="Decided this month" value={7} helpText="Decisions issued by the authority" />
      </div>

      <DataTable
        columns={columns}
        rows={APPEALS}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/office/appeals/$id", params: { id: r.id } })}
        caption="Appeals pending before this authority"
        emptyTitle="No appeals pending"
      />
    </div>
  );
}
