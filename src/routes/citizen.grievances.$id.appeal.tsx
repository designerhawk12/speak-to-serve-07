import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, RequestedOutcomeCard } from "@/components/cpgrams";
import { SAMPLE_GRIEVANCES } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/citizen/grievances/$id/appeal")({
  head: () => ({
    meta: [
      { title: "File an appeal — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Ask an Appellate Authority to review your case if the office closed it but your problem was not solved.",
      },
      { property: "og:title", content: "File an appeal" },
      { property: "og:description", content: "A plain-language appeal, reviewed by a human authority." },
    ],
  }),
  component: AppealPage,
});

function AppealPage() {
  const { id } = Route.useParams();
  const grievance = SAMPLE_GRIEVANCES.find((g) => g.id === id) ?? SAMPLE_GRIEVANCES[0]!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title="File an appeal"
        description="An Appellate Authority — a person, not an algorithm — will review what the office did and what you reported."
      />

      <RequestedOutcomeCard
        outcome={{ citizenWords: grievance.originalText }}
        originalText={grievance.originalText}
      />

      <Card className="border-border">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="space-y-2">
            <label htmlFor="appeal-reason" className="text-sm font-semibold">
              Why are you appealing?
            </label>
            <Textarea
              id="appeal-reason"
              rows={6}
              placeholder="Explain in your own words what is still unresolved. Your original grievance text stays on the case."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>Submit appeal</Button>
            <Button asChild variant="outline">
              <Link to="/citizen/grievances/$id" params={{ id }}>
                Cancel
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder only — appeal submission will be persisted in Supabase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
