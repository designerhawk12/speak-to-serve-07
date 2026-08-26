import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/cpgrams";
import { getCitizenActionItems, getCitizenActionState } from "@/lib/cpgrams/citizen-case";
import {
  formatDate,
  formatDateTime,
  toGrievanceSummary,
  toTimelineEvent,
} from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useGrievanceWorkspaceQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import type { DocumentRow } from "@/lib/cpgrams/data-access";
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
  );
  const action = getCitizenActionState(
    workspace.grievance,
    workspace.documentRequests,
    workspace.documentRequestItems,
    workspace.appeals,
  );
  const actionItems = getCitizenActionItems(
    workspace.grievance,
    workspace.documentRequests,
    workspace.documentRequestItems,
    workspace.appeals,
  );
  const hasAction = (state: string) => actionItems.some((entry) => entry.state === state);
  const timeline = workspace.events.filter((event) => event.citizen_visible).map(toTimelineEvent);
  const requestDocumentIds = new Set(
    workspace.documentRequestItems.map((item) => item.document_id).filter(Boolean),
  );
  const appealDocuments = workspace.documents.filter((document) =>
    /appeal/i.test(document.doc_kind ?? ""),
  );
  const requestedDocuments = workspace.documents.filter((document) =>
    requestDocumentIds.has(document.id),
  );
  const citizenDocuments = workspace.documents.filter(
    (document) =>
      document.uploaded_by === user?.id &&
      !requestedDocuments.includes(document) &&
      !appealDocuments.includes(document),
  );
  const resolutionDocuments = workspace.documents.filter((document) =>
    isResolutionEvidence(document, user?.id),
  );
  const governmentDocuments = workspace.documents.filter(
    (document) =>
      document.uploaded_by !== user?.id &&
      !resolutionDocuments.includes(document) &&
      !appealDocuments.includes(document),
  );
  const openRequests = workspace.documentRequests.filter((request) => !request.fulfilled_at);
  const clarificationRequests =
    workspace.grievance.administrative_state === "CLARIFICATION_REQUIRED"
      ? workspace.messages
          .filter((message) => message.sender_type === "officer" && message.citizen_visible)
          .slice(-1)
      : [];
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
          {clarificationRequests.map((message) => (
            <ActionRequiredCard
              key={message.id}
              title="Clarification requested"
              description={message.body}
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
                  <p className="text-sm text-muted-foreground">{message.body}</p>
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
                  <p className="text-sm">{resolution.action_taken}</p>
                  <p className="text-sm text-muted-foreground">
                    Claimed outcome: {resolution.outcome_claimed}
                  </p>
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
