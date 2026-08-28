import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionRequiredCard,
  CaseJourney,
  CaseNarrativeCard,
  CitizenDocumentRequestChecklist,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  RequestedOutcomeCard,
  SlaIndicator,
  StatusExplanationCard,
  Timeline,
  PrivateDocumentCard,
  GrievanceRouteBoundary,
  TranslatedText,
} from "@/components/cpgrams";
import { getCitizenActionItems, getCitizenActionState } from "@/lib/cpgrams/citizen-case";
import {
  formatDate,
  formatDateTime,
  toGrievanceSummary,
  toTimelineEvent,
} from "@/lib/cpgrams/data-adapters";
import {
  cpgramsQueryKeys,
  queryErrorDetail,
  useCitizenReminderStatusQuery,
  useGrievanceWorkspaceQuery,
} from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import {
  respondToCitizenClarification,
  sendCitizenReminder,
  uniqueDocuments,
  uploadCitizenDocument,
  type ClarificationRequestRow,
  type DocumentRow,
} from "@/lib/cpgrams/data-access";
import { isResolutionEvidence } from "@/lib/cpgrams/citizen-resolution";
import { resolutionRouteDebug } from "@/lib/cpgrams/resolution-debug";
import { buildCitizenCaseNarrative } from "@/lib/cpgrams/citizen-narrative";

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
  component: CitizenGrievanceRoute,
});

function CitizenGrievanceRoute() {
  const leafRouteId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });
  return (
    <GrievanceRouteBoundary
      isDetailRoute={leafRouteId === Route.id}
      detail={<CitizenGrievanceDetail />}
      nestedRoute={<Outlet />}
    />
  );
}

function CitizenGrievanceDetail() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const [clarificationSuccess, setClarificationSuccess] = useState(false);
  const caseQuery = useGrievanceWorkspaceQuery(id);
  if (caseQuery.isPending) return <LoadingState variant="page" label="Loading case details" />;
  if (caseQuery.isError)
    return (
      <ErrorState
        detail={queryErrorDetail(caseQuery.error)}
        onRetry={() => void caseQuery.refetch()}
      />
    );
  if (!caseQuery.data)
    return (
      <EmptyState
        title="Case not found"
        description="This case does not exist or is outside your authorized cases."
      />
    );
  const workspace = caseQuery.data;
  const grievance = toGrievanceSummary(
    workspace.grievance,
    workspace.organization?.name,
    workspace.appeals,
    workspace.documentRequests,
    workspace.category?.name,
    workspace.clarificationRequests,
  );
  const action = getCitizenActionState(
    workspace.grievance,
    workspace.documentRequests,
    workspace.documentRequestItems,
    workspace.appeals,
    workspace.clarificationRequests,
  );
  const actionItems = getCitizenActionItems(
    workspace.grievance,
    workspace.documentRequests,
    workspace.documentRequestItems,
    workspace.appeals,
    workspace.clarificationRequests,
  );
  const hasAction = (state: string) => actionItems.some((entry) => entry.state === state);
  const timeline = workspace.events.filter((event) => event.citizen_visible).map(toTimelineEvent);
  const documents = uniqueDocuments(workspace.documents);
  const requestDocumentIds = new Set(
    workspace.documentRequestItems.map((item) => item.document_id).filter(Boolean),
  );
  const appealDocuments = documents.filter((document) => /appeal/i.test(document.doc_kind ?? ""));
  const appealDocumentIds = new Set(appealDocuments.map((document) => document.id));
  const requestedDocuments = documents.filter((document) => requestDocumentIds.has(document.id));
  const citizenDocuments = documents.filter(
    (document) =>
      document.uploaded_by === user?.id &&
      !requestDocumentIds.has(document.id) &&
      !appealDocumentIds.has(document.id),
  );
  const resolutionDocuments = documents.filter((document) =>
    isResolutionEvidence(document, user?.id),
  );
  const resolutionDocumentIds = new Set(resolutionDocuments.map((document) => document.id));
  const governmentDocuments = documents.filter(
    (document) =>
      document.uploaded_by !== user?.id &&
      !requestDocumentIds.has(document.id) &&
      !resolutionDocumentIds.has(document.id) &&
      !appealDocumentIds.has(document.id),
  );
  const openRequests = workspace.documentRequests.filter((request) => !request.fulfilled_at);
  const clarificationRequests = workspace.clarificationRequests.filter(
    (request) => !request.fulfilled_at,
  );
  const narrative = buildCitizenCaseNarrative({
    grievance: workspace.grievance,
    organizationName: workspace.organization?.name,
    events: workspace.events,
    action,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={grievance.registrationNumber}
        title={grievance.shortTitle}
        description={`Lodged ${grievance.lodgedAt}${grievance.office ? ` · ${grievance.office}` : ""} · Last updated ${grievance.lastUpdated}`}
        actions={
          <>
            {hasAction("review_government_resolution") && (
              <Button asChild variant="outline">
                <Link
                  to="/citizen/grievances/$id/resolution"
                  params={{ id }}
                  onClick={() =>
                    resolutionRouteDebug("01", "navigation requested", { grievanceId: id })
                  }
                >
                  Confirm the outcome
                </Link>
              </Button>
            )}
            {hasAction("appeal_available") && (
              <Button asChild>
                <Link to="/citizen/grievances/$id/appeal" params={{ id }}>
                  File an appeal
                </Link>
              </Button>
            )}
          </>
        }
      />

      {actionItems.length ? (
        <section className="space-y-4" aria-labelledby="current-actions">
          <div>
            <h2 id="current-actions" className="text-lg font-semibold">
              Action required
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These are the current steps that need your attention. Your full history remains below.
            </p>
          </div>
          {hasAction("upload_documents") && user && (
            <ActionRequiredCard
              title="Documents requested"
              description="Provide the outstanding documents listed below so the office can continue."
            >
              <CitizenDocumentRequestChecklist
                grievanceId={id}
                userId={user.id}
                requests={openRequests}
                items={workspace.documentRequestItems}
                documents={workspace.documents}
              />
            </ActionRequiredCard>
          )}
          {clarificationRequests.map((request) => (
            <CitizenClarificationResponse
              key={request.id}
              grievanceId={id}
              request={request}
              userId={user?.id}
              onSaved={() => setClarificationSuccess(true)}
            />
          ))}
          {hasAction("answer_clarification") && clarificationRequests.length === 0 && (
            <ActionRequiredCard
              title="Clarification requested"
              description="The office needs more information before it can continue."
            />
          )}
          {hasAction("review_government_resolution") && (
            <ActionRequiredCard
              title="Review government resolution"
              description="The office has provided a resolution. Tell us whether it actually solved your problem."
            >
              <Button asChild size="sm">
                <Link
                  to="/citizen/grievances/$id/resolution"
                  params={{ id }}
                  onClick={() =>
                    resolutionRouteDebug("01", "navigation requested", { grievanceId: id })
                  }
                >
                  Confirm outcome
                </Link>
              </Button>
            </ActionRequiredCard>
          )}
          {hasAction("appeal_available") && (
            <ActionRequiredCard
              title="Appeal available"
              description="You reported that the problem remains partly or fully unresolved."
            >
              <Button asChild size="sm">
                <Link to="/citizen/grievances/$id/appeal" params={{ id }}>
                  Appeal this resolution
                </Link>
              </Button>
            </ActionRequiredCard>
          )}
        </section>
      ) : (
        <Card className="border-success/35 bg-success-surface">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-success">No action required</h2>
            <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
          </CardContent>
        </Card>
      )}

      {clarificationSuccess && (
        <Card className="border-success/35 bg-success-surface" role="status">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-success">Government processing resumed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your clarification was saved and the assigned officer was notified.
            </p>
          </CardContent>
        </Card>
      )}

      {user && <CitizenReminder grievanceId={id} userId={user.id} />}

      <CaseJourney grievance={workspace.grievance} appeals={workspace.appeals} />
      <CaseNarrativeCard narrative={narrative} />

      <StatusExplanationCard
        adminStatus={grievance.adminStatus}
        citizenOutcome={grievance.citizenOutcome}
      />

      {grievance.sla && <SlaIndicator {...grievance.sla} />}

      <section className="space-y-4" aria-labelledby="your-problem">
        <div>
          <h2 id="your-problem" className="text-lg font-semibold">
            Your problem
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your original description is preserved exactly as you wrote it.
          </p>
        </div>
        <Card className="border-border">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-line">
            {grievance.originalText}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="requested-outcome">
        <h2 id="requested-outcome" className="text-lg font-semibold">
          What you asked government to do
        </h2>
        <RequestedOutcomeCard
          outcome={{
            citizenWords:
              workspace.grievance.requested_outcome || "No requested outcome was recorded.",
            urgency: workspace.grievance.urgency,
          }}
        />
      </section>

      <section className="space-y-4" aria-labelledby="case-structure">
        <h2 id="case-structure" className="text-lg font-semibold">
          Case details
        </h2>
        <Card className="border-border">
          <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Current organization</p>
              <p className="mt-1">{workspace.organization?.name ?? "Not yet assigned"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Current state</p>
              <p className="mt-1">{grievance.adminStatus.replaceAll("_", " ")}</p>
            </div>
            {workspace.category && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Category</p>
                <p className="mt-1">{workspace.category.name}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Urgency</p>
              <p className="mt-1">{workspace.grievance.urgency.replaceAll("_", " ")}</p>
            </div>
            {workspace.grievance.location_text && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Location</p>
                <p className="mt-1">{workspace.grievance.location_text}</p>
              </div>
            )}
            {workspace.grievance.requested_outcome && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Requested outcome</p>
                <p className="mt-1">{workspace.grievance.requested_outcome}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="case-messages">
        <h2 id="case-messages" className="text-lg font-semibold">
          Messages
        </h2>
        {workspace.messages.length ? (
          <div className="space-y-3">
            {workspace.messages.map((message) => (
              <Card key={message.id} className="border-border">
                <CardContent className="space-y-1 p-5">
                  <div className="flex justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {message.sender_type === "citizen" ? "You" : "Government office"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <TranslatedText
                    text={message.body}
                    contentType="message"
                    className="text-sm text-muted-foreground"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No messages"
            description="Citizen-visible messages about this case will appear here."
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="case-resolutions">
        <h2 id="case-resolutions" className="text-lg font-semibold">
          Recorded resolution
        </h2>
        {workspace.resolutions.length ? (
          <div className="space-y-3">
            {workspace.resolutions.map((resolution) => (
              <Card key={resolution.id} className="border-border">
                <CardContent className="space-y-2 p-5">
                  <div className="flex justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {resolution.is_interim ? "Interim response" : "Resolution recorded"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(resolution.created_at)}
                    </span>
                  </div>
                  <TranslatedText
                    text={resolution.action_taken}
                    contentType="resolution"
                    className="text-sm"
                  />
                  <div className="text-sm text-muted-foreground">
                    <span>Claimed outcome: </span>
                    <TranslatedText text={resolution.outcome_claimed} contentType="resolution" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No resolution recorded"
            description="Any resolution provided by the office will appear here without changing your original grievance text."
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="case-feedback">
        <h2 id="case-feedback" className="text-lg font-semibold">
          Your outcome feedback
        </h2>
        {workspace.feedback.length ? (
          <div className="space-y-3">
            {workspace.feedback.map((entry) => (
              <Card key={entry.id} className="border-border">
                <CardContent className="space-y-1 p-5">
                  <h3 className="text-sm font-semibold">
                    {entry.confirmation.replaceAll("_", " ")}
                  </h3>
                  {entry.satisfaction_rating != null && (
                    <p className="text-sm">Satisfaction: {entry.satisfaction_rating}/5</p>
                  )}
                  {entry.comments && (
                    <p className="text-sm text-muted-foreground">{entry.comments}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No feedback recorded"
            description="Your confirmation and satisfaction feedback will appear here after you respond."
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="case-appeals">
        <h2 id="case-appeals" className="text-lg font-semibold">
          Appeals
        </h2>
        {workspace.appeals.length ? (
          <div className="space-y-3">
            {workspace.appeals.map((appeal) => (
              <Card key={appeal.id} className="border-border">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <h3 className="font-mono text-sm font-semibold">{appeal.reference_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {appeal.state.replaceAll("_", " ")} · filed {formatDate(appeal.filed_at)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/citizen/appeals/$id" params={{ id: appeal.id }}>
                      Open appeal
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No appeal filed"
            description="Any appeal linked to this grievance will appear here."
          />
        )}
      </section>

      <section className="space-y-4" aria-labelledby="case-history">
        <h2 id="case-history" className="text-lg font-semibold">
          What has happened
        </h2>
        {timeline.length ? (
          <Timeline events={timeline} />
        ) : (
          <EmptyState
            title="No case events yet"
            description="Recorded case activity will appear here."
          />
        )}
      </section>

      <section className="space-y-6" aria-labelledby="case-evidence">
        <h2 id="case-evidence" className="text-lg font-semibold">
          Evidence
        </h2>
        <EvidenceSection
          title="Citizen documents"
          documents={citizenDocuments}
          empty="Documents you upload outside a request will appear here."
        />
        <EvidenceSection
          title="Requested documents"
          documents={requestedDocuments}
          empty="Documents supplied against an office request will appear here."
        />
        <EvidenceSection
          title="Government documents"
          documents={governmentDocuments}
          empty="Government documents not attached as resolution evidence will appear here."
        />
        <EvidenceSection
          title="Resolution evidence"
          documents={resolutionDocuments}
          empty="Evidence attached by the government for a resolution will appear here."
        />
        <EvidenceSection
          title="Appeal evidence"
          documents={appealDocuments}
          empty="Evidence attached to an appeal will appear here."
        />
      </section>
    </div>
  );
}

function CitizenClarificationResponse({
  grievanceId,
  request,
  userId,
  onSaved,
}: {
  grievanceId: string;
  request: ClarificationRequestRow;
  userId: string | undefined;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Your authenticated session is unavailable.");
      let documentId: string | undefined;
      if (file)
        documentId = (
          await uploadCitizenDocument({
            grievanceId,
            userId,
            file,
            docKind: "clarification_response",
          })
        ).id;
      await respondToCitizenClarification({
        clarificationRequestId: request.id,
        response,
        ...(documentId ? { documentId } : {}),
      });
    },
    onSuccess: async () => {
      onSaved();
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(grievanceId) }),
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.citizenGrievances(userId) }),
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.notifications(userId) }),
        queryClient.invalidateQueries({
          queryKey: cpgramsQueryKeys.citizenReminderStatus(grievanceId),
        }),
      ]);
    },
  });
  return (
    <ActionRequiredCard title="Government needs clarification" description={request.question}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`clarification-${request.id}`}>
            Your response
          </label>
          <Textarea
            id={`clarification-${request.id}`}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            rows={4}
            maxLength={4_000}
            placeholder="Provide the information the government office requested."
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`clarification-file-${request.id}`}>
            Attachment (optional, maximum 6 MB)
          </label>
          <Input
            id={`clarification-file-${request.id}`}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          SLA clock paused · Reason: Waiting for information from you
        </p>
        <Button type="submit" size="sm" disabled={!response.trim() || mutation.isPending}>
          {mutation.isPending ? "Submitting clarification…" : "Submit clarification"}
        </Button>
        {mutation.isError && (
          <p className="text-sm text-critical" role="alert">
            {queryErrorDetail(mutation.error)}
          </p>
        )}
      </form>
    </ActionRequiredCard>
  );
}

function CitizenReminder({ grievanceId, userId }: { grievanceId: string; userId: string }) {
  const queryClient = useQueryClient();
  const statusQuery = useCitizenReminderStatusQuery(grievanceId);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const mutation = useMutation({
    mutationFn: () => sendCitizenReminder(grievanceId, message),
    onSuccess: async () => {
      setMessage("");
      setSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(grievanceId) }),
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.citizenGrievances(userId) }),
        queryClient.invalidateQueries({
          queryKey: cpgramsQueryKeys.citizenReminderStatus(grievanceId),
        }),
      ]);
    },
  });
  if (statusQuery.isPending) return null;
  if (statusQuery.isError)
    return (
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm text-critical" role="alert">
            {queryErrorDetail(statusQuery.error)}
          </p>
        </CardContent>
      </Card>
    );
  const status = statusQuery.data;
  return (
    <Card className="border-border">
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Send a reminder</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask the assigned officer for an update on this open grievance. Reminder priority is
            rate-limited and capped.
          </p>
        </div>
        {success && (
          <p className="text-sm text-success" role="status">
            Reminder sent to the assigned officer.
          </p>
        )}
        {status?.eligible ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSuccess(false);
              mutation.mutate();
            }}
          >
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Write a short reminder for the assigned officer."
              required
            />
            <Button type="submit" size="sm" disabled={!message.trim() || mutation.isPending}>
              {mutation.isPending ? "Sending reminder…" : "Send reminder"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {status?.nextReminderAt && new Date(status.nextReminderAt).getTime() > Date.now()
              ? `You can send another reminder after ${formatDateTime(status.nextReminderAt)}.`
              : (status?.reason ?? "A reminder is not available for this grievance right now.")}
          </p>
        )}
        {mutation.isError && (
          <p className="text-sm text-critical" role="alert">
            {queryErrorDetail(mutation.error)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EvidenceSection({
  title,
  documents,
  empty,
}: {
  title: string;
  documents: DocumentRow[];
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {documents.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {documents.map((document) => (
            <PrivateDocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${title.toLocaleLowerCase()} yet`} description={empty} />
      )}
    </section>
  );
}
