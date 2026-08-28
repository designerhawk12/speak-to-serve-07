import type { GrievanceInterpretation } from "./ai-contracts";
import type { IntakeRouteAcceptance } from "./intake-policy";

export interface NewGrievanceDraft {
  version: 3;
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
  routingAssistance: "ai_resolved" | "ai_review" | "manual_fallback" | null;
  destinationConfirmed: boolean;
  currentStep: number;
  completedAt: string | null;
}

export const newGrievanceDraftKey = (userId: string) => `cpgrams:new-grievance:${userId}`;

export function createNewGrievanceDraft(): NewGrievanceDraft {
  return {
    version: 3,
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
    routingAssistance: null,
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
    if (![1, 2, 3].includes(Number(parsed.version)) || typeof parsed.submissionKey !== "string")
      return createNewGrievanceDraft();
    const draft = parsed as Partial<NewGrievanceDraft>;
    const legacyInterpretation = draft.interpretation as
      (Partial<GrievanceInterpretation> & { confidence?: number }) | null | undefined;
    const interpretation = legacyInterpretation
      ? {
          ...legacyInterpretation,
          original_language: legacyInterpretation.original_language ?? "und",
          route_confidence:
            legacyInterpretation.route_confidence ?? legacyInterpretation.confidence ?? 0,
          route_explanation: legacyInterpretation.route_explanation ?? null,
          intake_type: legacyInterpretation.intake_type ?? "UNCERTAIN",
          eligibility_guidance: legacyInterpretation.eligibility_guidance ?? null,
        }
      : null;
    if (interpretation && "confidence" in interpretation) delete interpretation.confidence;
    const restored: NewGrievanceDraft = {
      ...createNewGrievanceDraft(),
      ...draft,
      interpretation: interpretation as GrievanceInterpretation | null,
      version: 3,
    };
    const savedRoutingAssistance = (draft as { routingAssistance?: unknown }).routingAssistance;
    if (savedRoutingAssistance === "ai") {
      restored.routingAssistance =
        interpretation?.suggested_category_id && interpretation.suggested_organization_id
          ? interpretation.route_confidence < 0.65
            ? "ai_review"
            : "ai_resolved"
          : "manual_fallback";
    }
    return {
      ...restored,
      currentStep: Math.min(
        8,
        Math.max(1, Number.isInteger(restored.currentStep) ? restored.currentStep : 1),
      ),
    };
  } catch {
    return createNewGrievanceDraft();
  }
}

export function advanceNewGrievanceDraft(
  draft: NewGrievanceDraft,
  step: number,
): NewGrievanceDraft {
  return { ...draft, currentStep: Math.min(8, Math.max(1, step)) };
}

export function confirmManualDestination(draft: NewGrievanceDraft): NewGrievanceDraft | null {
  if (!draft.organizationId || !draft.categoryId) return null;
  return { ...draft, manualTaxonomy: true, destinationConfirmed: true, currentStep: 6 };
}

export function applyIntakeInterpretation(
  draft: NewGrievanceDraft,
  interpretation: GrievanceInterpretation,
  route: {
    categoryId: string | null;
    organizationId: string | null;
    acceptance: IntakeRouteAcceptance;
  },
): NewGrievanceDraft {
  return {
    ...draft,
    interpretation,
    requestedOutcome: draft.requestedOutcome || interpretation.requested_outcome?.trim() || "",
    location: draft.location || interpretation.detected_location?.trim() || "",
    identifiers:
      draft.identifiers.length > 0 ? draft.identifiers : interpretation.detected_identifiers,
    // Routing suggestions remain visible, but the citizen selects the actual destination manually.
    categoryId: draft.categoryId,
    organizationId: draft.organizationId,
    manualTaxonomy: true,
    routingAssistance: route.acceptance === "manual" ? "manual_fallback" : "ai_review",
    destinationConfirmed: false,
  };
}

/**
 * Applies citizen corrections to advisory interpretation fields only. The
 * original statement remains authoritative and is deliberately never changed.
 */
export function correctInterpretedProblem(
  draft: NewGrievanceDraft,
  corrections: Partial<GrievanceInterpretation>,
): NewGrievanceDraft {
  if (!draft.interpretation) return draft;
  const interpretation = { ...draft.interpretation, ...corrections };
  const missingRecommended = interpretation.missing_recommended.filter(
    (item) =>
      !(corrections.detected_location !== undefined && item === "Where the problem happened") &&
      !(corrections.requested_outcome !== undefined && item === "What would count as resolution"),
  );
  return {
    ...draft,
    interpretation: { ...interpretation, missing_recommended: missingRecommended },
    location:
      corrections.detected_location === undefined
        ? draft.location
        : (corrections.detected_location ?? ""),
    identifiers:
      corrections.detected_identifiers === undefined
        ? draft.identifiers
        : corrections.detected_identifiers,
    requestedOutcome:
      corrections.requested_outcome === undefined
        ? draft.requestedOutcome
        : (corrections.requested_outcome ?? ""),
  };
}

export function saveNewGrievanceDraft(userId: string, draft: NewGrievanceDraft): void {
  if (typeof window !== "undefined")
    window.localStorage.setItem(newGrievanceDraftKey(userId), JSON.stringify(draft));
}

export function clearNewGrievanceDraft(userId: string): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(newGrievanceDraftKey(userId));
}
