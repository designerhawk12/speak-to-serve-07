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
import {
  toAppealTimelineEventForViewer,
  toGrievanceSummary,
  toTimelineEventForViewer,
} from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useAppealWorkspaceQuery } from "@/lib/cpgrams/queries";
import { cpgramsQueryKeys } from "@/lib/cpgrams/queries";
import { recordAppellateDecision, requestAppealOfficeReply } from "@/lib/cpgrams/data-access";

export const Route = createFileRoute("/office/appeals/$id")({
  head: () => ({
    meta: [
      { title: "Appeal file — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "What the office did, what the citizen still reports, and the decision the authority must take.",
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
  const refresh = async () => {
    const data = appealQuery.data;
    if (!data) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.appeal(id) }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedAppeals }),
      queryClient.invalidateQueries({
        queryKey: cpgramsQueryKeys.grievance(data.grievanceWorkspace.grievance.id),
      }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedGrievances }),
      queryClient.invalidateQueries({
        queryKey: cpgramsQueryKeys.notifications(data.grievanceWorkspace.grievance.citizen_id),
      }),
    ]);
  };
  const decisionMutation = useMutation({
    mutationFn: () =>
      recordAppellateDecision({
        appealId: id,
        decisionSummary: decision,
        decisionReasons: reasons,
      }),
    onSuccess: async () => {
      await refresh();
      setMode(null);
      setSuccess("Appeal decision recorded and the citizen has been notified.");
    },
  });
  const replyMutation = useMutation({
    mutationFn: () => requestAppealOfficeReply({ appealId: id, instructions }),
    onSuccess: async () => {
      await refresh();
      setMode(null);
      setSuccess("Reply request sent to the responsible office.");
    },
  });
  if (appealQuery.isPending) return <LoadingState variant="page" label="Loading appeal file" />;
  if (appealQuery.isError)
    return (
      <ErrorState
        detail={queryErrorDetail(appealQuery.error)}
        onRetry={() => void appealQuery.refetch()}
      />
    );
  if (!appealQuery.data)
    return (
      <EmptyState
        title="Appeal not found"
        description="This appeal does not exist or is outside your authorized appeal scope."
      />
    );
  const { appeal, appealEvents, grievanceWorkspace } = appealQuery.data;
  const grievance = toGrievanceSummary(
    grievanceWorkspace.grievance,
    grievanceWorkspace.organization?.name,
    grievanceWorkspace.appeals,
    grievanceWorkspace.documentRequests,
  );
  const timeline = [
    ...grievanceWorkspace.events.map((event) => toTimelineEventForViewer(event, "government")),
    ...appealEvents.map((event) => toAppealTimelineEventForViewer(event, "government")),
  ].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );
  const citizenEvidence = grievanceWorkspace.documents.filter(
    (document) => document.uploaded_by === grievanceWorkspace.grievance.citizen_id,
  );
  const governmentEvidence = grievanceWorkspace.documents.filter(
    (document) => document.uploaded_by !== grievanceWorkspace.grievance.citizen_id,
  );
  const currentResolution = grievanceWorkspace.resolutions.find(
    (resolution) => !resolution.is_interim,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={appeal.reference_number}
        title={grievance.shortTitle}
        description="Decide only after comparing what the office recorded with what the citizen reports."
      />

      <StatusExplanationCard
        adminStatus={grievance.adminStatus}
        citizenOutcome={grievance.citizenOutcome}
        citizenLaneLabel="Citizen confirmation"
        viewer="government"
      />

      <section
        className="grid gap-4 lg:grid-cols-2"
        aria-label="Original grievance and requested outcome"
      >
        <Card className="border-border">
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">Original complaint</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{grievance.originalText}</p>
          </CardContent>
        </Card>
        <RequestedOutcomeCard
          outcome={{
            citizenWords:
              grievanceWorkspace.grievance.requested_outcome ??
              "No requested outcome was recorded.",
            ...(grievance.urgency ? { urgency: grievance.urgency } : {}),
          }}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Appeal evidence and reasons">
        <Card className="border-border">
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">Government resolution</h2>
            {currentResolution ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">{currentResolution.action_taken}</p>
                {currentResolution.outcome_achieved && (
                  <p className="text-sm text-muted-foreground">
                    Outcome achieved: {currentResolution.outcome_achieved}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Claimed outcome: {currentResolution.outcome_claimed}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentResolution.resolution_narrative ??
                    "No additional resolution narrative recorded."}
                </p>
                {currentResolution.evidence_reference && (
                  <p className="text-xs text-muted-foreground">
                    Evidence/reference: {currentResolution.evidence_reference}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No resolution record is available.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">Citizen reason for appeal</h2>
            <p className="whitespace-pre-wrap text-sm">{appeal.grounds}</p>
            {appeal.requested_relief && (
              <>
                <p className="pt-2 text-xs font-semibold text-muted-foreground">
                  Requested correction
                </p>
                <p className="whitespace-pre-wrap text-sm">{appeal.requested_relief}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Citizen evidence</h2>
            {citizenEvidence.length ? (
              <div className="grid gap-2">
                {citizenEvidence.map((document) => (
                  <PrivateDocumentCard key={document.id} document={document} compact />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No citizen evidence is available in this file.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Government evidence</h2>
            {governmentEvidence.length ? (
              <div className="grid gap-2">
                {governmentEvidence.map((document) => (
                  <PrivateDocumentCard key={document.id} document={document} compact />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No government evidence is available in this file.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border">
        <CardContent className="space-y-2 p-5">
          <h2 className="text-sm font-semibold">Appellate decision</h2>
          {appeal.decision_summary ? (
            <>
              <p className="text-sm font-medium">{appeal.decision_summary}</p>
              {appeal.decision_reasons && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {appeal.decision_reasons}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No appellate decision has been recorded. A human Appellate Authority must record one
              manually.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-semibold">Manual appeal actions</h2>
          {appeal.state !== "DECIDED" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setSuccess("");
                  setMode("decision");
                }}
              >
                Record your decision
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess("");
                  setMode("reply");
                }}
              >
                Ask the office for a reply
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This appeal has a recorded decision. The existing decision remains visible above.
            </p>
          )}
          {mode === "decision" && (
            <form
              className="space-y-3 rounded-md border border-border bg-surface-sunken p-4"
              onSubmit={(event) => {
                event.preventDefault();
                decisionMutation.mutate();
              }}
            >
              <label className="text-sm font-medium">Decision</label>
              <Textarea
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                rows={3}
                placeholder="State the decision in language the citizen can understand."
              />
              <label className="text-sm font-medium">Reasons</label>
              <Textarea
                value={reasons}
                onChange={(event) => setReasons(event.target.value)}
                rows={3}
                placeholder="Record the facts and reasons supporting this decision."
              />
              <Button
                type="submit"
                disabled={!decision.trim() || !reasons.trim() || decisionMutation.isPending}
              >
                {decisionMutation.isPending ? "Saving decision" : "Save decision"}
              </Button>
              {decisionMutation.isError && (
                <p className="text-sm text-critical" role="alert">
                  {queryErrorDetail(decisionMutation.error)}
                </p>
              )}
            </form>
          )}
          {mode === "reply" && (
            <form
              className="space-y-3 rounded-md border border-border bg-surface-sunken p-4"
              onSubmit={(event) => {
                event.preventDefault();
                replyMutation.mutate();
              }}
            >
              <label className="text-sm font-medium">Instructions for the responsible office</label>
              <Textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={4}
                placeholder="State what record, explanation, or evidence is required."
              />
              <Button type="submit" disabled={!instructions.trim() || replyMutation.isPending}>
                {replyMutation.isPending ? "Sending request" : "Send reply request"}
              </Button>
              {replyMutation.isError && (
                <p className="text-sm text-critical" role="alert">
                  {queryErrorDetail(replyMutation.error)}
                </p>
              )}
            </form>
          )}
          {success && (
            <p className="text-sm text-success" role="status">
              {success}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Office reply activity</h2>
          {appealEvents
            .filter((event) =>
              ["APPEAL_OFFICE_REPLY_REQUESTED", "APPEAL_OFFICE_REPLY_PROVIDED"].includes(
                event.event_type,
              ),
            )
            .map((event) => (
              <div key={event.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.description}
                </p>
              </div>
            ))}
          {!appealEvents.some((event) =>
            ["APPEAL_OFFICE_REPLY_REQUESTED", "APPEAL_OFFICE_REPLY_PROVIDED"].includes(
              event.event_type,
            ),
          ) && <p className="text-sm text-muted-foreground">No office reply has been requested.</p>}
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="appeal-history">
        <h2 id="appeal-history" className="text-lg font-semibold">
          Full case history
        </h2>
        {timeline.length ? (
          <Timeline events={timeline} />
        ) : (
          <EmptyState
            title="No history yet"
            description="Case and appeal events will appear here when recorded."
          />
        )}
      </section>
    </div>
  );
}
