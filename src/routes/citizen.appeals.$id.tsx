import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusChip, Timeline } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, toAppealTimelineEvent } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAppealWorkspaceQuery } from "@/lib/cpgrams/queries";

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
  const appealQuery = useAppealWorkspaceQuery(id);
  if (appealQuery.isPending) return <LoadingState variant="page" label="Loading appeal" />;
  if (appealQuery.isError) return <ErrorState detail={queryErrorDetail(appealQuery.error)} onRetry={() => void appealQuery.refetch()} />;
  if (!appealQuery.data) return <EmptyState title="Appeal not found" description="This appeal does not exist or is outside your authorized cases." />;
  const { appeal, appealEvents, grievanceWorkspace } = appealQuery.data;
  const status = appeal.state === "UNDER_REVIEW" ? { label: "Under review", tone: "info" as const }
    : appeal.state === "FILED" ? { label: "Filed", tone: "info" as const }
      : appeal.state === "REJECTED" ? { label: "Not accepted", tone: "critical" as const }
        : { label: "Decided", tone: "success" as const };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={appeal.reference_number}
        title={grievanceWorkspace.grievance.short_title}
        description="Appeals are decided by a person. Nothing here is decided automatically."
      />

      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <StatusChip label={status.label} tone={status.tone} size="lg" />
          <p className="text-sm text-muted-foreground">
            Filed {formatDate(appeal.filed_at)} · Decisions are recorded by the authorized Appellate Authority
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="appeal-history">
        <h2 id="appeal-history" className="text-lg font-semibold">
          Appeal history
        </h2>
        {appealEvents.length ? <Timeline events={appealEvents.map(toAppealTimelineEvent)} /> : <EmptyState title="No appeal events yet" description="Appeal activity will appear here when it is recorded." />}
      </section>
    </div>
  );
}
