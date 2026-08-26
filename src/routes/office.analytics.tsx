import { createFileRoute } from "@tanstack/react-router";
import { ErrorState, KpiCard, LoadingState, PageHeader, FilterBar } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { queryErrorDetail, useAuthorizedGrievancesQuery } from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/office/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Performance measured by citizen-confirmed resolution, not by how many cases were disposed.",
      },
      { property: "og:title", content: "Analytics" },
      { property: "og:description", content: "Disposal counts alone are not treated as success." },
    ],
  }),
  component: OfficeAnalytics,
});

function OfficeAnalytics() {
  const casesQuery = useAuthorizedGrievancesQuery();
  const cases = casesQuery.data?.grievances ?? [];
  const count = cases.length || 1;
  const disposed = cases.filter((row) => ["DISPOSED", "CLOSED"].includes(row.administrative_state)).length;
  const confirmed = cases.filter((row) => row.citizen_confirmation_state === "CONFIRMED_RESOLVED").length;
  const persists = cases.filter((row) => row.citizen_confirmation_state === "NOT_RESOLVED").length;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        description="Disposal rate and citizen-confirmed resolution rate are reported as two different numbers."
      />

      <FilterBar
        searchPlaceholder="Search office or subject"
        filters={[
          {
            id: "period",
            label: "Period",
            options: [
              { value: "30d", label: "Last 30 days" },
              { value: "quarter", label: "This quarter" },
              { value: "year", label: "This year" },
            ],
          },
        ]}
      />

      {casesQuery.isPending ? <LoadingState label="Loading case analytics" />
        : casesQuery.isError ? <ErrorState detail={queryErrorDetail(casesQuery.error)} onRetry={() => void casesQuery.refetch()} />
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Authorized cases" value={cases.length} helpText="Visible under your database scope" />
          <KpiCard label="Disposal rate" value={`${Math.round((disposed / count) * 100)}%`} helpText="Government administrative state" />
          <KpiCard label="Citizen-confirmed resolved" value={`${Math.round((confirmed / count) * 100)}%`} tone="success" helpText="Citizen confirmation state" />
          <KpiCard label="Problem persists" value={`${Math.round((persists / count) * 100)}%`} tone="warning" helpText="Citizens report unresolved" />
        </div>}

      <Card className="border-border">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold">Trend charts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trend visualization is not implemented. The summary above is calculated from the cases currently authorized by RLS.
          </p>
          <div className="mt-4 h-56 rounded-md border border-dashed border-border-strong bg-surface-sunken" aria-hidden />
        </CardContent>
      </Card>
    </div>
  );
}
