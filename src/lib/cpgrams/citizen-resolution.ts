import type { CitizenResolutionConfirmation, ClarificationRequestRow, DocumentRow, DocumentRequestRow } from "./data-access";

export function confirmationTransition(confirmation: CitizenResolutionConfirmation) {
  if (confirmation === "CONFIRMED_RESOLVED") return { outcome: "RESOLVED" as const, event: "CITIZEN_CONFIRMED_RESOLVED" };
  if (confirmation === "PARTIALLY_RESOLVED") return { outcome: "PARTIALLY_RESOLVED" as const, event: "CITIZEN_CONFIRMED_PARTLY_RESOLVED" };
  return { outcome: "UNRESOLVED" as const, event: "CITIZEN_CONFIRMED_NOT_RESOLVED" };
}

export function isResolutionEvidence(document: DocumentRow, citizenId: string | undefined): boolean {
  return document.uploaded_by !== citizenId && (document.doc_kind ?? "").toLocaleLowerCase() === "resolution_evidence";
}

/** Legacy government evidence has no resolution_id in the schema. It remains
 * government evidence in the case workspace, but can support the single
 * current resolution during citizen review. */
export function isResolutionReviewEvidence(document: DocumentRow, citizenId: string | undefined): boolean {
  return document.uploaded_by !== citizenId && ["government_evidence", "resolution_evidence"].includes((document.doc_kind ?? "").toLocaleLowerCase());
}

export function currentCitizenActionCount(input: { requests: DocumentRequestRow[]; clarificationRequests: ClarificationRequestRow[]; needsResolutionReview: boolean; appealAvailable: boolean }): number {
  const openDocuments = input.requests.filter((request) => !request.fulfilled_at).length;
  const clarification = input.clarificationRequests.some((request) => !request.fulfilled_at) ? 1 : 0;
  return openDocuments + clarification + Number(input.needsResolutionReview) + Number(input.appealAvailable);
}
