import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable, ErrorState, KpiCard, PageHeader, StatusChip } from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";
import { formatDate } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAuthorizedAppealsQuery } from "@/lib/cpgrams/queries";

interface AppealViewRow {
  id: string;
  reference: string;
  problem: string;
  filedAt: string;
  stage: string;
  tone: "info" | "warning" | "critical";
}

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
  const appealsQuery = useAuthorizedAppealsQuery();
  const appeals: AppealViewRow[] = (appealsQuery.data?.appeals ?? []).map((appeal) => ({
    id: appeal.id,
    reference: appeal.reference_number,
    problem: appealsQuery.data?.grievances[appeal.grievance_id]?.short_title ?? "Authorized grievance",
    filedAt: formatDate(appeal.filed_at),
    stage: appeal.state === "UNDER_REVIEW" ? "Under review" : appeal.state === "FILED" ? "Filed" : appeal.state === "REJECTED" ? "Not accepted" : "Decided",
    tone: appeal.state === "REJECTED" ? "critical" : appeal.state === "DECIDED" ? "info" : appeal.state === "FILED" ? "warning" : "info",
  }));

  const columns: DataTableColumn<AppealViewRow>[] = [
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
        <KpiCard label="Open appeals" value={appeals.filter((appeal) => !["Decided", "Not accepted"].includes(appeal.stage)).length} />
        <KpiCard label="Under review" value={appeals.filter((appeal) => appeal.stage === "Under review").length} tone="warning" helpText="Currently before the authority" />
        <KpiCard label="Decided" value={appeals.filter((appeal) => appeal.stage === "Decided").length} helpText="Decisions in your authorized scope" />
      </div>

      {appealsQuery.isError ? <ErrorState detail={queryErrorDetail(appealsQuery.error)} onRetry={() => void appealsQuery.refetch()} /> : <DataTable
        columns={columns}
        rows={appeals}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/office/appeals/$id", params: { id: r.id } })}
        caption="Appeals pending before this authority"
        emptyTitle="No appeals pending"
        emptyDescription="Authorized appeals will appear here when citizens file them."
        isLoading={appealsQuery.isPending}
      />}
    </div>
  );
}
