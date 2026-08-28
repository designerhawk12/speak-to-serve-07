export const INTAKE_TYPES = [
  "ACTIONABLE_GRIEVANCE",
  "POSSIBLE_RTI",
  "POSSIBLE_SUB_JUDICE",
  "GOVERNMENT_EMPLOYEE_SERVICE_MATTER",
  "RELIGIOUS_OR_NON_SERVICE",
  "SUGGESTION",
  "UNCERTAIN",
] as const;

export type IntakeType = (typeof INTAKE_TYPES)[number];

export const INTAKE_ORIGINAL_LANGUAGE_CODES = [
  "en",
  "hi",
  "gu",
  "mr",
  "bn",
  "te",
  "as",
  "or",
  "ta",
  "ml",
  "ur",
  "sd",
  "brx",
  "kok",
  "ne",
  "mni",
  "pa",
  "kn",
  "doi",
  "mai",
  "ks",
  "sa",
  "sat",
  "und",
] as const;

/** Stable, advisory contract shared by provider and deterministic fallback. */
export interface GrievanceInterpretation {
  original_language: string;
  issue: string;
  structured_summary: string;
  requested_outcome: string | null;
  detected_location: string | null;
  detected_identifiers: string[];
  suggested_government_level: string | null;
  suggested_organization_id: string | null;
  suggested_organization: string | null;
  suggested_category_id: string | null;
  suggested_category: string | null;
  suggested_subcategory_id: string | null;
  suggested_subcategory: string | null;
  missing_required: string[];
  missing_recommended: string[];
  optional_suggestions: string[];
  route_confidence: number;
  route_explanation: string | null;
  intake_type: IntakeType;
  eligibility_guidance: string | null;
}

export interface InterpretationTaxonomyEntry {
  id: string;
  code: string;
  name: string;
  plain_language_hint?: string | null;
  parent_id: string | null;
  default_organization_id: string | null;
}

export interface InterpretationOrganization {
  id: string;
  name: string;
  level: string;
  parent_id?: string | null;
}

export interface GrievanceInterpretationInput {
  problem: string;
  requestedOutcome?: string;
  location?: string;
  language?: string;
  taxonomy: InterpretationTaxonomyEntry[];
  organizations: InterpretationOrganization[];
}

export interface GrievanceInterpretationAdapter {
  interpret(input: GrievanceInterpretationInput): Promise<GrievanceInterpretation>;
}
