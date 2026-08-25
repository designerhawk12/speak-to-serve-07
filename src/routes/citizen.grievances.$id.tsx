import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ActionRequiredCard,
  DocumentCard,
  PageHeader,
  RequestedOutcomeCard,
  SlaIndicator,
  StatusExplanationCard,
  Timeline,
} from "@/components/cpgrams";
import { SAMPLE_DOCUMENTS, SAMPLE_GRIEVANCES, SAMPLE_TIMELINE } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/citizen/grievances/$id")({
  head: () => ({
    meta: [
      { title: "Case details — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "What the office recorded, what you reported, and every step taken on your grievance so far.",
      },
      { property: "og:title", content: "Case details" },
      { property: "og:description", content: "A plain-language history of your grievance." },
    ],
  }),
  component: CitizenGrievanceDetail,
});

function CitizenGrievanceDetail() {
  const { id } = Route.useParams();
  const grievance = SAMPLE_GRIEVANCES.find((g) => g.id === id) ?? SAMPLE_GRIEVANCES[0]!;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title={grievance.shortTitle}
        description={`Lodged ${grievance.lodgedAt}${grievance.office ? ` · ${grievance.office}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/citizen/grievances/$id/resolution" params={{ id }}>
                Confirm the outcome
              </Link>
            </Button>
            <Button asChild>
              <Link to="/citizen/grievances/$id/appeal" params={{ id }}>
                File an appeal
              </Link>
            </Button>
          </>
        }
      />

      {grievance.actionRequired && (
        <ActionRequiredCard
          title="This case needs something from you"
          description={grievance.actionRequired}
          actionLabel="Respond now"
        />
      )}

      <StatusExplanationCard
        adminStatus={grievance.adminStatus}
        citizenOutcome={grievance.citizenOutcome}
      />

      {grievance.sla && <SlaIndicator {...grievance.sla} />}

      <RequestedOutcomeCard
        outcome={{ citizenWords: grievance.originalText, urgency: "time_sensitive" }}
        originalText={grievance.originalText}
      />

      <section className="space-y-4" aria-labelledby="case-history">
        <h2 id="case-history" className="text-lg font-semibold">
          What has happened
        </h2>
        <Timeline events={SAMPLE_TIMELINE} />
      </section>

      <section className="space-y-4" aria-labelledby="case-documents">
        <h2 id="case-documents" className="text-lg font-semibold">
          Documents on this case
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_DOCUMENTS.map((d) => (
            <DocumentCard key={d.id} document={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
