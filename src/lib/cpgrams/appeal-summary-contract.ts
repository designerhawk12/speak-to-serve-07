/**
 * Reserved for a future advisory-only appeal summary. Any implementation must
 * preserve citizen-written grounds as the authoritative appeal submission.
 */
export interface AppealSummaryInput {
  originalGrievance: string;
  requestedOutcome: string | null;
  governmentResolution: string | null;
  citizenDisagreement: string | null;
  evidence: Array<{ id: string; fileName: string; kind: string | null }>;
}

export interface AppealSummarySuggestion {
  summary: string;
  issuesForReview: string[];
  missingInformation: string[];
  confidence: number;
}

export interface AppealSummaryAdapter {
  summarize(input: AppealSummaryInput): Promise<AppealSummarySuggestion>;
}
