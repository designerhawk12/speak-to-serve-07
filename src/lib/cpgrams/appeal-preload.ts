import type { GrievanceWorkspace } from "./data-access";

/** Keeps the citizen's appeal context grounded in the existing authorized case. */
export function getCitizenAppealPreload(workspace: GrievanceWorkspace) {
  const resolution = workspace.resolutions.find((entry) => !entry.is_interim) ?? null;
  const feedback = workspace.feedback[0] ?? null;
  return {
    originalGrievance: workspace.grievance.original_text,
    requestedOutcome: workspace.grievance.requested_outcome ?? "Not recorded",
    governmentResolution: resolution?.resolution_narrative ?? resolution?.action_taken ?? "No resolution record is available",
    citizenDisagreement: feedback?.what_remains_unresolved ?? feedback?.comments ?? "Not yet recorded",
    evidence: workspace.documents,
  };
}
