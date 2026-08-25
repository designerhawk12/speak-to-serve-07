import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, StatusExplanationCard } from "@/components/cpgrams";
import { SAMPLE_GRIEVANCES } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/citizen/grievances/$id/resolution")({
  head: () => ({
    meta: [
      { title: "Confirm the outcome — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Tell us whether your problem was actually solved. Government disposal and your confirmation are recorded separately.",
      },
      { property: "og:title", content: "Confirm the outcome" },
      { property: "og:description", content: "Only you can confirm your problem was solved." },
    ],
  }),
  component: ResolutionPage,
});

function ResolutionPage() {
  const { id } = Route.useParams();
  const grievance = SAMPLE_GRIEVANCES.find((g) => g.id === id) ?? SAMPLE_GRIEVANCES[0]!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title="Was your problem actually solved?"
        description="The office recording an action is not the same as your problem being solved. Your answer is recorded in its own lane."
      />

      <StatusExplanationCard
        adminStatus={grievance.adminStatus}
        citizenOutcome={grievance.citizenOutcome}
      />

      <Card className="border-border">
        <CardContent className="space-y-5 p-5 md:p-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Your answer</legend>
            {[
              { value: "solved", label: "Yes — the problem is solved" },
              { value: "partial", label: "Partly — some of it is still unresolved" },
              { value: "persists", label: "No — the problem continues" },
            ].map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm"
              >
                <input type="radio" name="outcome" value={o.value} className="size-4" />
                {o.label}
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="outcome-notes" className="text-sm font-semibold">
              Anything you want to add (optional)
            </label>
            <Textarea id="outcome-notes" rows={4} placeholder="Describe what is still wrong, in your own words." />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button>Record my answer</Button>
            <Button asChild variant="outline">
              <Link to="/citizen/grievances/$id" params={{ id }}>
                Back to the case
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder only — submission will be wired to Supabase and recorded as an immutable case event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
