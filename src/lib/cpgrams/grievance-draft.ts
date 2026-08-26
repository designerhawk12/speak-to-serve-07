import type { GrievanceInterpretation } from "./ai-contracts";

export interface NewGrievanceDraft {
  version: 2;
  submissionKey: string;
  problem: string;
  interpretation: GrievanceInterpretation | null;
  location: string;
  identifiers: string[];
  requestedOutcome: string;
  urgency: "routine" | "urgent";
  categoryId: string | null;
  organizationId: string | null;
  manualTaxonomy: boolean;
  destinationConfirmed: boolean;
  currentStep: number;
  completedAt: string | null;
}

export const newGrievanceDraftKey = (userId: string) => `cpgrams:new-grievance:${userId}`;

export function createNewGrievanceDraft(): NewGrievanceDraft {
  return {
    version: 2,
    submissionKey: crypto.randomUUID(),
    problem: "",
    interpretation: null,
    location: "",
    identifiers: [],
    requestedOutcome: "",
    urgency: "routine",
    categoryId: null,
    organizationId: null,
    manualTaxonomy: false,
    destinationConfirmed: false,
    currentStep: 1,
    completedAt: null,
  };
}

export function loadNewGrievanceDraft(userId: string): NewGrievanceDraft {
  if (typeof window === "undefined") return createNewGrievanceDraft();
  return restoreNewGrievanceDraft(window.localStorage.getItem(newGrievanceDraftKey(userId)));
}

export function restoreNewGrievanceDraft(value: string | null): NewGrievanceDraft {
  try {
    if (!value) return createNewGrievanceDraft();
    const parsed = JSON.parse(value) as { version?: unknown; submissionKey?: unknown };
    if ((parsed.version !== 1 && parsed.version !== 2) || typeof parsed.submissionKey !== "string") return createNewGrievanceDraft();
    const draft = parsed as Partial<NewGrievanceDraft>;
    const restored: NewGrievanceDraft = { ...createNewGrievanceDraft(), ...draft, version: 2 };
    return { ...restored, currentStep: Math.min(8, Math.max(1, Number.isInteger(restored.currentStep) ? restored.currentStep : 1)) };
  } catch {
    return createNewGrievanceDraft();
  }
}

export function advanceNewGrievanceDraft(draft: NewGrievanceDraft, step: number): NewGrievanceDraft {
  return { ...draft, currentStep: Math.min(8, Math.max(1, step)) };
}

export function confirmSuggestedDestination(draft: NewGrievanceDraft, suggestion: { organizationId: string | null; categoryId: string | null }): NewGrievanceDraft | null {
  if (!suggestion.organizationId || !suggestion.categoryId) return null;
  return { ...draft, organizationId: suggestion.organizationId, categoryId: suggestion.categoryId, manualTaxonomy: false, destinationConfirmed: true, currentStep: 6 };
}

export function confirmManualDestination(draft: NewGrievanceDraft): NewGrievanceDraft | null {
  if (!draft.organizationId || !draft.categoryId) return null;
  return { ...draft, destinationConfirmed: true, currentStep: 6 };
}

export function saveNewGrievanceDraft(userId: string, draft: NewGrievanceDraft): void {
  if (typeof window !== "undefined") window.localStorage.setItem(newGrievanceDraftKey(userId), JSON.stringify(draft));
}

export function clearNewGrievanceDraft(userId: string): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(newGrievanceDraftKey(userId));
}
