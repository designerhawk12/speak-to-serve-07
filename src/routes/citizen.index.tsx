import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActionRequiredCard,
  GrievanceCard,
  KpiCard,
  PageHeader,
} from "@/components/cpgrams";
import { SAMPLE_GRIEVANCES } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/citizen/")({
  head: () => ({
    meta: [
      { title: "My grievances — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "All your grievances, what each office has recorded, and anything currently waiting on you.",
      },
      { property: "og:title", content: "My grievances" },
      { property: "og:description", content: "Your cases, their real status, and pending actions." },
    ],
  }),
  component: CitizenHome,
});

function CitizenHome() {
  const needsInput = SAMPLE_GRIEVANCES.filter((g) => g.adminStatus === "awaiting_citizen_input");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your workspace"
        title="My grievances"
        description="Because you are signed in, every grievance you have lodged appears here automatically."
        actions={
          <Button asChild>
            <Link to="/citizen/grievances/new">
              <FilePlus2 className="size-4" aria-hidden />
              Describe a problem
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open cases" value={2} helpText="Still being worked on or awaiting your reply" />
        <KpiCard label="Waiting on you" value={needsInput.length} tone="warning" helpText="Cases paused until you respond" />
        <KpiCard label="You confirmed solved" value={1} tone="success" helpText="Confirmed by you, not by disposal" />
      </div>

      {needsInput.map((g) => (
        <ActionRequiredCard
          key={g.id}
          title="An office is waiting for your reply"
          description={g.actionRequired ?? "Please provide the information requested on this case."}
          dueLabel="Timeline paused"
          actionLabel="Open the case"
        />
      ))}

      <section className="space-y-4" aria-labelledby="all-cases">
        <h2 id="all-cases" className="text-lg font-semibold">
          All your cases
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {SAMPLE_GRIEVANCES.map((g) => (
            <GrievanceCard key={g.id} grievance={g} />
          ))}
        </div>
      </section>
    </div>
  );
}
