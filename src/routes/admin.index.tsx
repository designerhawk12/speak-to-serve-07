import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTable,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  RoleGuard,
  StatusChip,
} from "@/components/cpgrams";
import type { DataTableColumn } from "@/components/cpgrams";
import type { AiRunRow, GrievanceCategoryRow, OrganizationRow } from "@/lib/cpgrams/data-access";
import { formatDateTime } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, usePlatformAdminOverviewQuery } from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Platform administration — CPGRAMS Resolution Workspace" }] }),
  component: PlatformAdminHome,
});

const organizationColumns: DataTableColumn<OrganizationRow>[] = [
  {
    id: "name",
    header: "Organization",
    cell: (organization) => (
      <div>
        <p className="font-medium">{organization.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{organization.code}</p>
      </div>
    ),
  },
  {
    id: "level",
    header: "Level",
    hideBelow: "sm",
    cell: (organization) => organization.level.replaceAll("_", " "),
  },
  {
    id: "state",
    header: "Geography",
    hideBelow: "md",
    cell: (organization) => organization.state_name ?? "National / not recorded",
  },
  {
    id: "appeal",
    header: "Appeal office",
    hideBelow: "lg",
    cell: (organization) => (organization.is_appellate_office ? "Yes" : "No"),
  },
];

const categoryColumns: DataTableColumn<GrievanceCategoryRow>[] = [
  {
    id: "name",
    header: "Category",
    cell: (category) => (
      <div>
        <p className="font-medium">{category.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{category.code}</p>
      </div>
    ),
  },
  {
    id: "sla",
    header: "Default SLA",
    hideBelow: "sm",
    cell: (category) => `${category.sla_days} days`,
  },
  {
    id: "state",
    header: "State",
    hideBelow: "md",
    cell: (category) => (
      <StatusChip
        label={category.is_active ? "Active" : "Inactive"}
        tone={category.is_active ? "success" : "neutral"}
      />
    ),
  },
];

const aiRunColumns: DataTableColumn<AiRunRow>[] = [
  { id: "kind", header: "Run kind", cell: (run) => run.run_kind },
  {
    id: "model",
    header: "Model label",
    hideBelow: "sm",
    cell: (run) => run.model_label ?? "Not recorded",
  },
  {
    id: "confidence",
    header: "Confidence",
    hideBelow: "md",
    cell: (run) => (run.confidence == null ? "—" : `${Math.round(run.confidence * 100)}%`),
  },
  {
    id: "accepted",
    header: "Review state",
    hideBelow: "lg",
    cell: (run) => (
      <StatusChip
        label={run.accepted_at ? "Accepted" : "Not accepted"}
        tone={run.accepted_at ? "info" : "neutral"}
      />
    ),
  },
  {
    id: "created",
    header: "Recorded",
    hideBelow: "lg",
    cell: (run) => formatDateTime(run.created_at),
  },
];

function PlatformAdminHome() {
  return (
    <RoleGuard>
      <PlatformAdminContent />
    </RoleGuard>
  );
}

function PlatformAdminContent() {
  const overviewQuery = usePlatformAdminOverviewQuery();
  return (
    <main className="page-container space-y-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Platform administration"
        title="Technical administration workspace"
        description="Read-only reference and audit surfaces. This role does not resolve grievances, confirm outcomes, decide appeals, or edit case history."
      />

      <Card className="border-info/30 bg-info-surface">
        <CardContent className="space-y-1 p-4">
          <p className="text-sm font-semibold text-info">System status</p>
          <p className="text-sm text-info">
            This workspace uses the same authenticated Supabase client and RLS policies as the rest
            of the website. Case-level authority is intentionally not granted to platform
            administration.
          </p>
        </CardContent>
      </Card>

      {overviewQuery.isPending ? (
        <LoadingState label="Loading technical administration data" />
      ) : overviewQuery.isError ? (
        <ErrorState
          detail={queryErrorDetail(overviewQuery.error)}
          onRetry={() => void overviewQuery.refetch()}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Organizations"
              value={overviewQuery.data.organizations.length}
              helpText="Public reference records"
            />
            <KpiCard
              label="Active categories"
              value={overviewQuery.data.categories.filter((category) => category.is_active).length}
              helpText="Current taxonomy records"
            />
            <KpiCard
              label="Visible AI run audits"
              value={overviewQuery.data.aiRuns.length}
              helpText="RLS-visible audit entries"
            />
          </div>

          <section className="space-y-3" aria-labelledby="admin-organizations">
            <h2 id="admin-organizations" className="text-lg font-semibold">
              Organizations
            </h2>
            <DataTable
              columns={organizationColumns}
              rows={overviewQuery.data.organizations}
              getRowId={(organization) => organization.id}
              caption="Reference data only; editing is not available in this workspace."
              emptyTitle="No organizations visible"
              emptyDescription="Organization reference data will appear when available."
            />
          </section>
          <section className="space-y-3" aria-labelledby="admin-categories">
            <h2 id="admin-categories" className="text-lg font-semibold">
              Grievance categories
            </h2>
            <DataTable
              columns={categoryColumns}
              rows={overviewQuery.data.categories}
              getRowId={(category) => category.id}
              caption="Reference taxonomy only; editing is not available in this workspace."
              emptyTitle="No categories visible"
              emptyDescription="Category reference data will appear when available."
            />
          </section>
          <section className="space-y-3" aria-labelledby="admin-ai-audit">
            <h2 id="admin-ai-audit" className="text-lg font-semibold">
              AI run audit
            </h2>
            {overviewQuery.data.aiRuns.length ? (
              <DataTable
                columns={aiRunColumns}
                rows={overviewQuery.data.aiRuns}
                getRowId={(run) => run.id}
                caption="Audit metadata only. AI is advisory and no administrative action is inferred from an audit row."
              />
            ) : (
              <EmptyState
                title="No AI run audits available"
                description="There are no RLS-visible AI audit records for this administrative session."
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
