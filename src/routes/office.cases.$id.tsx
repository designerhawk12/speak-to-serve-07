import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfficerAiSummaryCard,
  OfficerCaseActions,
  PageHeader,
  PrivateDocumentCard,
  PriorityIndicator,
  RequestedOutcomeCard,
  SlaIndicator,
  StatusExplanationCard,
  Timeline,
  TranslatedText,
} from "@/components/cpgrams";
import {
  formatDate,
  formatDateTime,
  toGrievanceSummary,
  toTimelineEventForViewer,
} from "@/lib/cpgrams/data-adapters";
import {
  escalationAudienceLabel,
  escalationNotificationState,
  isWaitingOnCitizen,
} from "@/lib/cpgrams/officer-presentation";
import {
  queryErrorDetail,
  useGrievanceWorkspaceQuery,
  useIntakeTaxonomyQuery,
  useMarkGrievanceOpenedMutation,
  useNotificationsQuery,
} from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import { transferDeadlineState } from "@/lib/cpgrams/transfer-deadline";
import { uniqueDocuments } from "@/lib/cpgrams/data-access";
import { mayOpenNormalOfficerCase } from "@/lib/cpgrams/officer-assignment";

export const Route = createFileRoute("/office/cases/$id")({
  head: () => ({
    meta: [
      { title: "Case file — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "The citizen's own words, the immutable case history, and the actions this office can record.",
      },
      { property: "og:title", content: "Case file" },
      {
        property: "og:description",
        content: "Officer case file with immutable history and advisory AI only.",
      },
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
  const notificationsQuery = useNotificationsQuery(user?.id);
  const openedAttempted = useRef(false);
  const canAct = Boolean(
    user &&
    (user.role === "nodal" ||
      (user.role === "gro" && caseQuery.data?.grievance.assigned_officer_id === user.id)),
  );

  useEffect(() => {
    if (
      !openedAttempted.current &&
      caseQuery.data &&
      user &&
      canAct &&
      !caseQuery.data.priority?.first_opened_at
    ) {
      openedAttempted.current = true;
      markOpened.mutate();
    }
  }, [canAct, caseQuery.data, markOpened, user]);

  if (caseQuery.isPending) return <LoadingState variant="page" label="Loading case file" />;
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
        description="This case does not exist or is outside your authorized case scope."
      />
    );
  if (
    !mayOpenNormalOfficerCase(
      user?.role,
      user?.id,
      caseQuery.data.grievance.assigned_officer_id,
    )
  )
    return (
      <EmptyState
        title="Case not assigned to you"
        description="A GRO's normal case workspace contains only grievances currently assigned to that GRO. Use the assigned account or an authorized Nodal oversight workspace."
      />
    );
  const workspace = caseQuery.data;
  const grievance = toGrievanceSummary(
    workspace.grievance,
    workspace.organization?.name,
    workspace.appeals,
    workspace.documentRequests,
  );
  const timeline = workspace.events.map((event) => toTimelineEventForViewer(event, "government"));
  const documents = uniqueDocuments(workspace.documents);
  const waitingOnCitizen = isWaitingOnCitizen(grievance, workspace.priority);
  const transferDeadline = transferDeadlineState(
    workspace.grievance.wrong_route_detected_at,
    workspace.grievance.transfer_due_at,
    workspace.grievance.wrong_route_resolved_at,
  );
  const notificationState = notificationsQuery.isPending
    ? { label: "Loading your notification state" }
    : notificationsQuery.isError
      ? { label: "Your notification state could not be loaded" }
      : escalationNotificationState(notificationsQuery.data, id);

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
          <section className="space-y-3" aria-labelledby="current-case-state">
            <h2 id="current-case-state" className="text-lg font-semibold">
              Current case state
            </h2>
            <StatusExplanationCard
              adminStatus={grievance.adminStatus}
              citizenOutcome={grievance.citizenOutcome}
              citizenLaneLabel="Citizen confirmation"
              viewer="government"
            />
            {waitingOnCitizen && (
              <Card className="border-info/30 bg-info-surface">
                <CardContent className="space-y-1 p-4">
                  <p className="text-sm font-semibold text-info">Waiting for citizen</p>
                  <p className="text-sm text-info">
                    {grievance.actionRequired ?? "Required citizen action is outstanding."}
                  </p>
                  <p className="text-xs text-info">
                    Government inactivity escalation is paused. This does not change case ownership.
                  </p>
                </CardContent>
              </Card>
            )}
            {transferDeadline?.pending && (
              <Card className="border-warning/40 bg-warning-surface">
                <CardContent className="space-y-3 p-4 text-warning-foreground">
                  <div>
                    <p className="text-sm font-semibold">Transfer required</p>
                    <p className="mt-1 text-sm">
                      This routing requirement changes attention, not ownership. The current office
                      remains responsible until an authorized organization transfer completes.
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold">Received/detected</dt>
                      <dd className="mt-1">
                        {formatDateTime(workspace.grievance.wrong_route_detected_at!)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold">Transfer by</dt>
                      <dd className="mt-1">
                        {formatDateTime(workspace.grievance.transfer_due_at!)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold">Time remaining</dt>
                      <dd className="mt-1 font-semibold">{transferDeadline.remainingLabel}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="citizen-problem">
            <h2 id="citizen-problem" className="text-lg font-semibold">
              Citizen's problem
            </h2>
            <Card className="border-border">
              <CardContent className="space-y-2 p-5 md:p-6">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Original grievance, unedited
                </p>
                <TranslatedText
                  text={grievance.originalText}
                  sourceLanguage={workspace.grievance.original_language}
                  contentType="grievance"
                  className="text-sm leading-relaxed"
                />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3" aria-labelledby="requested-outcome">
            <h2 id="requested-outcome" className="text-lg font-semibold">
              Requested outcome
            </h2>
            <RequestedOutcomeCard
              outcome={{
                citizenWords:
                  workspace.grievance.requested_outcome ??
                  "No requested outcome has been recorded.",
                ...(grievance.urgency ? { urgency: grievance.urgency } : {}),
                ...(workspace.category?.name ? { category: workspace.category.name } : {}),
              }}
            />
          </section>

          <section className="space-y-3" aria-labelledby="case-context">
            <h2 id="case-context" className="text-lg font-semibold">
              Case context
            </h2>
            <Card className="border-border">
              <CardContent className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Structured summary</p>
                  <p className="mt-1 text-sm">
                    {workspace.grievance.short_title || "No structured summary has been recorded."}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Current routing</p>
                  <p className="mt-1 text-sm">
                    {workspace.organization?.name ?? "Not yet assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Citizen-required action
                  </p>
                  <p className="mt-1 text-sm">
                    {workspace.documentRequests.find((request) => !request.fulfilled_at)?.reason ??
                      (workspace.clarificationRequests.some((request) => !request.fulfilled_at)
                        ? "Waiting for citizen clarification"
                        : "No action currently required")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Case owner</p>
                  <p className="mt-1 text-sm">
                    {workspace.organization?.name ?? "No organization assigned"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3" aria-labelledby="ai-case-summary">
            <h2 id="ai-case-summary" className="text-lg font-semibold">
              Advisory AI summary
            </h2>
            <OfficerAiSummaryCard grievanceId={id} />
          </section>

          {user && canAct ? (
            <OfficerCaseActions
              grievanceId={id}
              citizenId={workspace.grievance.citizen_id}
              userId={user.id}
              organizations={taxonomyQuery.data?.organizations ?? []}
              transferDueAt={workspace.grievance.transfer_due_at}
              wrongRouteResolvedAt={workspace.grievance.wrong_route_resolved_at}
              actorRole={user.role}
              actorOrganizationId={user.organizationId}
              sourceOrganizationId={workspace.grievance.organization_id}
              assignedOfficerId={workspace.grievance.assigned_officer_id}
              administrativeState={workspace.grievance.administrative_state}
              citizenConfirmationState={workspace.grievance.citizen_confirmation_state}
              hasFinalResolution={workspace.resolutions.some(
                (resolution) => !resolution.is_interim,
              )}
              {...(workspace.appeals.find((appeal) => appeal.state === "UNDER_REVIEW")
                ? {
                    appealId: workspace.appeals.find((appeal) => appeal.state === "UNDER_REVIEW")!
                      .id,
                  }
                : {})}
            />
          ) : user?.role === "gro" ? (
            <Card className="border-info/30 bg-info-surface">
              <CardContent className="space-y-1 p-5">
                <h2 className="font-semibold text-info">Assigned to another GRO</h2>
                <p className="text-sm text-info">
                  Your organization may view this case, but only the assigned GRO or an authorized
                  Nodal Officer can record case actions.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-4" aria-labelledby="case-history">
            <h2 id="case-history" className="text-lg font-semibold">
              Timeline
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

          <section className="space-y-4" aria-labelledby="case-evidence">
            <h2 id="case-evidence" className="text-lg font-semibold">
              Evidence
            </h2>
            {documents.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {documents.map((document) => (
                  <PrivateDocumentCard key={document.id} document={document} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No evidence attached"
                description="Authorized private documents will appear here."
              />
            )}
          </section>

          <section className="space-y-4" aria-labelledby="case-requests">
            <h2 id="case-requests" className="text-lg font-semibold">
              Clarification & document requests
            </h2>
            {workspace.documentRequests.map((request) => (
              <Card key={request.id} className="border-border">
                <CardContent className="space-y-1 p-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-semibold">Document request</h3>
                    <span className="text-xs text-muted-foreground">
                      {request.fulfilled_at
                        ? "Fulfilled"
                        : request.due_at
                          ? `Due ${formatDate(request.due_at)}`
                          : "Open"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                  {workspace.documentRequestItems
                    .filter((item) => item.request_id === request.id)
                    .map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground">
                        • {item.label}
                        {item.is_required ? " (required)" : ""}
                      </p>
                    ))}
                </CardContent>
              </Card>
            ))}
            {workspace.clarificationRequests.map((request) => (
              <Card key={request.id} className="border-border">
                <CardContent className="space-y-2 p-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-semibold">Clarification request</h3>
                    <span className="text-xs text-muted-foreground">
                      {request.fulfilled_at
                        ? `Answered ${formatDateTime(request.fulfilled_at)}`
                        : "Waiting for citizen"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.question}</p>
                  {request.response_text && (
                    <div className="rounded-md border border-success/25 bg-success-surface p-3">
                      <p className="text-xs font-semibold text-success">Citizen response</p>
                      <p className="mt-1 text-sm">{request.response_text}</p>
                    </div>
                  )}
                  {!request.fulfilled_at && (
                    <p className="text-xs text-muted-foreground">
                      Government inactivity escalation is paused until the citizen responds.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {workspace.messages.map((message) => (
              <Card key={message.id} className="border-border">
                <CardContent className="space-y-1 p-5">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      Message from {message.sender_type === "citizen" ? "citizen" : "office"}
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
            {!workspace.documentRequests.length &&
              !workspace.clarificationRequests.length &&
              !workspace.messages.length && (
                <EmptyState
                  title="No clarification or document requests"
                  description="Citizen and office messages will appear here."
                />
              )}
          </section>

          <section className="space-y-4" aria-labelledby="case-resolutions">
            <h2 id="case-resolutions" className="text-lg font-semibold">
              Interim updates & resolutions
            </h2>
            {workspace.resolutions.map((resolution) => (
              <Card key={resolution.id} className="border-border">
                <CardContent className="space-y-1 p-5">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {resolution.is_interim ? "Interim response" : "Resolution"}
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
                  {resolution.outcome_achieved && (
                    <div className="text-sm text-muted-foreground">
                      <span>Outcome achieved: </span>
                      <TranslatedText text={resolution.outcome_achieved} contentType="resolution" />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Claimed outcome: {resolution.outcome_claimed}
                  </p>
                </CardContent>
              </Card>
            ))}
            {!workspace.resolutions.length && (
              <EmptyState
                title="No interim update or resolution"
                description="Recorded government updates will appear here."
              />
            )}
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

          <Card className="border-border">
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-semibold">Escalation & attention</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escalation increases attention only; it never transfers legal case ownership.
                </p>
              </div>
              {workspace.priority ? (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Priority escalation
                    </dt>
                    <dd className="mt-1">
                      Level {workspace.priority.escalation_level} ·{" "}
                      {escalationAudienceLabel(workspace.priority.escalation_level)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">SLA escalation</dt>
                    <dd className="mt-1">
                      {grievance.sla
                        ? `${grievance.sla.label} · ${grievance.sla.dueLabel}`
                        : "No SLA target recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Notification state
                    </dt>
                    <dd className="mt-1">
                      {notificationState.label}
                      {notificationState.occurredAt
                        ? ` · ${formatDateTime(notificationState.occurredAt)}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">Last evaluated</dt>
                    <dd className="mt-1">{formatDateTime(workspace.priority.evaluated_at)}</dd>
                  </div>
                  {workspace.priority.next_escalation_at && (
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">
                        Next engine threshold
                      </dt>
                      <dd className="mt-1">
                        {formatDateTime(workspace.priority.next_escalation_at)}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Priority has not been evaluated for this case yet.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
