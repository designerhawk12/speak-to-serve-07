import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ErrorState,
  PrivateDocumentCard,
  LoadingState,
  PageHeader,
  RequestedOutcomeCard,
  StatusExplanationCard,
  Timeline,
} from "@/components/cpgrams";
import { toAppealTimelineEvent, toGrievanceSummary, toTimelineEvent } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAppealWorkspaceQuery } from "@/lib/cpgrams/queries";
import { cpgramsQueryKeys } from "@/lib/cpgrams/queries";
import { recordAppellateDecision, requestAppealOfficeReply } from "@/lib/cpgrams/data-access";

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
  const appealQuery = useAppealWorkspaceQuery(id);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"decision" | "reply" | null>(null);
  const [decision, setDecision] = useState("");
  const [reasons, setReasons] = useState("");
  const [instructions, setInstructions] = useState("");
  const [success, setSuccess] = useState("");
  if (appealQuery.isPending) return <LoadingState variant="page" label="Loading appeal file" />;
  if (appealQuery.isError) return <ErrorState detail={queryErrorDetail(appealQuery.error)} onRetry={() => void appealQuery.refetch()} />;
  if (!appealQuery.data) return <EmptyState title="Appeal not found" description="This appeal does not exist or is outside your authorized appeal scope." />;
  const { appeal, appealEvents, grievanceWorkspace } = appealQuery.data;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.appeal(id) }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedAppeals }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(grievanceWorkspace.grievance.id) }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedGrievances }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.notifications(grievanceWorkspace.grievance.citizen_id) }),
    ]);
  };
  const decisionMutation = useMutation({ mutationFn: () => recordAppellateDecision({ appealId: id, decisionSummary: decision, decisionReasons: reasons }), onSuccess: async () => { await refresh(); setMode(null); setSuccess("Appeal decision recorded and the citizen has been notified."); } });
  const replyMutation = useMutation({ mutationFn: () => requestAppealOfficeReply({ appealId: id, instructions }), onSuccess: async () => { await refresh(); setMode(null); setSuccess("Reply request sent to the responsible office."); } });
  const grievance = toGrievanceSummary(
    grievanceWorkspace.grievance,
    grievanceWorkspace.organization?.name,
    grievanceWorkspace.appeals,
    grievanceWorkspace.documentRequests,
  );
  const timeline = [
    ...grievanceWorkspace.events.map(toTimelineEvent),
    ...appealEvents.map(toAppealTimelineEvent),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={appeal.reference_number}
        title={grievance.shortTitle}
        description="Decide only after comparing what the office recorded with what the citizen reports."
      />

      <StatusExplanationCard adminStatus={grievance.adminStatus} citizenOutcome={grievance.citizenOutcome} />

      <RequestedOutcomeCard
        outcome={{ citizenWords: grievance.originalText }}
        originalText={grievance.originalText}
      />

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Appeal evidence and reasons">
        <Card className="border-border"><CardContent className="space-y-2 p-5"><h2 className="text-sm font-semibold">Government resolution</h2>{grievanceWorkspace.resolutions.filter((resolution) => !resolution.is_interim).map((resolution) => <div key={resolution.id} className="rounded-md border border-border p-3"><p className="text-sm font-medium">{resolution.action_taken}</p><p className="mt-1 text-sm text-muted-foreground">{resolution.resolution_narrative ?? "No additional resolution narrative recorded."}</p></div>)}{!grievanceWorkspace.resolutions.some((resolution) => !resolution.is_interim) && <p className="text-sm text-muted-foreground">No resolution record is available.</p>}</CardContent></Card>
        <Card className="border-border"><CardContent className="space-y-2 p-5"><h2 className="text-sm font-semibold">Citizen reason for appeal</h2><p className="whitespace-pre-wrap text-sm">{appeal.grounds}</p>{appeal.requested_relief && <><p className="pt-2 text-xs font-semibold text-muted-foreground">Requested correction</p><p className="whitespace-pre-wrap text-sm">{appeal.requested_relief}</p></>}</CardContent></Card>
        <Card className="border-border lg:col-span-2"><CardContent className="space-y-3 p-5"><h2 className="text-sm font-semibold">Relevant evidence</h2>{grievanceWorkspace.documents.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{grievanceWorkspace.documents.map((document) => <PrivateDocumentCard key={document.id} document={document} compact />)}</div> : <p className="text-sm text-muted-foreground">No evidence is attached to this case.</p>}</CardContent></Card>
      </section>

      <Card className="border-border">
        <CardContent className="space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-semibold">Manual appeal actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setSuccess(""); setMode("decision"); }}>Record your decision</Button>
            <Button variant="outline" onClick={() => { setSuccess(""); setMode("reply"); }}>Ask the office for a reply</Button>
          </div>
          {mode === "decision" && <form className="space-y-3 rounded-md border border-border bg-surface-sunken p-4" onSubmit={(event) => { event.preventDefault(); decisionMutation.mutate(); }}><label className="text-sm font-medium">Decision</label><Textarea value={decision} onChange={(event) => setDecision(event.target.value)} rows={3} placeholder="State the decision in language the citizen can understand." /><label className="text-sm font-medium">Reasons</label><Textarea value={reasons} onChange={(event) => setReasons(event.target.value)} rows={3} placeholder="Record the facts and reasons supporting this decision." /><Button type="submit" disabled={!decision.trim() || !reasons.trim() || decisionMutation.isPending}>{decisionMutation.isPending ? "Saving decision" : "Save decision"}</Button>{decisionMutation.isError && <p className="text-sm text-critical" role="alert">{queryErrorDetail(decisionMutation.error)}</p>}</form>}
          {mode === "reply" && <form className="space-y-3 rounded-md border border-border bg-surface-sunken p-4" onSubmit={(event) => { event.preventDefault(); replyMutation.mutate(); }}><label className="text-sm font-medium">Instructions for the responsible office</label><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={4} placeholder="State what record, explanation, or evidence is required." /><Button type="submit" disabled={!instructions.trim() || replyMutation.isPending}>{replyMutation.isPending ? "Sending request" : "Send reply request"}</Button>{replyMutation.isError && <p className="text-sm text-critical" role="alert">{queryErrorDetail(replyMutation.error)}</p>}</form>}
          {success && <p className="text-sm text-success" role="status">{success}</p>}
        </CardContent>
      </Card>

      <Card className="border-border"><CardContent className="space-y-3 p-5"><h2 className="text-sm font-semibold">Office reply activity</h2>{appealEvents.filter((event) => ["APPEAL_OFFICE_REPLY_REQUESTED", "APPEAL_OFFICE_REPLY_PROVIDED"].includes(event.event_type)).map((event) => <div key={event.id} className="rounded-md border border-border p-3"><p className="text-sm font-medium">{event.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p></div>)}{!appealEvents.some((event) => ["APPEAL_OFFICE_REPLY_REQUESTED", "APPEAL_OFFICE_REPLY_PROVIDED"].includes(event.event_type)) && <p className="text-sm text-muted-foreground">No office reply has been requested.</p>}</CardContent></Card>

      <section className="space-y-4" aria-labelledby="appeal-history">
        <h2 id="appeal-history" className="text-lg font-semibold">
          Full case history
        </h2>
        {timeline.length ? <Timeline events={timeline} /> : <EmptyState title="No history yet" description="Case and appeal events will appear here when recorded." />}
      </section>
    </div>
  );
}
