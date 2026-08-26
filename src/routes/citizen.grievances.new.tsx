import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/cpgrams";
import type { GrievanceInterpretation } from "@/lib/cpgrams/ai-contracts";
import { deterministicInterpretationAdapter } from "@/lib/cpgrams/deterministic-interpretation";
import { advanceNewGrievanceDraft, clearNewGrievanceDraft, confirmManualDestination, confirmSuggestedDestination, createNewGrievanceDraft, loadNewGrievanceDraft, saveNewGrievanceDraft, type NewGrievanceDraft } from "@/lib/cpgrams/grievance-draft";
import { submitNewGrievance } from "@/lib/cpgrams/data-access";
import { cpgramsQueryKeys, queryErrorDetail, useIntakeTaxonomyQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";

const STEPS = [
  "Describe problem",
  "Review interpreted problem",
  "Add important information",
  "Define requested outcome",
  "Review destination/category",
  "Completion review",
  "Final review",
  "Submit",
] as const;

export const Route = createFileRoute("/citizen/grievances/new")({
  head: () => ({ meta: [{ title: "New grievance — CPGRAMS Resolution Workspace" }] }),
  component: NewGrievancePage,
});

function NewGrievancePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const taxonomyQuery = useIntakeTaxonomyQuery();
  const [draft, setDraft] = useState<NewGrievanceDraft>(() => createNewGrievanceDraft());
  const [draftReady, setDraftReady] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const restoredForUser = useRef<string | null>(null);
  const step = draft.currentStep;

  useEffect(() => {
    if (!user) return;
    if (restoredForUser.current === user.id) return;
    setDraftReady(false);
    setDraft(loadNewGrievanceDraft(user.id));
    restoredForUser.current = user.id;
    setDraftReady(true);
  }, [user?.id]);
  useEffect(() => {
    if (user && draftReady) saveNewGrievanceDraft(user.id, draft);
  }, [draft, draftReady, user?.id]);

  const categories = taxonomyQuery.data?.categories ?? [];
  const organizations = taxonomyQuery.data?.organizations ?? [];
  const selectedCategory = categories.find((category) => category.id === draft.categoryId) ?? null;
  const selectedOrganization = organizations.find((organization) => organization.id === draft.organizationId) ?? null;
  const suggestedCategory = useMemo(() => {
    const interpretation = draft.interpretation;
    if (!interpretation) return null;
    const suggestedId = interpretation.suggested_subcategory_id ?? interpretation.suggested_category_id;
    return categories.find((category) => category.id === suggestedId) ?? categories.find((category) => category.name === (interpretation.suggested_subcategory ?? interpretation.suggested_category)) ?? null;
  }, [categories, draft.interpretation]);
  const suggestedOrganization = draft.interpretation?.suggested_organization_id
    ? organizations.find((organization) => organization.id === draft.interpretation?.suggested_organization_id) ?? null
    : suggestedCategory?.default_organization_id
      ? organizations.find((organization) => organization.id === suggestedCategory.default_organization_id) ?? null
    : null;

  const submit = useMutation({
    mutationFn: () => submitNewGrievance({
      citizenId: user!.id,
      submissionKey: draft.submissionKey,
      originalText: draft.problem.trim(),
      shortTitle: draft.interpretation?.issue || draft.problem.trim().split(/[.!?\n]/)[0]?.slice(0, 120) || "New grievance",
      requestedOutcome: draft.requestedOutcome.trim(),
      urgency: draft.urgency,
      categoryId: draft.categoryId,
      organizationId: draft.organizationId,
      location: draft.location.trim(),
      ...(selectedCategory ? { categorySlaDays: selectedCategory.sla_days } : {}),
    }),
    onSuccess: async (grievance) => {
      if (user) clearNewGrievanceDraft(user.id);
      await queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.citizenGrievances(user!.id) });
      void navigate({ to: "/citizen/grievances/$id/submitted", params: { id: grievance.id } });
    },
  });

  if (!user || !draftReady) return <LoadingState variant="page" label="Restoring your grievance draft" />;
  if (taxonomyQuery.isPending) return <LoadingState variant="page" label="Loading government taxonomy" />;
  if (taxonomyQuery.isError) return <ErrorState title="The grievance form could not load" detail={queryErrorDetail(taxonomyQuery.error)} onRetry={() => void taxonomyQuery.refetch()} />;

  async function interpretProblem() {
    if (draft.problem.trim().length < 20) {
      setInterpretationError("Please add a little more detail about what happened before continuing.");
      return;
    }
    setInterpretationError(null);
    try {
      const interpretation = await deterministicInterpretationAdapter.interpret({
        problem: draft.problem,
        requestedOutcome: draft.requestedOutcome,
        location: draft.location,
        taxonomy: categories,
        organizations,
      });
      setDraft((current) => ({
        ...current,
        interpretation,
        categoryId: current.manualTaxonomy ? current.categoryId : (suggestCategoryId(interpretation, categories) ?? current.categoryId),
        organizationId: current.manualTaxonomy ? current.organizationId : (suggestOrganizationId(interpretation, categories) ?? current.organizationId),
      }));
    } catch {
      setInterpretationError("Interpretation is unavailable right now. You can continue and choose the destination manually.");
    }
    setDraft((current) => advanceNewGrievanceDraft(current, 2));
  }

  function next() {
    if (step === 1) { void interpretProblem(); return; }
    if (step === 4 && !draft.requestedOutcome.trim()) {
      setInterpretationError("Please describe what would count as resolution before continuing.");
      return;
    }
    if (step < 8) setDraft((current) => advanceNewGrievanceDraft(current, current.currentStep + 1));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow={`Step ${step} of ${STEPS.length}`}
        title={STEPS[step - 1] ?? "New grievance"}
        description={step === 1 ? "Describe the problem in your own words. You do not need to know which government department handles it." : "Your draft is saved on this device while you complete the form."}
      />

      <ol className="grid gap-2 sm:grid-cols-2" aria-label="Grievance submission steps">
        {STEPS.map((label, index) => <li key={label} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${index + 1 === step ? "border-primary bg-accent font-semibold" : index + 1 < step ? "border-success/35 bg-success-surface" : "border-border bg-surface-raised text-muted-foreground"}`}><span className="flex size-5 items-center justify-center rounded-full border text-[11px]">{index + 1 < step ? <CheckCircle2 className="size-3.5 text-success" /> : index + 1}</span>{label}</li>)}
      </ol>

      <Card className="border-border"><CardContent className="space-y-6 p-5 md:p-6">
        {step === 1 && <DescribeStep draft={draft} setDraft={setDraft} />}
        {step === 2 && <InterpretationStep interpretation={draft.interpretation} error={interpretationError} />}
        {step === 3 && <ImportantInformationStep draft={draft} setDraft={setDraft} />}
        {step === 4 && <OutcomeStep draft={draft} setDraft={setDraft} />}
        {step === 5 && <DestinationStep draft={draft} setDraft={setDraft} categories={categories} organizations={organizations} suggestedCategory={suggestedCategory} suggestedOrganization={suggestedOrganization} error={destinationError} onConfirmSuggested={() => { const nextDraft = confirmSuggestedDestination(draft, { categoryId: suggestedCategory?.id ?? null, organizationId: suggestedOrganization?.id ?? null }); if (!nextDraft) { setDestinationError("The suggested destination is incomplete. Choose Change to select a destination manually."); return; } setDestinationError(null); setDraft(nextDraft); }} onConfirmManual={() => { const nextDraft = confirmManualDestination(draft); if (!nextDraft) { setDestinationError("Choose both a category and an organization before confirming the destination."); return; } setDestinationError(null); setDraft(nextDraft); }} />}
        {step === 6 && <CompletionStep draft={draft} />}
        {step === 7 && <FinalReviewStep draft={draft} category={selectedCategory?.name ?? null} organization={selectedOrganization?.name ?? null} />}
        {step === 8 && <SubmitStep draft={draft} isSubmitting={submit.isPending} error={submit.isError ? queryErrorDetail(submit.error) : null} onSubmit={() => submit.mutate()} />}

        {interpretationError && step !== 2 && <p className="text-sm text-critical" role="alert">{interpretationError}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5">
          <Button variant="outline" onClick={() => setDraft((current) => advanceNewGrievanceDraft(current, current.currentStep - 1))} disabled={step === 1 || submit.isPending}><ArrowLeft className="size-4" />Back</Button>
          {step < 8 && step !== 5 && <Button onClick={next} disabled={submit.isPending}>{step === 1 ? "Continue" : "Continue"}<ArrowRight className="size-4" /></Button>}
        </div>
      </CardContent></Card>
    </div>
  );
}

function DescribeStep({ draft, setDraft }: StepProps) {
  return <div className="space-y-2"><Label htmlFor="problem" className="text-base">What happened?</Label><Textarea id="problem" rows={10} value={draft.problem} onChange={(event) => setDraft((current) => ({ ...current, problem: event.target.value }))} placeholder="For example: My pension has not been credited after my bank account was migrated. The office said it was processed, but nothing has reached my account." /><p className="text-xs text-muted-foreground">Your original wording is stored exactly as written and remains on the case.</p></div>;
}

function InterpretationStep({ interpretation, error }: { interpretation: GrievanceInterpretation | null; error: string | null }) {
  if (!interpretation) return <div className="space-y-3"><AlertTriangle className="size-6 text-warning" /><h2 className="text-base font-semibold">Continue manually</h2><p className="text-sm text-muted-foreground">The interpretation service is unavailable. You can still add important information, define the outcome you want, and select the destination yourself.</p>{error && <p className="text-sm text-critical">{error}</p>}</div>;
  return <div className="space-y-4"><div><p className="text-xs font-semibold text-muted-foreground">We understood the issue as</p><h2 className="mt-1 text-lg font-semibold">{interpretation.issue}</h2><p className="mt-2 text-sm text-muted-foreground">{interpretation.structured_summary}</p></div><div className="flex flex-wrap gap-2"><StatusChip label={`${Math.round(interpretation.confidence * 100)}% confidence`} tone="info" />{interpretation.detected_location && <StatusChip label={interpretation.detected_location} tone="neutral" />}</div>{interpretation.missing_recommended.length > 0 && <div className="rounded-md border border-warning/35 bg-warning-surface p-3 text-sm"><p className="font-semibold">Helpful information to add</p><ul className="mt-1 list-disc pl-5 text-muted-foreground">{interpretation.missing_recommended.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div>;
}

function ImportantInformationStep({ draft, setDraft }: StepProps) {
  return <div className="space-y-5"><div className="space-y-2"><Label htmlFor="location">Where did this happen?</Label><Input id="location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="City, district, office, locality, or landmark" /></div><div className="space-y-2"><Label htmlFor="identifiers">Relevant reference numbers (optional)</Label><Input id="identifiers" value={draft.identifiers.join(", ")} onChange={(event) => setDraft((current) => ({ ...current, identifiers: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} placeholder="Application number, bank reference, or prior complaint number" /></div><div className="space-y-2"><Label htmlFor="urgency">Urgency</Label><select id="urgency" value={draft.urgency} onChange={(event) => setDraft((current) => ({ ...current, urgency: event.target.value as NewGrievanceDraft["urgency"] }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="routine">Routine</option><option value="urgent">Urgent</option></select></div></div>;
}

function OutcomeStep({ draft, setDraft }: StepProps) {
  return <div className="space-y-2"><Label htmlFor="outcome" className="text-base">What would count as resolution?</Label><Textarea id="outcome" rows={6} value={draft.requestedOutcome} onChange={(event) => setDraft((current) => ({ ...current, requestedOutcome: event.target.value }))} placeholder="For example: The pending pension should be credited to my account, and I should receive confirmation of the payment date." /><p className="text-xs text-muted-foreground">This is recorded separately from what the government later says it did.</p></div>;
}

function DestinationStep({ draft, setDraft, categories, organizations, suggestedCategory, suggestedOrganization, error, onConfirmSuggested, onConfirmManual }: { draft: NewGrievanceDraft; setDraft: Dispatch<SetStateAction<NewGrievanceDraft>>; categories: { id: string; name: string }[]; organizations: { id: string; name: string }[]; suggestedCategory: { id: string; name: string } | null; suggestedOrganization: { id: string; name: string } | null; error: string | null; onConfirmSuggested: () => void; onConfirmManual: () => void }) {
  return <div className="space-y-5"><div className="rounded-lg border border-primary/25 bg-accent p-4"><p className="text-sm font-semibold">We think this belongs to…</p><p className="mt-2 text-base font-semibold">{suggestedOrganization?.name ?? draft.interpretation?.suggested_organization ?? "A government office will need to review the destination"}</p><p className="mt-1 text-sm text-muted-foreground">{suggestedCategory?.name ?? draft.interpretation?.suggested_subcategory ?? draft.interpretation?.suggested_category ?? "No category suggestion is available"}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={onConfirmSuggested}>Confirm</Button><Button size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, manualTaxonomy: true, destinationConfirmed: false }))}>Change</Button></div></div>{draft.manualTaxonomy && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="category">Category</Label><select id="category" value={draft.categoryId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value || null, destinationConfirmed: false }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="organization">Organization</Label><select id="organization" value={draft.organizationId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, organizationId: event.target.value || null, destinationConfirmed: false }))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose an organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div><div className="sm:col-span-2"><Button size="sm" onClick={onConfirmManual}>Confirm destination</Button></div></div>}{error && <p className="text-sm text-critical" role="alert">{error}</p>}</div>;
}

function CompletionStep({ draft }: { draft: NewGrievanceDraft }) {
  const missing = draft.interpretation?.missing_recommended ?? [];
  return <div className="space-y-4"><h2 className="text-base font-semibold">Completion review</h2><p className="text-sm text-muted-foreground">You can still continue if optional details are unavailable. The office may request more information later.</p>{missing.length ? <div className="rounded-md border border-warning/35 bg-warning-surface p-4"><p className="font-semibold">Still recommended</p><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : <div className="rounded-md border border-success/35 bg-success-surface p-4 text-sm"><CheckCircle2 className="mr-2 inline size-4 text-success" />You have added the recommended information.</div>}</div>;
}

function FinalReviewStep({ draft, category, organization }: { draft: NewGrievanceDraft; category: string | null; organization: string | null }) {
  return <div className="space-y-4"><h2 className="text-base font-semibold">Final review</h2><ReviewItem label="What happened" value={draft.problem} /><ReviewItem label="Requested outcome" value={draft.requestedOutcome} /><ReviewItem label="Location" value={draft.location || "Not provided"} /><ReviewItem label="Destination" value={organization ?? "To be routed"} /><ReviewItem label="Category" value={category ?? "To be categorized"} /></div>;
}

function SubmitStep({ draft, isSubmitting, error, onSubmit }: { draft: NewGrievanceDraft; isSubmitting: boolean; error: string | null; onSubmit: () => void }) {
  return <div className="space-y-4"><h2 className="text-base font-semibold">Ready to submit?</h2><p className="text-sm text-muted-foreground">Submitting creates your registration number and a permanent case event. Repeated clicks use the same submission key and cannot create another case.</p>{error && <p className="text-sm text-critical" role="alert">{error}</p>}<Button onClick={onSubmit} disabled={isSubmitting || draft.problem.trim().length < 20 || !draft.requestedOutcome.trim()}>{isSubmitting ? "Submitting" : "Submit grievance"}</Button></div>;
}

function ReviewItem({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border p-3"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-sm whitespace-pre-wrap">{value}</p></div>; }
function suggestCategoryId(interpretation: GrievanceInterpretation, categories: { id: string; name: string }[]) { return categories.find((category) => category.name === (interpretation.suggested_subcategory ?? interpretation.suggested_category))?.id ?? null; }
function suggestOrganizationId(interpretation: GrievanceInterpretation, categories: { id: string; name: string; default_organization_id: string | null }[]) { const categoryId = suggestCategoryId(interpretation, categories); return categories.find((category) => category.id === categoryId)?.default_organization_id ?? null; }
type StepProps = { draft: NewGrievanceDraft; setDraft: Dispatch<SetStateAction<NewGrievanceDraft>> };
