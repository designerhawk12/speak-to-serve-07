import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatusChip, Timeline } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { SAMPLE_TIMELINE } from "@/lib/cpgrams/sample-data";

export const Route = createFileRoute("/citizen/appeals/$id")({
  head: () => ({
    meta: [
      { title: "My appeal — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Where your appeal stands, who is reviewing it, and what happens next.",
      },
      { property: "og:title", content: "My appeal" },
      { property: "og:description", content: "Appeal progress in plain language." },
    ],
  }),
  component: CitizenAppealDetail,
});

function CitizenAppealDetail() {
  const { id } = Route.useParams();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Appeal ${id}`}
        title="Your appeal is with an Appellate Authority"
        description="Appeals are decided by a person. Nothing here is decided automatically."
      />

      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <StatusChip label="Under review" tone="info" size="lg" />
          <p className="text-sm text-muted-foreground">
            Filed 10 Sep 2026 · Reviewing authority: Joint Secretary (Appeals)
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="appeal-history">
        <h2 id="appeal-history" className="text-lg font-semibold">
          Appeal history
        </h2>
        <Timeline events={SAMPLE_TIMELINE} />
      </section>
    </div>
  );
}
