import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AiSuggestionCard,
  DocumentCard,
  PageHeader,
  RequestedOutcomeCard,
  SlaIndicator,
  StatusExplanationCard,
  Timeline,
} from "@/components/cpgrams";
import { AI_DISCLAIMER } from "@/lib/cpgrams/ai";
import { SAMPLE_DOCUMENTS, SAMPLE_GRIEVANCES, SAMPLE_TIMELINE } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/office/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case file — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "The citizen's own words, the immutable case history, and the actions this office can record.",
      },
      { property: "og:title", content: "Case file" },
      { property: "og:description", content: "Officer case file with immutable history and advisory AI only." },
    ],
  }),
  component: OfficeCaseDetail,
});

function OfficeCaseDetail() {
  const { id } = Route.useParams();
  const grievance = SAMPLE_GRIEVANCES.find((g) => g.id === id) ?? SAMPLE_GRIEVANCES[0]!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title={grievance.shortTitle}
        description={`Lodged ${grievance.lodgedAt}${grievance.office ? ` · ${grievance.office}` : ""}`}
        actions={<Button variant="outline">Reassign case</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <StatusExplanationCard
            adminStatus={grievance.adminStatus}
            citizenOutcome={grievance.citizenOutcome}
          />

          <RequestedOutcomeCard
            outcome={{ citizenWords: grievance.originalText, urgency: "time_sensitive" }}
            originalText={grievance.originalText}
          />

          <Card className="border-border">
            <CardContent className="space-y-4 p-5 md:p-6">
              <h2 className="text-sm font-semibold">Record an action</h2>
              <Textarea rows={4} placeholder="Describe the action taken, in language the citizen can understand." />
              <div className="flex flex-wrap gap-2">
                <Button>Record action</Button>
                <Button variant="outline">Ask the citizen for information</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Placeholder only — recorded actions will become immutable case events in Supabase.
              </p>
            </CardContent>
          </Card>

          <section className="space-y-4" aria-labelledby="case-history">
            <h2 id="case-history" className="text-lg font-semibold">
              Case history
            </h2>
            <Timeline events={SAMPLE_TIMELINE} />
          </section>
        </div>

        <aside className="space-y-4">
          {grievance.sla && <SlaIndicator {...grievance.sla} />}

          <AiSuggestionCard
            suggestion={{
              id: "ai-1",
              kind: "routing",
              title: "Possible routing: Pension Disbursement Cell",
              body: "The description mentions bank credit failure after release, which usually sits with the disbursement cell.",
              basis: "Matched wording in the citizen's own description. Not a government finding.",
            }}
            acceptLabel="Use as a draft"
          />
          <p className="text-xs text-muted-foreground">{AI_DISCLAIMER}</p>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Documents</h2>
            {SAMPLE_DOCUMENTS.map((d) => (
              <DocumentCard key={d.id} document={d} compact />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
