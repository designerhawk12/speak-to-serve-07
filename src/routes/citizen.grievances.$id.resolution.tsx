import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrivateDocumentCard,
} from "@/components/cpgrams";
import {
  confirmCitizenResolution,
  uploadCitizenDocument,
  type CitizenResolutionConfirmation,
} from "@/lib/cpgrams/data-access";
import { queryErrorDetail, useGrievanceWorkspaceQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import {
  clearResolutionConfirmationDraft,
  loadResolutionConfirmationDraft,
  saveResolutionConfirmationDraft,
} from "@/lib/cpgrams/resolution-confirmation-draft";
import { isResolutionReviewEvidence } from "@/lib/cpgrams/citizen-resolution";
import {
  acquireResolutionSubmissionLock,
  refreshAfterResolutionConfirmation,
  submitResolutionConfirmation,
  validateResolutionConfirmation,
} from "@/lib/cpgrams/resolution-confirmation-flow";
import {
  resolutionConfirmDebug,
  resolutionConfirmError,
  resolutionRouteDebug,
  safeResolutionErrorContext,
} from "@/lib/cpgrams/resolution-debug";

export const Route = createFileRoute("/citizen/grievances/$id/resolution")({
  component: ResolutionPage,
});

function ResolutionPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caseQuery = useGrievanceWorkspaceQuery(id);
  const [choice, setChoice] = useState<CitizenResolutionConfirmation | null>(null);
  const [fixed, setFixed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [correction, setCorrection] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submissionLocked = useRef(false);
  const resolution = caseQuery.data?.resolutions.find((entry) => !entry.is_interim) ?? null;

  useEffect(() => {
    resolutionRouteDebug("02", "URL changed", {
      grievanceId: id,
      pathname: window.location.pathname,
    });
    resolutionRouteDebug("03", "resolution route mounted", { grievanceId: id });
    resolutionRouteDebug("04", "grievance query started", { grievanceId: id });
  }, [id]);

  useEffect(() => {
    if (caseQuery.isError)
      resolutionRouteDebug("05", "grievance query failed", {
        grievanceId: id,
        ...safeResolutionErrorContext(caseQuery.error),
      });
    if (!caseQuery.data) return;
    resolutionRouteDebug("05", "grievance query resolved", {
      grievanceId: id,
      administrativeState: caseQuery.data.grievance.administrative_state,
      outcomeState: caseQuery.data.grievance.outcome_state,
      citizenConfirmationState: caseQuery.data.grievance.citizen_confirmation_state,
      resolutionId: resolution?.id,
      ownsGrievance: caseQuery.data.grievance.citizen_id === user?.id,
      profileRole: user?.role,
    });
    if (resolution)
      resolutionRouteDebug("06", "resolution UI rendered", {
        grievanceId: id,
        resolutionId: resolution.id,
      });
  }, [caseQuery.data, caseQuery.error, caseQuery.isError, id, resolution, user]);

  useEffect(() => {
    if (!user) return;
    const draft = loadResolutionConfirmationDraft(user.id, id);
    setChoice(draft.choice);
    setFixed(draft.whatWasFixed);
    setRemaining(draft.whatRemainsUnresolved);
    setCorrection(draft.requestedCorrection);
    setDraftReady(true);
  }, [id, user]);

  const saveDraft = (
    next: Partial<{
      choice: CitizenResolutionConfirmation | null;
      fixed: string;
      remaining: string;
      correction: string;
    }>,
  ) => {
    if (!user) return;
    saveResolutionConfirmationDraft(user.id, id, {
      choice: next.choice ?? choice,
      whatWasFixed: next.fixed ?? fixed,
      whatRemainsUnresolved: next.remaining ?? remaining,
      requestedCorrection: next.correction ?? correction,
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      resolutionConfirmDebug(
        "06",
        file ? "evidence upload starting" : "optional evidence skipped",
        { grievanceId: id, confirmation: choice, hasEvidence: Boolean(file) },
      );
      if (!file)
        resolutionConfirmDebug("07", "no evidence upload required", {
          grievanceId: id,
          confirmation: choice,
        });
      return submitResolutionConfirmation(
        {
          grievanceId: id,
          userId: user!.id,
          confirmation: choice!,
          whatWasFixed: fixed,
          whatRemainsUnresolved: remaining,
          requestedCorrection: correction,
          file,
        },
        {
          uploadEvidence: async ({ grievanceId, userId, file: evidenceFile }) => {
            const uploaded = await uploadCitizenDocument({
              grievanceId,
              userId,
              file: evidenceFile,
            });
            resolutionConfirmDebug("07", "evidence upload completed", {
              grievanceId,
              confirmation: choice,
              evidenceDocumentId: uploaded.id,
            });
            return uploaded;
          },
          confirm: confirmCitizenResolution,
        },
      );
    },
    onSuccess: async () => {
      resolutionConfirmDebug("10", "mutation considered successful", {
        grievanceId: id,
        confirmation: choice,
      });
      resolutionConfirmDebug("11", "query invalidation started", {
        grievanceId: id,
        confirmation: choice,
      });
      await refreshAfterResolutionConfirmation(queryClient, id, user!.id);
      resolutionConfirmDebug("12", "query refetch complete", {
        grievanceId: id,
        confirmation: choice,
      });
      clearResolutionConfirmationDraft(user!.id, id);
      setRecorded(true);
      setSubmitError(null);
      resolutionConfirmDebug("13", "success state set", { grievanceId: id, confirmation: choice });
    },
    onError: (error) => {
      submissionLocked.current = false;
      resolutionConfirmError("10", "mutation failed", {
        grievanceId: id,
        confirmation: choice,
        ...safeResolutionErrorContext(error),
      });
      setSubmitError(
        "We could not save your confirmation. Your response has not been recorded. Please try again.",
      );
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const grievance = caseQuery.data?.grievance;
    const activeResolution = resolution;
    resolutionConfirmDebug("02", "form submit entered", { grievanceId: id, confirmation: choice });
    resolutionConfirmDebug("03", "selected outcome captured", {
      grievanceId: id,
      confirmation: choice,
    });
    resolutionConfirmDebug("04", "validation started", { grievanceId: id, confirmation: choice });
    setSubmitError(null);
    if (!user) {
      resolutionConfirmError("04", "validation failed: authenticated profile unavailable", {
        grievanceId: id,
        confirmation: choice,
      });
      setSubmitError("Your authenticated profile is unavailable. Sign in and try again.");
      return;
    }
    if (!draftReady) {
      resolutionConfirmError("04", "validation failed: draft is still loading", {
        grievanceId: id,
        confirmation: choice,
      });
      setSubmitError("Your response is still loading. Please try again.");
      return;
    }
    if (!grievance || !activeResolution) {
      resolutionConfirmError("04", "validation failed: resolution context unavailable", {
        grievanceId: id,
        confirmation: choice,
      });
      setSubmitError("The current resolution could not be loaded. Refresh the case and try again.");
      return;
    }
    if (!mayConfirm) {
      resolutionConfirmError("04", "validation failed: grievance is not awaiting confirmation", {
        grievanceId: id,
        confirmation: choice,
        citizenConfirmationState: grievance.citizen_confirmation_state,
      });
      setSubmitError(
        "This resolution is no longer awaiting confirmation. Refresh the case to see its current state.",
      );
      return;
    }
    if (!choice) {
      resolutionConfirmError("04", "validation failed: no outcome selected", { grievanceId: id });
      setSubmitError("Choose YES, PARTLY, or NO.");
      return;
    }
    const validationError = validateResolutionConfirmation({
      confirmation: choice,
      whatWasFixed: fixed,
      whatRemainsUnresolved: remaining,
      requestedCorrection: correction,
    });
    if (validationError) {
      resolutionConfirmError("04", "validation failed", {
        grievanceId: id,
        confirmation: choice,
        validationError,
      });
      setSubmitError(validationError);
      return;
    }
    if (!acquireResolutionSubmissionLock(submissionLocked)) return;
    resolutionConfirmDebug("05", "validation passed", {
      grievanceId: id,
      confirmation: choice,
      authUserId: user.id,
      profileRole: user.role,
      ownsGrievance: grievance.citizen_id === user.id,
      administrativeState: grievance.administrative_state,
      outcomeState: grievance.outcome_state,
      citizenConfirmationState: grievance.citizen_confirmation_state,
      resolutionId: activeResolution.id,
    });
    mutation.mutate();
  };
  const updateChoice = (next: CitizenResolutionConfirmation) => {
    setChoice(next);
    saveDraft({ choice: next });
  };
  const updateFixed = (next: string) => {
    setFixed(next);
    saveDraft({ fixed: next });
  };
  const updateRemaining = (next: string) => {
    setRemaining(next);
    saveDraft({ remaining: next });
  };
  const updateCorrection = (next: string) => {
    setCorrection(next);
    saveDraft({ correction: next });
  };

  if (caseQuery.isPending)
    return <LoadingState variant="page" label="Loading government resolution" />;
  if (caseQuery.isError)
    return (
      <ErrorState
        detail={queryErrorDetail(caseQuery.error)}
        onRetry={() => void caseQuery.refetch()}
      />
    );
  if (!caseQuery.data || !resolution)
    return (
      <EmptyState
        title="No resolution ready for review"
        description="A government resolution will appear here when it is ready for your confirmation."
      />
    );

  const mayConfirm =
    caseQuery.data.grievance.citizen_confirmation_state === "AWAITING_CONFIRMATION";
  const validationError = choice
    ? validateResolutionConfirmation({
        confirmation: choice,
        whatWasFixed: fixed,
        whatRemainsUnresolved: remaining,
        requestedCorrection: correction,
      })
    : "Choose an outcome.";
  const valid = !validationError;
  const evidence = caseQuery.data.documents.filter((document) =>
    isResolutionReviewEvidence(document, user?.id),
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={caseQuery.data.grievance.registration_number}
        title="Government says your grievance is resolved"
        description="Review what the government recorded, then tell us whether it actually solved your problem."
      />
      <EvidenceCard
        title="Your original grievance"
        value={caseQuery.data.grievance.original_text}
      />
      <EvidenceCard
        title="What you asked government to do"
        value={caseQuery.data.grievance.requested_outcome ?? "No requested outcome was recorded."}
      />
      <EvidenceCard
        title="Government action"
        value={resolution.action_taken}
        detail={resolution.resolution_narrative}
      />
      <EvidenceCard
        title="Outcome achieved"
        value={
          resolution.outcome_achieved ??
          "The office did not separately record an outcome-achieved statement for this earlier resolution."
        }
      />
      <Card className="border-border">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution evidence
          </h2>
          {evidence.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {evidence.map((document) => (
                <PrivateDocumentCard key={document.id} document={document} compact />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No government resolution evidence has been attached.
            </p>
          )}
          {resolution.evidence_reference && (
            <p className="text-sm text-muted-foreground">
              Reference: {resolution.evidence_reference}
            </p>
          )}
        </CardContent>
      </Card>
      <EvidenceCard
        title="What you need to do next"
        value={
          resolution.citizen_next_step ??
          "Tell us whether the government action actually solved your problem."
        }
      />
      {recorded || !mayConfirm ? (
        <Card className="border-success/35 bg-success-surface" role="status">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold">
              {caseQuery.data.grievance.citizen_confirmation_state === "CONFIRMED_RESOLVED"
                ? "You confirmed this issue is resolved"
                : caseQuery.data.grievance.citizen_confirmation_state === "PARTIALLY_RESOLVED"
                  ? "You reported this issue is partly resolved"
                  : caseQuery.data.grievance.citizen_confirmation_state === "NOT_RESOLVED"
                    ? "You reported this issue is not resolved"
                    : "Outcome response recorded"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Your response is saved in the case record and remains available after refresh.
            </p>
            {(choice ?? caseQuery.data.grievance.citizen_confirmation_state) !==
            "CONFIRMED_RESOLVED" ? (
              <Button asChild>
                <Link
                  to="/citizen/grievances/$id/appeal"
                  params={{ id }}
                  onClick={() =>
                    resolutionConfirmDebug("14", "appeal navigation requested", {
                      grievanceId: id,
                      confirmation: choice,
                    })
                  }
                >
                  Appeal this resolution
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  resolutionConfirmDebug("14", "case navigation requested", {
                    grievanceId: id,
                    confirmation: choice,
                  });
                  void navigate({ to: "/citizen/grievances/$id", params: { id } });
                }}
              >
                Return to case
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="p-5">
            <form id="citizen-resolution-confirmation" className="space-y-5" onSubmit={submit}>
              <h2 className="text-base font-semibold">Did this actually solve your problem?</h2>
              {(
                [
                  ["CONFIRMED_RESOLVED", "YES — it solved my problem"],
                  ["PARTIALLY_RESOLVED", "PARTLY — something remains unresolved"],
                  ["NOT_RESOLVED", "NO — the problem remains unresolved"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="resolution-confirmation"
                    checked={choice === value}
                    onChange={() => updateChoice(value)}
                  />
                  {label}
                </label>
              ))}
              {choice === "PARTIALLY_RESOLVED" && (
                <>
                  <Field label="What was fixed">
                    <Textarea
                      value={fixed}
                      onChange={(e) => updateFixed(e.target.value)}
                      rows={3}
                    />
                  </Field>
                  <Field label="What remains unresolved">
                    <Textarea
                      value={remaining}
                      onChange={(e) => updateRemaining(e.target.value)}
                      rows={3}
                    />
                  </Field>
                </>
              )}
              {choice === "NOT_RESOLVED" && (
                <>
                  <Field label="What remains unresolved">
                    <Textarea
                      value={remaining}
                      onChange={(e) => updateRemaining(e.target.value)}
                      rows={3}
                    />
                  </Field>
                  <Field label="What correction are you requesting?">
                    <Textarea
                      value={correction}
                      onChange={(e) => updateCorrection(e.target.value)}
                      rows={3}
                    />
                  </Field>
                </>
              )}
              {choice && choice !== "CONFIRMED_RESOLVED" && (
                <Field label="Optional evidence">
                  <Input
                    type="file"
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFile(e.target.files?.[0] ?? null)
                    }
                  />
                </Field>
              )}
              {!mayConfirm && (
                <p className="text-sm text-warning">
                  This resolution is no longer awaiting a citizen confirmation.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!user || !draftReady || !mayConfirm || !valid || mutation.isPending}
                  onClick={() =>
                    resolutionConfirmDebug("01", "button interaction", {
                      grievanceId: id,
                      confirmation: choice,
                      disabled: !user || !draftReady || !mayConfirm || !valid || mutation.isPending,
                    })
                  }
                >
                  {mutation.isPending ? "Saving outcome…" : "Confirm outcome"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setChoice(null);
                    setFixed("");
                    setRemaining("");
                    setCorrection("");
                    setFile(null);
                    if (user) clearResolutionConfirmationDraft(user.id, id);
                  }}
                >
                  Discard draft
                </Button>
                <Button asChild variant="outline">
                  <Link
                    to="/citizen/grievances/$id"
                    params={{ id }}
                    onClick={() =>
                      resolutionConfirmDebug("14", "back navigation requested", {
                        grievanceId: id,
                        confirmation: choice,
                      })
                    }
                  >
                    Back to case
                  </Link>
                </Button>
              </div>
              {choice && validationError && (
                <p className="text-sm text-muted-foreground">{validationError}</p>
              )}
              {submitError && (
                <p className="text-sm text-critical" role="alert">
                  {submitError}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EvidenceCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-2 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <p className="whitespace-pre-wrap text-sm">{value}</p>
        {detail && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
