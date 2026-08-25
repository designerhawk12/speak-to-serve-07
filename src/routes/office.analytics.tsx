import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, PageHeader, FilterBar } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Disposal rate" value="86%" helpText="Cases the government marked closed" />
        <KpiCard label="Citizen-confirmed resolved" value="61%" tone="success" helpText="Citizens said the problem was solved" />
        <KpiCard label="Reopened after disposal" value="9%" tone="warning" helpText="Problem persisted after closure" />
        <KpiCard label="Median days to resolve" value={21} helpText="From lodging to citizen confirmation" />
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold">Trend charts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Placeholder — charts will be driven by Supabase aggregates once case data is live.
          </p>
          <div className="mt-4 h-56 rounded-md border border-dashed border-border-strong bg-surface-sunken" aria-hidden />
        </CardContent>
      </Card>
    </div>
  );
}
