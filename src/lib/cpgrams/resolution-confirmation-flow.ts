import type { QueryClient } from "@tanstack/react-query";
import type { CitizenResolutionConfirmation } from "./data-access";
import { cpgramsQueryKeys } from "./queries";

export interface ResolutionConfirmationInput {
  grievanceId: string;
  userId: string;
  confirmation: CitizenResolutionConfirmation;
  whatWasFixed: string;
  whatRemainsUnresolved: string;
  requestedCorrection: string;
  file: File | null;
}

export interface ResolutionConfirmationServices {
  confirm: (input: Omit<ResolutionConfirmationInput, "userId" | "file"> & { evidenceDocumentId: string | null }) => Promise<void>;
  uploadEvidence: (input: { grievanceId: string; userId: string; file: File }) => Promise<{ id: string }>;
}

export function validateResolutionConfirmation(input: Pick<ResolutionConfirmationInput, "confirmation" | "whatWasFixed" | "whatRemainsUnresolved" | "requestedCorrection">): string | null {
  if (input.confirmation === "CONFIRMED_RESOLVED") return null;
  if (input.confirmation === "PARTIALLY_RESOLVED") {
    if (!input.whatWasFixed.trim()) return "Tell us what was fixed.";
    if (!input.whatRemainsUnresolved.trim()) return "Tell us what remains unresolved.";
    return null;
  }
  if (!input.whatRemainsUnresolved.trim()) return "Tell us what remains unresolved.";
  if (!input.requestedCorrection.trim()) return "Tell us what correction you are requesting.";
  return null;
}

/** The route's submit handler delegates here so persistence is testable as one flow. */
export async function submitResolutionConfirmation(input: ResolutionConfirmationInput, services: ResolutionConfirmationServices): Promise<void> {
  const evidenceDocumentId = input.file
    ? (await services.uploadEvidence({ grievanceId: input.grievanceId, userId: input.userId, file: input.file })).id
    : null;
  await services.confirm({
    grievanceId: input.grievanceId,
    confirmation: input.confirmation,
    whatWasFixed: input.whatWasFixed,
    whatRemainsUnresolved: input.whatRemainsUnresolved,
    requestedCorrection: input.requestedCorrection,
    evidenceDocumentId,
  });
}

/** Refetches active case and dashboard observers so the visible state changes immediately. */
export async function refreshAfterResolutionConfirmation(queryClient: QueryClient, grievanceId: string, userId: string): Promise<void> {
  const keys = [cpgramsQueryKeys.grievance(grievanceId), cpgramsQueryKeys.citizenGrievances(userId)];
  await Promise.all(keys.map(async (queryKey) => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.refetchQueries({ queryKey, type: "active" });
  }));
}
