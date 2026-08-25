import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ActionRequiredCard, GrievanceCard, KpiCard, PageHeader } from "@/components/cpgrams";
import { SAMPLE_GRIEVANCES } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/office/")({
  head: () => ({
    meta: [
      { title: "Office workspace — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Your queue, breached timelines, and cases where citizens report the problem still persists.",
      },
      { property: "og:title", content: "Office workspace" },
      { property: "og:description", content: "Officer queue with real citizen outcomes, not just disposal counts." },
    ],
  }),
  component: OfficeHome,
});

function OfficeHome() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Today in your office"
        description="Disposal is not the finish line. Cases where citizens report the problem persists are surfaced first."
        actions={
          <Button asChild variant="outline">
            <Link to="/office/cases">Open full case list</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open cases" value={128} helpText="Assigned to this office" />
        <KpiCard label="Breached timeline" value={11} tone="critical" helpText="Past the committed date" />
        <KpiCard label="Disposed, unconfirmed" value={34} tone="warning" helpText="Citizen has not confirmed resolution" />
        <KpiCard label="Citizen-confirmed solved" value={62} tone="success" helpText="Confirmed by citizens only" />
      </div>

      <ActionRequiredCard
        severity="critical"
        title="3 cases were disposed but citizens report the problem continues"
        description="These need a human review before they can be treated as resolved."
        actionLabel="Review these cases"
      />

      <section className="space-y-4" aria-labelledby="office-queue">
        <h2 id="office-queue" className="text-lg font-semibold">
          Priority queue
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {SAMPLE_GRIEVANCES.map((g) => (
            <GrievanceCard key={g.id} grievance={g} variant="officer" />
          ))}
        </div>
      </section>
    </div>
  );
}
