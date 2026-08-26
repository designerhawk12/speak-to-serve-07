import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { queryErrorDetail, useIssueClustersQuery } from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/office/systemic-issues")({
  head: () => ({
    meta: [
      { title: "Systemic issues — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Clusters of similar grievances that point to a process failure rather than isolated cases.",
      },
      { property: "og:title", content: "Systemic issues" },
      { property: "og:description", content: "Patterns across grievances, for supervisors and nodal officers." },
    ],
  }),
  component: SystemicIssues,
});

function SystemicIssues() {
  const clustersQuery = useIssueClustersQuery();
  const clusters = clustersQuery.data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patterns"
        title="Systemic issues"
        description="When many citizens describe the same failure, the fix is a process change, not more disposals."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Active clusters" value={clusters.filter((cluster) => cluster.status === "active").length} />
        <KpiCard label="Cases in clusters" value={clusters.reduce((total, cluster) => total + cluster.case_count, 0)} tone="warning" />
        <KpiCard label="Clusters in scope" value={clusters.length} />
      </div>

      {clustersQuery.isPending ? <LoadingState label="Loading issue clusters" />
        : clustersQuery.isError ? <ErrorState detail={queryErrorDetail(clustersQuery.error)} onRetry={() => void clustersQuery.refetch()} />
        : clusters.length === 0 ? <EmptyState title="No issue clusters" description="Authorized systemic patterns will appear here when they are recorded." />
        : <ul className="space-y-3">
        {clusters.map((c) => (
          <li key={c.id}>
            <Card className="border-border">
              <CardContent className="space-y-1.5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{c.title}</h2>
                  <div className="flex items-center gap-2"><StatusChip label={c.status} tone={c.status === "active" ? "warning" : "neutral"} /><span className="text-xs text-muted-foreground">{c.case_count} linked cases</span></div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.summary}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>}
    </div>
  );
}
