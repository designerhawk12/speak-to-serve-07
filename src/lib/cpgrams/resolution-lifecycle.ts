import type { Database } from "@/integrations/supabase/types";
import { CITIZEN_OUTCOME_META, type CitizenOutcomeStatus, type StatusMeta } from "./types";

type AdministrativeState = Database["public"]["Enums"]["administrative_state"];
type ConfirmationState = Database["public"]["Enums"]["citizen_confirmation_state"];

const ORIGINAL_GOVERNMENT_PROCESSING_TERMINAL_STATES = new Set<AdministrativeState>([
  "RESOLUTION_PROVIDED",
  "DISPOSED",
  "APPEAL_FILED",
  "APPEAL_UNDER_REVIEW",
  "APPEAL_DECIDED",
  "CLOSED",
]);

export function isOriginalGovernmentProcessingActive(
  state: AdministrativeState,
  confirmation?: ConfirmationState,
): boolean {
  return (
    confirmation !== "CONFIRMED_RESOLVED" &&
    confirmation !== "PARTIALLY_RESOLVED" &&
    confirmation !== "NOT_RESOLVED" &&
    !ORIGINAL_GOVERNMENT_PROCESSING_TERMINAL_STATES.has(state)
  );
}

export function originalGovernmentProcessingEndedAt(grievance: {
  administrative_state: AdministrativeState;
  citizen_confirmation_state?: ConfirmationState;
  government_response_completed_at?: string | null;
  disposed_at: string | null;
  closed_at: string | null;
  updated_at: string;
}): string | null {
  if (
    isOriginalGovernmentProcessingActive(
      grievance.administrative_state,
      grievance.citizen_confirmation_state,
    )
  )
    return null;
  return (
    grievance.government_response_completed_at ??
    grievance.disposed_at ??
    grievance.closed_at ??
    grievance.updated_at
  );
}

const GOVERNMENT_OUTCOME_META: Record<CitizenOutcomeStatus, StatusMeta> = {
  not_reported: {
    label: "Citizen confirmation pending",
    tone: "neutral",
    meaning: "The citizen has not yet confirmed whether the government response solved the issue.",
  },
  problem_persists: {
    label: "Citizen says the issue remains unresolved",
    tone: "critical",
    meaning:
      "The citizen reported that the government response did not solve the underlying issue.",
  },
  partially_resolved: {
    label: "Citizen says the issue is partly resolved",
    tone: "warning",
    meaning: "The citizen reported that part of the issue remains unresolved.",
  },
  confirmed_resolved: {
    label: "Citizen confirmed the issue is resolved",
    tone: "success",
    meaning: "The citizen confirmed that the government response solved the issue.",
  },
};

export function citizenOutcomeMetaForViewer(
  outcome: CitizenOutcomeStatus,
  viewer: "citizen" | "government",
): StatusMeta {
  return viewer === "citizen" ? CITIZEN_OUTCOME_META[outcome] : GOVERNMENT_OUTCOME_META[outcome];
}
