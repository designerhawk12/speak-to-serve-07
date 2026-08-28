import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./session";

type AdministrativeState = Database["public"]["Enums"]["administrative_state"];
type CitizenConfirmationState = Database["public"]["Enums"]["citizen_confirmation_state"];

export interface CaseClosureEligibilityInput {
  actorRole: AppRole;
  actorId: string;
  assignedOfficerId: string | null;
  administrativeState: AdministrativeState;
  citizenConfirmationState: CitizenConfirmationState;
  hasFinalResolution: boolean;
}

export type CaseClosureAvailability =
  { available: true; message: string } | { available: false; message: string };

export function caseClosureAvailability(
  input: CaseClosureEligibilityInput,
): CaseClosureAvailability {
  if (input.actorRole !== "gro" || input.assignedOfficerId !== input.actorId) {
    return {
      available: false,
      message: "Only the currently assigned GRO can close this case.",
    };
  }
  if (input.administrativeState === "CLOSED") {
    return {
      available: false,
      message: "This case is closed and remains available in case history.",
    };
  }
  if (input.citizenConfirmationState !== "CONFIRMED_RESOLVED") {
    return {
      available: false,
      message: "Close case becomes available after the citizen confirms the issue is resolved.",
    };
  }
  if (!input.hasFinalResolution) {
    return {
      available: false,
      message: "A final government resolution is required before this case can be closed.",
    };
  }
  if (!["RESOLUTION_PROVIDED", "DISPOSED"].includes(input.administrativeState)) {
    return {
      available: false,
      message: "This case is not currently in a state that can be closed.",
    };
  }
  return {
    available: true,
    message: "The citizen confirmed the issue is resolved. This case can now be closed.",
  };
}
