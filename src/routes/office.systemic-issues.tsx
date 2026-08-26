import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  StatusChip,
} from "@/components/cpgrams";
import {
  calculateSystemicIssueMetrics,
  formatMetricNumber,
  formatMetricPercent,
} from "@/lib/cpgrams/supervisor-presentation";
import { queryErrorDetail, useIssueClustersQuery } from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/office/systemic-issues")({
  head: () => ({
    meta: [
      { title: "Systemic issues — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Stored grievance clusters for supervisory review, clearly separate from future AI clustering.",
      },
      { property: "og:title", content: "Systemic issues" },
      {
        property: "og:description",
        content: "Stored patterns across grievances for supervisors and nodal officers.",
      },
    ],
  }),
  component: SystemicIssues,
});

function SystemicIssues() {
  const clustersQuery = useIssueClustersQuery();
  const data = clustersQuery.data;
  const clusters = data?.clusters ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patterns"
        title="Systemic issues"
        description="Stored cluster records help identify repeat failures. They do not transfer ownership or decide a case."
      />

      <Card className="border-info/30 bg-info-surface">
        <CardContent className="space-y-1 p-4">
          <p className="text-sm font-semibold text-info">Current stored cluster data</p>
          <p className="text-sm text-info">
            This page renders the current seeded/stored clusters and RLS-authorized linked case
            records. Automated AI clustering is not implemented.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Active clusters"
          value={clusters.filter((cluster) => cluster.status === "active").length}
        />
        <KpiCard
          label="Cases in clusters"
          value={clusters.reduce((total, cluster) => total + cluster.case_count, 0)}
          tone="warning"
          helpText="Stored cluster count"
        />
        <KpiCard label="Clusters in scope" value={clusters.length} />
      </div>

      {clustersQuery.isPending ? (
        <LoadingState label="Loading issue clusters" />
      ) : clustersQuery.isError ? (
        <ErrorState
          detail={queryErrorDetail(clustersQuery.error)}
          onRetry={() => void clustersQuery.refetch()}
        />
      ) : clusters.length === 0 ? (
        <EmptyState
          title="No issue clusters"
          description="Authorized systemic patterns will appear here when they are recorded."
        />
      ) : (
        <ul className="space-y-4">
          {clusters.map((cluster) => {
            const metrics = calculateSystemicIssueMetrics(cluster, data!);
            return (
              <li key={cluster.id}>
                <Card className="border-border">
                  <CardContent className="space-y-4 p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold">{cluster.title}</h2>
                        {cluster.summary && (
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {cluster.summary}
                          </p>
                        )}
                      </div>
                      <StatusChip
                        label={cluster.status}
                        tone={cluster.status === "active" ? "warning" : "neutral"}
                      />
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Organization
                        </dt>
                        <dd className="mt-1">{metrics.organization}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Geography
                        </dt>
                        <dd className="mt-1">{metrics.geography}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Case count
                        </dt>
                        <dd className="mt-1">
                          {cluster.case_count} stored · {metrics.accessibleCaseCount} accessible
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Average age
                        </dt>
                        <dd className="mt-1">
                          {metrics.averageAgeDays == null
                            ? "—"
                            : `${formatMetricNumber(metrics.averageAgeDays)} days`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Unresolved %
                        </dt>
                        <dd className="mt-1">{formatMetricPercent(metrics.unresolvedRate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Appeal rate
                        </dt>
                        <dd className="mt-1">{formatMetricPercent(metrics.appealRate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Status
                        </dt>
                        <dd className="mt-1 capitalize">{cluster.status}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-muted-foreground">
                      Age, unresolved percentage, and appeal rate use only linked grievance rows
                      visible to you under RLS; a dash means those case-level data are not available
                      in your current scope.
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
