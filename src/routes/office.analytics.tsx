import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/cpgrams";
import {
  calculateSupervisorMetrics,
  formatMetricNumber,
  formatMetricPercent,
} from "@/lib/cpgrams/supervisor-presentation";
import {
  queryErrorDetail,
  useIssueClustersQuery,
  useOfficeAnalyticsQuery,
} from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/office/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Supervisory measures based on recorded case activity and citizen confirmation, never disposal alone.",
      },
      { property: "og:title", content: "Analytics" },
      {
        property: "og:description",
        content: "Supervisory case outcomes and service-timeline indicators.",
      },
    ],
  }),
  component: OfficeAnalytics,
});

function OfficeAnalytics() {
  const analyticsQuery = useOfficeAnalyticsQuery();
  const clustersQuery = useIssueClustersQuery();

  if (analyticsQuery.isPending || clustersQuery.isPending) {
    return <LoadingState label="Loading supervisory analytics" />;
  }
  if (analyticsQuery.isError) {
    return (
      <ErrorState
        detail={queryErrorDetail(analyticsQuery.error)}
        onRetry={() => void analyticsQuery.refetch()}
      />
    );
  }
  if (clustersQuery.isError) {
    return (
      <ErrorState
        detail={queryErrorDetail(clustersQuery.error)}
        onRetry={() => void clustersQuery.refetch()}
      />
    );
  }

  const metrics = calculateSupervisorMetrics(analyticsQuery.data, clustersQuery.data);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Nodal / supervisor"
        title="Service outcomes and risk"
        description="This snapshot uses only cases and records within your current RLS scope. Government disposal is not counted as citizen-confirmed resolution."
      />

      <section className="space-y-3" aria-labelledby="outcomes-title">
        <div>
          <h2 id="outcomes-title" className="text-lg font-semibold">
            Citizen outcomes & service commitments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rates are calculated from the authorized case snapshot currently available to you.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Confirmed resolution rate"
            value={formatMetricPercent(metrics.confirmedResolutionRate)}
            tone="success"
            helpText="Citizen confirmation only"
          />
          <KpiCard
            label="SLA compliance"
            value={formatMetricPercent(metrics.slaComplianceRate)}
            tone="success"
            helpText={
              metrics.slaMeasuredCases
                ? `${metrics.slaMeasuredCases} active target-dated cases; citizen-wait pauses excluded`
                : "No eligible target-dated cases"
            }
          />
          <KpiCard
            label="Appeal rate"
            value={formatMetricPercent(metrics.appealRate)}
            tone="warning"
            helpText="Cases with a recorded appeal"
          />
          <KpiCard
            label="Citizen-confirmed unresolved"
            value={formatMetricPercent(metrics.citizenConfirmedUnresolvedRate)}
            tone="critical"
            helpText="Not resolved or partly resolved"
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="operations-title">
        <div>
          <h2 id="operations-title" className="text-lg font-semibold">
            Operational signals
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These are descriptive supervisory measures, not automated decisions or transfers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Clarification rate"
            value={formatMetricPercent(metrics.clarificationRate)}
            helpText="Cases currently awaiting clarification"
          />
          <KpiCard
            label="Average transfers"
            value={formatMetricNumber(metrics.averageTransfers, 2)}
            helpText="Recorded transfers per authorized case"
          />
          <KpiCard
            label="Repeat grievances"
            value={metrics.repeatGrievanceCount}
            tone="warning"
            helpText="Authorized cases linked to stored clusters"
          />
          <KpiCard
            label="First meaningful response"
            value={
              metrics.firstMeaningfulResponseHours == null
                ? "—"
                : `${formatMetricNumber(metrics.firstMeaningfulResponseHours)} h`
            }
            helpText="First recorded officer action after submission"
          />
          <KpiCard
            label="Critical cases"
            value={metrics.criticalCaseCount}
            tone="critical"
            helpText="Recorded CRITICAL priority"
          />
          <KpiCard
            label="High priority cases"
            value={metrics.highPriorityCaseCount}
            tone="warning"
            helpText="Recorded HIGH priority"
          />
          <KpiCard
            label="Systemic issue count"
            value={metrics.systemicIssueCount}
            helpText="Current stored cluster records"
          />
          <KpiCard
            label="Authorized cases"
            value={metrics.authorizedCaseCount}
            helpText="Current RLS-authorized scope"
          />
        </div>
      </section>

      <Card className="border-border">
        <CardContent className="space-y-2 p-5 md:p-6">
          <h2 className="text-sm font-semibold">How to read this snapshot</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            “Confirmed resolution” means the citizen selected YES. A disposal or a resolution
            submitted by government remains separate administrative information. First meaningful
            response uses recorded officer document, clarification, interim-update, transfer,
            evidence, or resolution events. Trend and cross-jurisdiction historical reporting are
            not yet published.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
