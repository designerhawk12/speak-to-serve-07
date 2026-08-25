/**
 * AI integration boundary — PLACEHOLDER ONLY.
 *
 * Contract (see docs/BUILD_CONTRACT.md):
 * - AI never invents government actions.
 * - AI advises; it never closes/rejects a grievance or decides an appeal.
 * - Every suggestion must be attributable, reviewable and dismissible.
 *
 * Implementations will later call a server function. Nothing here talks to a model.
 */

export type AiSuggestionKind =
  | "category_hint"
  | "office_routing"
  | "similar_cases"
  | "drafting_help"
  | "systemic_pattern";

export interface AiSuggestion {
  id: string;
  kind: AiSuggestionKind;
  title: string;
  body: string;
  /** 0–1. Never used to auto-act. */
  confidence?: number;
  /** Human-readable basis so officers can verify before acting. */
  basis?: string;
}

export interface AiSuggestionRequest {
  grievanceText?: string;
  grievanceId?: string;
  kind: AiSuggestionKind;
}

/** Placeholder: returns nothing until a real provider is wired up. */
export async function requestAiSuggestions(_req: AiSuggestionRequest): Promise<AiSuggestion[]> {
  return [];
}

export const AI_DISCLAIMER =
  "AI assistance is advisory only. It cannot record a government action, close a grievance, or decide an appeal.";
