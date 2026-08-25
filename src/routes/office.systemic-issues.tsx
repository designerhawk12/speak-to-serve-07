import { createFileRoute } from "@tanstack/react-router";
import { AiSuggestionCard, KpiCard, PageHeader } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { AI_DISCLAIMER } from "@/lib/cpgrams/ai";

const CLUSTERS = [
  {
    id: "s-1",
    title: "Repeated pension credit failures after release",
    cases: 42,
    note: "Multiple citizens report no bank credit even after offices record release of arrears.",
  },
  {
    id: "s-2",
    title: "Unannounced water supply interruptions in one ward",
    cases: 17,
    note: "Grievances cluster around the same lanes with no public notice issued.",
  },
];

export const Route = createFileRoute("/office/systemic-issues")({
  head: () => ({
    meta: [
      { title: "Systemic issues — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Clusters of similar grievances that point to a process failure rather than isolated cases.",
      },
      { property: "og:title", content: "Systemic issues" },
      { property: "og:description", content: "Patterns across grievances, for supervisors and nodal officers." },
    ],
  }),
  component: SystemicIssues,
});

function SystemicIssues() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patterns"
        title="Systemic issues"
        description="When many citizens describe the same failure, the fix is a process change, not more disposals."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Active clusters" value={CLUSTERS.length} />
        <KpiCard label="Cases in clusters" value={59} tone="warning" />
        <KpiCard label="Escalated to ministry" value={2} tone="critical" />
      </div>

      <AiSuggestionCard
        suggestion={{
          id: "ai-cluster-1",
          kind: "systemic_pattern",
          title: "Possible cluster detected",
          body: "Several pension cases share the phrase 'released but no credit'. A supervisor should confirm.",
          basis: "Text similarity across citizen descriptions only.",
        }}
        acceptLabel="Flag for review"
      />
      <p className="text-xs text-muted-foreground">{AI_DISCLAIMER}</p>

      <ul className="space-y-3">
        {CLUSTERS.map((c) => (
          <li key={c.id}>
            <Card className="border-border">
              <CardContent className="space-y-1.5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{c.title}</h2>
                  <span className="text-xs text-muted-foreground">{c.cases} linked cases</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.note}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
