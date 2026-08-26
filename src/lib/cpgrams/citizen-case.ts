import type { AppealRow, DocumentRequestItemRow, DocumentRequestRow, GrievanceRow } from "./data-access";

export type CitizenActionState =
  | "no_action_required"
  | "upload_documents"
  | "answer_clarification"
  | "review_government_resolution"
  | "appeal_available";

export interface CitizenActionPresentation {
  state: CitizenActionState;
  title: string;
  description: string;
  requiresAction: boolean;
}

export interface CitizenActionItem {
  id: CitizenActionState | `upload_documents:${string}`;
  state: Exclude<CitizenActionState, "no_action_required">;
  title: string;
  description: string;
}

const presentations: Record<CitizenActionState, CitizenActionPresentation> = {
  no_action_required: {
    state: "no_action_required",
    title: "No action required",
    description: "The case is progressing. We will notify you if the office needs anything else.",
    requiresAction: false,
  },
  upload_documents: {
    state: "upload_documents",
    title: "Upload documents",
    description: "The office needs the requested evidence before it can continue reviewing your case.",
    requiresAction: true,
  },
  answer_clarification: {
    state: "answer_clarification",
    title: "Answer clarification",
    description: "The office has asked for more information before it can continue.",
    requiresAction: true,
  },
  review_government_resolution: {
    state: "review_government_resolution",
    title: "Review government resolution",
    description: "The office has provided a resolution. Please confirm whether your real-world problem is solved.",
    requiresAction: true,
  },
  appeal_available: {
    state: "appeal_available",
    title: "Appeal available",
    description: "You can ask an Appellate Authority to review this case if the recorded action did not resolve the problem.",
    requiresAction: true,
  },
};

export function requiredDocumentProgress(items: DocumentRequestItemRow[]) {
  const required = items.filter((item) => item.is_required);
  return { required: required.length, supplied: required.filter((item) => item.document_id).length };
}

/** Deterministic citizen UI state derived from existing, separate database facts. */
export function getCitizenActionState(
  grievance: GrievanceRow,
  requests: DocumentRequestRow[],
  requestItems: DocumentRequestItemRow[],
  appeals: AppealRow[],
): CitizenActionPresentation {
  const openRequestIds = new Set(requests.filter((request) => !request.fulfilled_at).map((request) => request.id));
  const pendingRequiredDocument = requestItems.some(
    (item) => item.is_required && !item.document_id && openRequestIds.has(item.request_id),
  );
  if (pendingRequiredDocument) return presentations.upload_documents;
  if (grievance.administrative_state === "CLARIFICATION_REQUIRED") return presentations.answer_clarification;
  if (
    grievance.outcome_state === "RESOLUTION_PROPOSED" &&
    grievance.citizen_confirmation_state === "AWAITING_CONFIRMATION"
  ) return presentations.review_government_resolution;
  if (
    appeals.length === 0 &&
    ["RESOLUTION_PROVIDED", "DISPOSED", "CLOSED"].includes(grievance.administrative_state) &&
    ["NOT_RESOLVED", "PARTIALLY_RESOLVED"].includes(grievance.citizen_confirmation_state)
  ) return presentations.appeal_available;
  return presentations.no_action_required;
}

/**
 * Returns every unresolved citizen task for one grievance. Consumers must keep
 * this list nested under that grievance rather than regrouping it by task type.
 */
export function getCitizenActionItems(
  grievance: GrievanceRow,
  requests: DocumentRequestRow[],
  requestItems: DocumentRequestItemRow[],
  appeals: AppealRow[],
): CitizenActionItem[] {
  const actions: CitizenActionItem[] = [];
  const addPresentation = (presentation: CitizenActionPresentation) => actions.push({
    id: presentation.state,
    state: presentation.state as CitizenActionItem["state"],
    title: presentation.title,
    description: presentation.description,
  });
  for (const request of requests.filter((entry) => !entry.fulfilled_at)) {
    const items = requestItems.filter((item) => item.request_id === request.id);
    const outstandingRequired = items.filter((item) => item.is_required && !item.document_id).length;
    if (outstandingRequired > 0) actions.push({
      id: `upload_documents:${request.id}`,
      state: "upload_documents",
      title: "Upload requested documents",
      description: request.reason || `${outstandingRequired} required document${outstandingRequired === 1 ? " is" : "s are"} still needed.`,
    });
  }
  if (grievance.administrative_state === "CLARIFICATION_REQUIRED") addPresentation(presentations.answer_clarification);
  if (grievance.outcome_state === "RESOLUTION_PROPOSED" && grievance.citizen_confirmation_state === "AWAITING_CONFIRMATION") addPresentation(presentations.review_government_resolution);
  if (appeals.length === 0 && ["RESOLUTION_PROVIDED", "DISPOSED", "CLOSED"].includes(grievance.administrative_state) && ["NOT_RESOLVED", "PARTIALLY_RESOLVED"].includes(grievance.citizen_confirmation_state)) addPresentation(presentations.appeal_available);
  return actions;
}

export type CitizenDashboardFilter = "all" | "active" | "action_required" | "resolution_review" | "appealed" | "closed";

export function matchesCitizenDashboardFilter(
  filter: CitizenDashboardFilter,
  grievance: GrievanceRow,
  action: CitizenActionPresentation,
  appeals: AppealRow[],
): boolean {
  if (filter === "all") return true;
  if (filter === "active") return !["DISPOSED", "CLOSED"].includes(grievance.administrative_state);
  if (filter === "action_required") return action.requiresAction && action.state !== "review_government_resolution";
  if (filter === "resolution_review") return action.state === "review_government_resolution";
  if (filter === "appealed") return appeals.length > 0;
  return ["DISPOSED", "CLOSED"].includes(grievance.administrative_state);
}
