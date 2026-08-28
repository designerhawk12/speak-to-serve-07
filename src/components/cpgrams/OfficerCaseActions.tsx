import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addOfficerInterimUpdate,
  flagOfficerWrongRoute,
  requestOfficerClarification,
  requestOfficerDocuments,
  replyToAppeal,
  submitOfficerResolution,
  transferOfficerGrievance,
  uploadOfficerEvidence,
  type OfficerChecklistItem,
} from "@/lib/cpgrams/data-access";
import { cpgramsQueryKeys, queryErrorDetail } from "@/lib/cpgrams/queries";
import { authorizedTransferOrganizationIds } from "@/lib/cpgrams/officer-assignment";
import type { AppRole } from "@/lib/cpgrams/session";

type ActionKind =
  | "clarification"
  | "documents"
  | "interim"
  | "wrong_route"
  | "transfer"
  | "evidence"
  | "resolution"
  | "appeal_reply";
const actions: Array<{ id: ActionKind; label: string }> = [
  { id: "clarification", label: "Request clarification" },
  { id: "documents", label: "Request documents" },
  { id: "interim", label: "Add interim update" },
  { id: "wrong_route", label: "Incorrectly routed" },
  { id: "transfer", label: "Transfer" },
  { id: "evidence", label: "Attach evidence" },
  { id: "resolution", label: "Resolution composer" },
];

export function OfficerCaseActions({
  grievanceId,
  citizenId,
  userId,
  organizations,
  appealId,
  transferDueAt,
  wrongRouteResolvedAt,
  actorRole,
  actorOrganizationId,
  sourceOrganizationId,
}: {
  grievanceId: string;
  citizenId: string;
  userId: string;
  organizations: Array<{
    id: string;
    name: string;
    parent_id: string | null;
    is_active: boolean;
    is_appellate_office: boolean;
  }>;
  appealId?: string;
  transferDueAt?: string | null | undefined;
  wrongRouteResolvedAt?: string | null | undefined;
  actorRole: AppRole;
  actorOrganizationId: string | null;
  sourceOrganizationId: string | null;
}) {
  const [active, setActive] = useState<ActionKind | null>(null);
  const [appealReplySuccess, setAppealReplySuccess] = useState("");
  const queryClient = useQueryClient();
  const transferOrganizationIds =
    actorRole === "gro" || actorRole === "nodal"
      ? authorizedTransferOrganizationIds(
          organizations,
          actorRole,
          actorOrganizationId,
          sourceOrganizationId,
        )
      : new Set<string>();
  const transferOrganizations = organizations.filter((organization) =>
    transferOrganizationIds.has(organization.id),
  );
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(grievanceId) }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedGrievances }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedGrievancePages }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.citizenGrievances(citizenId) }),
      queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.notifications(citizenId) }),
    ]);
    setActive(null);
  };
  const visibleActions = appealId
    ? [...actions, { id: "appeal_reply" as const, label: "Reply to Appellate Authority" }]
    : actions;
  return (
    <section className="space-y-3" aria-labelledby="officer-actions">
      <h2 id="officer-actions" className="text-lg font-semibold">
        Officer actions
      </h2>
      <Card className="border-border">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Each completed action writes a new immutable case event. Government activity remains
              separate from citizen confirmation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                type="button"
                variant={active === action.id ? "default" : "outline"}
                onClick={() => {
                  setAppealReplySuccess("");
                  setActive(action.id);
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
          {active === "clarification" && <Clarification grievanceId={grievanceId} done={refresh} />}
          {active === "documents" && <Documents grievanceId={grievanceId} done={refresh} />}
          {active === "interim" && <Interim grievanceId={grievanceId} done={refresh} />}
          {active === "wrong_route" && (
            <FlagWrongRoute
              grievanceId={grievanceId}
              transferDueAt={transferDueAt}
              wrongRouteResolvedAt={wrongRouteResolvedAt}
              done={refresh}
            />
          )}
          {active === "transfer" && (
            <Transfer
              grievanceId={grievanceId}
              organizations={transferOrganizations}
              done={refresh}
            />
          )}
          {active === "evidence" && (
            <Evidence grievanceId={grievanceId} userId={userId} done={refresh} />
          )}
          {active === "resolution" && <Resolution grievanceId={grievanceId} done={refresh} />}
          {active === "appeal_reply" && appealId && (
            <AppealReply
              appealId={appealId}
              done={async () => {
                await refresh();
                setAppealReplySuccess("Reply sent to the Appellate Authority.");
              }}
            />
          )}
          {appealReplySuccess && (
            <p className="text-sm text-success" role="status">
              {appealReplySuccess}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border border-primary/25 bg-surface-sunken p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
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
function Failure({ m }: { m: { isError: boolean; error: unknown } }) {
  return m.isError ? (
    <p className="text-sm text-critical" role="alert">
      {queryErrorDetail(m.error)}
    </p>
  ) : null;
}

function Clarification({ grievanceId, done }: { grievanceId: string; done: () => Promise<void> }) {
  const [text, setText] = useState("");
  const m = useMutation({
    mutationFn: () => requestOfficerClarification(grievanceId, text),
    onSuccess: done,
  });
  return (
    <Shell title="Request clarification">
      <Field label="Instructions for the citizen">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="State exactly what needs clarification and why."
        />
      </Field>
      <Button disabled={!text.trim() || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Sending" : "Send clarification request"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}

function Documents({ grievanceId, done }: { grievanceId: string; done: () => Promise<void> }) {
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [items, setItems] = useState<OfficerChecklistItem[]>([
    { label: "", description: "", isRequired: true },
  ]);
  const m = useMutation({
    mutationFn: () =>
      requestOfficerDocuments({
        grievanceId,
        instructions,
        dueAt: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : null,
        items,
      }),
    onSuccess: done,
  });
  const update = (i: number, patch: Partial<OfficerChecklistItem>) =>
    setItems((xs) => xs.map((x, index) => (index === i ? { ...x, ...patch } : x)));
  return (
    <Shell title="Document request builder">
      <p className="text-sm text-muted-foreground">
        Write clear instructions, then make the checklist the citizen will see as Action Required.
        Required items must be supplied before the request can be completed.
      </p>
      <Field label="Instructions (required)">
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          placeholder="Explain why these documents are needed."
        />
      </Field>
      <Field label="Due date (optional)">
        <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </Field>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Checklist items</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setItems((xs) => [...xs, { label: "", description: "", isRequired: true }])
            }
          >
            <Plus className="size-4" />
            Add item
          </Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Checklist item {i + 1}</p>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Document name"
                aria-label={`Checklist item ${i + 1} label`}
              />
              <Input
                value={item.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Description (optional)"
                aria-label={`Checklist item ${i + 1} description`}
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={item.isRequired}
                  onCheckedChange={(v) => update(i, { isRequired: v === true })}
                />
                Required
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={items.length === 1}
                onClick={() => setItems((xs) => xs.filter((_, index) => index !== i))}
                aria-label={`Remove checklist item ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-dashed border-info/40 bg-info-surface p-3 text-sm text-info">
        <span className="font-semibold">AI-assisted checklist conversion</span>
        <p className="mt-1 text-xs">
          Reserved for a future advisory feature. It is not connected and cannot create or send a
          request.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!instructions.trim() || items.some((x) => !x.label.trim()) || m.isPending}
          onClick={() => m.mutate()}
        >
          {m.isPending ? "Creating" : "Confirm & send citizen action"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled
          title="Reserved for a future advisory-only integration"
        >
          AI: Convert to checklist (coming later)
        </Button>
      </div>
      <Failure m={m} />
    </Shell>
  );
}

function Interim({ grievanceId, done }: { grievanceId: string; done: () => Promise<void> }) {
  const [action, setAction] = useState("");
  const [blocker, setBlocker] = useState("");
  const [next, setNext] = useState("");
  const [date, setDate] = useState("");
  const m = useMutation({
    mutationFn: () =>
      addOfficerInterimUpdate({
        grievanceId,
        actionCompleted: action,
        currentBlocker: blocker,
        expectedNextStep: next,
        expectedDate: date || null,
      }),
    onSuccess: done,
  });
  return (
    <Shell title="Add interim update">
      <Field label="Action completed">
        <Textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2} />
      </Field>
      <Field label="Current blocker">
        <Textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} />
      </Field>
      <Field label="Expected next step">
        <Textarea value={next} onChange={(e) => setNext(e.target.value)} rows={2} />
      </Field>
      <Field label="Expected date (optional)">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button disabled={!action.trim() || !next.trim() || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Saving" : "Publish interim update"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}

function FlagWrongRoute({
  grievanceId,
  transferDueAt,
  wrongRouteResolvedAt,
  done,
}: {
  grievanceId: string;
  transferDueAt?: string | null | undefined;
  wrongRouteResolvedAt?: string | null | undefined;
  done: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const pending = Boolean(transferDueAt && !wrongRouteResolvedAt);
  const mutation = useMutation({
    mutationFn: () => flagOfficerWrongRoute({ grievanceId, reason }),
    onSuccess: done,
  });

  return (
    <Shell title="Incorrectly routed / needs transfer">
      {pending ? (
        <p className="text-sm text-warning">
          This case is already marked for transfer. Complete the organization transfer before the
          recorded deadline.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            This records an immutable routing event and starts the 48-hour transfer deadline. It
            does not change the current organization or officer by itself.
          </p>
          <Field label="Why is the current routing incorrect?">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Explain why another government organization should receive this case."
            />
          </Field>
          <Button disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Recording" : "Start 48-hour transfer requirement"}
          </Button>
          <Failure m={mutation} />
        </>
      )}
    </Shell>
  );
}

function Transfer({
  grievanceId,
  organizations,
  done,
}: {
  grievanceId: string;
  organizations: Array<{ id: string; name: string }>;
  done: () => Promise<void>;
}) {
  const [org, setOrg] = useState("");
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => transferOfficerGrievance({ grievanceId, organizationId: org, reason }),
    onSuccess: done,
  });
  return (
    <Shell title="Transfer case">
      <Field label="Destination organization">
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
        >
          <option value="">Choose an organization</option>
          {organizations.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reason for transfer">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Explain the routing decision to the citizen and receiving office."
        />
      </Field>
      <Button disabled={!org || !reason.trim() || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Transferring" : "Transfer case"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}

function Evidence({
  grievanceId,
  userId,
  done,
}: {
  grievanceId: string;
  userId: string;
  done: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [visible, setVisible] = useState(true);
  const m = useMutation({
    mutationFn: () =>
      uploadOfficerEvidence({ grievanceId, userId, file: file!, citizenVisible: visible }),
    onSuccess: done,
  });
  return (
    <Shell title="Attach evidence">
      <Field label="Evidence file">
        <Input
          type="file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={visible} onCheckedChange={(v) => setVisible(v === true)} />
        Visible to the citizen
      </label>
      <Button disabled={!file || m.isPending} onClick={() => m.mutate()}>
        <FilePlus2 className="size-4" />
        {m.isPending ? "Uploading" : "Attach evidence"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}

function Resolution({ grievanceId, done }: { grievanceId: string; done: () => Promise<void> }) {
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [next, setNext] = useState("");
  const [narrative, setNarrative] = useState("");
  const [partial, setPartial] = useState("");
  const [evidence, setEvidence] = useState("");
  const m = useMutation({
    mutationFn: () =>
      submitOfficerResolution({
        grievanceId,
        actionTaken: action,
        outcomeAchieved: outcome,
        citizenNextStep: next,
        narrative,
        partialReason: partial,
        evidenceReference: evidence,
      }),
    onSuccess: done,
  });
  return (
    <Shell title="Resolution composer">
      <p className="text-sm text-muted-foreground">
        Fields marked required are needed before the citizen can review the government resolution.
      </p>
      <Field label="Action taken (required)">
        <Textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          rows={2}
          placeholder="Record the completed government action."
        />
      </Field>
      <Field label="Outcome achieved (required)">
        <Textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={2}
          placeholder="State the outcome claimed by the office."
        />
      </Field>
      <Field label="Evidence or reference (optional)">
        <Input
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Reference number or attached evidence description"
        />
      </Field>
      <Field label="Citizen next step (required)">
        <Textarea
          value={next}
          onChange={(e) => setNext(e.target.value)}
          rows={2}
          placeholder="Explain what the citizen needs to do next."
        />
      </Field>
      <Field label="Reason if partially resolved or unresolved">
        <Textarea
          value={partial}
          onChange={(e) => setPartial(e.target.value)}
          rows={2}
          placeholder="Required when the claimed outcome is not complete."
        />
      </Field>
      <Field label="Resolution narrative (required)">
        <Textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          placeholder="Provide a complete, plain-language record of the resolution."
        />
      </Field>
      <div className="rounded-md border border-dashed border-info/40 bg-info-surface p-3 text-sm text-info">
        <span className="font-semibold">AI Resolution Quality</span>
        <p className="mt-1 text-xs">
          Placeholder only. No AI assessment, recommendation, or administrative decision is
          connected.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Submitting asks the citizen to review the government resolution. It does not mark the
        outcome resolved.
      </p>
      <Button
        disabled={
          !action.trim() || !outcome.trim() || !next.trim() || !narrative.trim() || m.isPending
        }
        onClick={() => m.mutate()}
      >
        {m.isPending ? "Submitting" : "Submit resolution"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}

function AppealReply({ appealId, done }: { appealId: string; done: () => Promise<void> }) {
  const [reply, setReply] = useState("");
  const m = useMutation({ mutationFn: () => replyToAppeal({ appealId, reply }), onSuccess: done });
  return (
    <Shell title="Reply to the Appellate Authority">
      <Field label="Office reply">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="Provide the requested record, explanation, or evidence."
        />
      </Field>
      <Button disabled={!reply.trim() || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Sending" : "Send office reply"}
      </Button>
      <Failure m={m} />
    </Shell>
  );
}
