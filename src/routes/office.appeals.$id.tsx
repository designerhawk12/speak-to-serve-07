import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AiSuggestionCard,
  PageHeader,
  RequestedOutcomeCard,
  StatusExplanationCard,
  Timeline,
} from "@/components/cpgrams";
import { AI_DISCLAIMER } from "@/lib/cpgrams/ai";
import { SAMPLE_GRIEVANCES, SAMPLE_TIMELINE } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/office/appeals/$id")({
  head: () => ({
    meta: [
      { title: "Appeal file — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "What the office did, what the citizen still reports, and the decision the authority must take.",
      },
      { property: "og:title", content: "Appeal file" },
      { property: "og:description", content: "Appeal review file for the Appellate Authority." },
    ],
  }),
  component: OfficeAppealDetail,
});

function OfficeAppealDetail() {
  const { id } = Route.useParams();
  const grievance = SAMPLE_GRIEVANCES[0]!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Appeal ${id}`}
        title={grievance.shortTitle}
        description="Decide only after comparing what the office recorded with what the citizen reports."
      />

      <StatusExplanationCard adminStatus={grievance.adminStatus} citizenOutcome={grievance.citizenOutcome} />

      <RequestedOutcomeCard
        outcome={{ citizenWords: grievance.originalText }}
        originalText={grievance.originalText}
      />

      <AiSuggestionCard
        suggestion={{
          id: "ai-appeal-1",
          kind: "drafting_help",
          title: "Draft summary of the disagreement",
          body: "Office states arrears were released on 29 Aug; citizen reports no bank credit as of 08 Sep.",
          basis: "Derived from recorded case events only.",
        }}
        acceptLabel="Insert into my notes"
      />
      <p className="text-xs text-muted-foreground">{AI_DISCLAIMER}</p>

      <Card className="border-border">
        <CardContent className="space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-semibold">Record your decision</h2>
          <Textarea rows={5} placeholder="State the decision and the reasoning, in language the citizen can understand." />
          <div className="flex flex-wrap gap-2">
            <Button>Record decision</Button>
            <Button variant="outline">Ask the office for a reply</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder only — decisions will be persisted as immutable case events.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="appeal-history">
        <h2 id="appeal-history" className="text-lg font-semibold">
          Full case history
        </h2>
        <Timeline events={SAMPLE_TIMELINE} />
      </section>
    </div>
  );
}
