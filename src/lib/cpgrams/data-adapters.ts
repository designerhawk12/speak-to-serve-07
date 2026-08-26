import type { Database } from "@/integrations/supabase/types";
import type {
  AppealRow,
  AppealEventRow,
  CaseEventRow,
  DocumentRequestRow,
  DocumentRow,
  GrievanceRow,
} from "./data-access";
import type {
  AdminStatus,
  AppealStatus,
  CitizenOutcomeStatus,
  DocumentRecord,
  GrievanceSummary,
  SlaState,
  TimelineEventRecord,
} from "./types";

type AdministrativeState = Database["public"]["Enums"]["administrative_state"];
type ConfirmationState = Database["public"]["Enums"]["citizen_confirmation_state"];

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Date not recorded";
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function toAdminStatus(state: AdministrativeState): AdminStatus {
  if (state === "DRAFT" || state === "SUBMITTED") return "received";
  if (state === "ROUTING" || state === "ROUTED" || state === "UNDER_EXAMINATION") return "under_review";
  if (state === "ASSIGNED") return "assigned";
  if (state === "CLARIFICATION_REQUIRED") return "awaiting_citizen_input";
  if (["CITIZEN_RESPONSE_RECEIVED", "ACTION_IN_PROGRESS", "INTERIM_RESPONSE", "RESOLUTION_PROVIDED"].includes(state)) return "action_taken";
  if (state === "CLOSED") return "closed_administratively";
  return "disposed";
}

export function toCitizenOutcome(state: ConfirmationState): CitizenOutcomeStatus {
  if (state === "CONFIRMED_RESOLVED") return "confirmed_resolved";
  if (state === "PARTIALLY_RESOLVED") return "partially_resolved";
  if (state === "NOT_RESOLVED") return "problem_persists";
  return "not_reported";
}

export function toAppealStatus(appeals: AppealRow[], grievance: GrievanceRow): AppealStatus {
  const appeal = appeals[0];
  if (appeal) {
    if (appeal.state === "FILED") return "filed";
    if (appeal.state === "UNDER_REVIEW") return "under_appeal_review";
    if (appeal.state === "REJECTED") return "appeal_rejected";
    return "appeal_decided";
  }
  return ["RESOLUTION_PROVIDED", "DISPOSED", "CLOSED"].includes(grievance.administrative_state)
    ? "eligible"
    : "not_filed";
}

function toSla(grievance: GrievanceRow): GrievanceSummary["sla"] {
  if (!grievance.sla_due_at || !grievance.submitted_at) return undefined;
  const start = new Date(grievance.submitted_at).getTime();
  const due = new Date(grievance.sla_due_at).getTime();
  const now = Date.now();
  let state: SlaState = "on_track";
  if (grievance.administrative_state === "CLARIFICATION_REQUIRED") state = "paused";
  else if (now > due) state = "breached";
  else if (due - now <= 3 * 24 * 60 * 60 * 1000) state = "due_soon";
  const elapsed = Math.max(0, now - start);
  const duration = Math.max(1, due - start);
  return {
    state,
    label: state === "paused" ? "Timeline paused while information is awaited" : `${Math.ceil(elapsed / 86_400_000)} days elapsed`,
    dueLabel: `Due ${formatDate(grievance.sla_due_at)}`,
    percentElapsed: Math.min(100, Math.round((elapsed / duration) * 100)),
  };
}

export function toGrievanceSummary(
  grievance: GrievanceRow,
  office: string | undefined,
  appeals: AppealRow[] = [],
  requests: DocumentRequestRow[] = [],
  category?: string,
): GrievanceSummary {
  const openRequest = requests.find((request) => !request.fulfilled_at);
  return {
    id: grievance.id,
    registrationNumber: grievance.registration_number,
    originalText: grievance.original_text,
    shortTitle: grievance.short_title,
    urgency: grievance.urgency,
    ...(office ? { office } : {}),
    ...(category ? { category } : {}),
    lodgedAt: formatDate(grievance.submitted_at ?? grievance.created_at),
    lastUpdated: formatDateTime(grievance.updated_at),
    adminStatus: toAdminStatus(grievance.administrative_state),
    citizenOutcome: toCitizenOutcome(grievance.citizen_confirmation_state),
    appealStatus: toAppealStatus(appeals, grievance),
    ...(toSla(grievance) ? { sla: toSla(grievance)! } : {}),
    ...(openRequest?.reason
      ? { actionRequired: openRequest.reason }
      : grievance.administrative_state === "CLARIFICATION_REQUIRED"
        ? { actionRequired: "The office needs more information before it can continue." }
        : {}),
  };
}

export function toTimelineEvent(event: CaseEventRow): TimelineEventRecord {
  const isCitizen = event.actor_type === "citizen";
  return {
    id: event.id,
    occurredAt: formatDateTime(event.created_at),
    actorLabel: isCitizen ? "You" : event.actor_type === "system" ? "System" : "Government office",
    actorRole: isCitizen ? "citizen" : "officer",
    title: event.title,
    ...(event.description ? { description: event.description } : {}),
    tone: event.event_type.includes("CONFIRM") ? "success" : event.event_type.includes("REQUEST") ? "warning" : "info",
  };
}

export function toAppealTimelineEvent(event: AppealEventRow): TimelineEventRecord {
  const isCitizen = event.actor_type === "citizen";
  return {
    id: event.id,
    occurredAt: formatDateTime(event.created_at),
    actorLabel: isCitizen ? "You" : event.actor_type === "system" ? "System" : "Appellate office",
    actorRole: isCitizen ? "citizen" : "appellate",
    title: event.title,
    ...(event.description ? { description: event.description } : {}),
    tone: event.event_type.includes("DECID") ? "success" : "info",
  };
}

export function toDocumentRecord(document: DocumentRow): DocumentRecord {
  return {
    id: document.id,
    name: document.file_name,
    ...(document.doc_kind || document.mime_type ? { kind: document.doc_kind ?? document.mime_type! } : {}),
    ...(document.size_bytes == null ? {} : { sizeLabel: `${Math.max(1, Math.round(document.size_bytes / 1024))} KB` }),
    uploadedBy: document.uploaded_by ? "Case participant" : "System",
    uploadedAt: formatDate(document.created_at),
  };
}
