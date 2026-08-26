import type { CitizenResolutionConfirmation } from "./data-access";

export interface ResolutionConfirmationDraft {
  choice: CitizenResolutionConfirmation | null;
  whatWasFixed: string;
  whatRemainsUnresolved: string;
  requestedCorrection: string;
}

const emptyDraft: ResolutionConfirmationDraft = { choice: null, whatWasFixed: "", whatRemainsUnresolved: "", requestedCorrection: "" };
const keyFor = (userId: string, grievanceId: string) => `cpgrams:resolution-confirmation:${userId}:${grievanceId}`;

export function loadResolutionConfirmationDraft(userId: string, grievanceId: string): ResolutionConfirmationDraft {
  if (typeof window === "undefined") return emptyDraft;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(keyFor(userId, grievanceId)) ?? "null") as Partial<ResolutionConfirmationDraft> | null;
    return parsed ? { ...emptyDraft, ...parsed } : emptyDraft;
  } catch { return emptyDraft; }
}

export function saveResolutionConfirmationDraft(userId: string, grievanceId: string, draft: ResolutionConfirmationDraft): void {
  if (typeof window !== "undefined") window.sessionStorage.setItem(keyFor(userId, grievanceId), JSON.stringify(draft));
}

export function clearResolutionConfirmationDraft(userId: string, grievanceId: string): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(keyFor(userId, grievanceId));
}
