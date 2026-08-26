import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DocumentCard,
  EmptyState,
  ErrorState,
  LoadingState,
  OfficerCaseActions,
  PageHeader,
  PriorityIndicator,
  RequestedOutcomeCard,
  SlaIndicator,
  StatusExplanationCard,
  Timeline,
} from "@/components/cpgrams";
import { formatDate, formatDateTime, toDocumentRecord, toGrievanceSummary, toTimelineEvent } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useGrievanceWorkspaceQuery, useMarkGrievanceOpenedMutation } from "@/lib/cpgrams/queries";
import { useIntakeTaxonomyQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";

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
  const caseQuery = useGrievanceWorkspaceQuery(id);
  const taxonomyQuery = useIntakeTaxonomyQuery();
  const { user } = useSession();
  const markOpened = useMarkGrievanceOpenedMutation(id);
  const openedAttempted = useRef(false);

  useEffect(() => {
    if (
      !openedAttempted.current
      && caseQuery.data
      && user
      && ["gro", "nodal"].includes(user.role)
      && !caseQuery.data.priority?.first_opened_at
    ) {
      openedAttempted.current = true;
      markOpened.mutate();
    }
  }, [caseQuery.data, markOpened, user]);

  if (caseQuery.isPending) return <LoadingState variant="page" label="Loading case file" />;
  if (caseQuery.isError) return <ErrorState detail={queryErrorDetail(caseQuery.error)} onRetry={() => void caseQuery.refetch()} />;
  if (!caseQuery.data) return <EmptyState title="Case not found" description="This case does not exist or is outside your authorized case scope." />;
  const workspace = caseQuery.data;
  const grievance = toGrievanceSummary(workspace.grievance, workspace.organization?.name, workspace.appeals, workspace.documentRequests);
  const timeline = workspace.events.map(toTimelineEvent);
  const documents = workspace.documents.map(toDocumentRecord);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title={grievance.shortTitle}
        description={`Lodged ${grievance.lodgedAt}${grievance.office ? ` · ${grievance.office}` : ""}`}
        actions={grievance.sla ? <SlaIndicator {...grievance.sla} compact /> : undefined}
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

          <Card className="border-border"><CardContent className="grid gap-4 p-5 md:grid-cols-2 md:p-6"><div><p className="text-xs font-semibold text-muted-foreground">Structured summary</p><p className="mt-1 text-sm">{workspace.grievance.short_title || "No structured summary has been recorded."}</p></div><div><p className="text-xs font-semibold text-muted-foreground">Current routing</p><p className="mt-1 text-sm">{workspace.organization?.name ?? "Not yet assigned"}</p></div><div><p className="text-xs font-semibold text-muted-foreground">Requested outcome</p><p className="mt-1 text-sm">{workspace.grievance.requested_outcome ?? "Not recorded"}</p></div><div><p className="text-xs font-semibold text-muted-foreground">Citizen-required action</p><p className="mt-1 text-sm">{workspace.documentRequests.find((request) => !request.fulfilled_at)?.reason ?? (workspace.grievance.administrative_state === "CLARIFICATION_REQUIRED" ? "Clarification requested" : "No action currently required")}</p></div></CardContent></Card>

          {user && <OfficerCaseActions grievanceId={id} citizenId={workspace.grievance.citizen_id} userId={user.id} organizations={taxonomyQuery.data?.organizations ?? []} {...(workspace.appeals.find((appeal) => appeal.state === "UNDER_REVIEW") ? { appealId: workspace.appeals.find((appeal) => appeal.state === "UNDER_REVIEW")!.id } : {})} />}

          <section className="space-y-4" aria-labelledby="case-history">
            <h2 id="case-history" className="text-lg font-semibold">
              Case history
            </h2>
            {timeline.length ? <Timeline events={timeline} /> : <EmptyState title="No case events yet" description="Recorded case activity will appear here." />}
          </section>

          <section className="space-y-4" aria-labelledby="case-records">
            <h2 id="case-records" className="text-lg font-semibold">Requests, messages, and resolutions</h2>
            {workspace.documentRequests.map((request) => <Card key={request.id} className="border-border"><CardContent className="space-y-1 p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold">Document request</h3><span className="text-xs text-muted-foreground">{request.fulfilled_at ? "Fulfilled" : request.due_at ? `Due ${formatDate(request.due_at)}` : "Open"}</span></div><p className="text-sm text-muted-foreground">{request.reason}</p>{workspace.documentRequestItems.filter((item) => item.request_id === request.id).map((item) => <p key={item.id} className="text-xs text-muted-foreground">• {item.label}{item.is_required ? " (required)" : ""}</p>)}</CardContent></Card>)}
            {workspace.messages.map((message) => <Card key={message.id} className="border-border"><CardContent className="space-y-1 p-5"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">Message from {message.sender_type === "citizen" ? "citizen" : "office"}</h3><span className="text-xs text-muted-foreground">{formatDateTime(message.created_at)}</span></div><p className="text-sm text-muted-foreground">{message.body}</p></CardContent></Card>)}
            {workspace.resolutions.map((resolution) => <Card key={resolution.id} className="border-border"><CardContent className="space-y-1 p-5"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{resolution.is_interim ? "Interim response" : "Resolution"}</h3><span className="text-xs text-muted-foreground">{formatDate(resolution.created_at)}</span></div><p className="text-sm">{resolution.action_taken}</p><p className="text-sm text-muted-foreground">Claimed outcome: {resolution.outcome_claimed}</p></CardContent></Card>)}
            {!workspace.documentRequests.length && !workspace.messages.length && !workspace.resolutions.length && <EmptyState title="No case records yet" description="Document requests, messages, and resolutions will appear here." />}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Dynamic priority</h2>
            <PriorityIndicator priority={workspace.priority} />
            {markOpened.isError && (
              <p className="text-xs text-critical">{queryErrorDetail(markOpened.error)}</p>
            )}
          </div>

          {grievance.sla && <SlaIndicator {...grievance.sla} />}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Documents</h2>
            {documents.map((d) => (
              <DocumentCard key={d.id} document={d} compact />
            ))}
            {!documents.length && <p className="text-sm text-muted-foreground">No documents are attached to this case.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
