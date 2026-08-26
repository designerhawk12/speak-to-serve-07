/**
 * Stable contract for the future LangGraph interpretation service. The current
 * adapter is deterministic and local; replacing it must not change this shape.
 */
export interface GrievanceInterpretation {
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
  confidence: number;
}

export interface InterpretationTaxonomyEntry {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  default_organization_id: string | null;
}

export interface InterpretationOrganization {
  id: string;
  name: string;
  level: string;
}

export interface GrievanceInterpretationInput {
  problem: string;
  requestedOutcome?: string;
  location?: string;
  taxonomy: InterpretationTaxonomyEntry[];
  organizations: InterpretationOrganization[];
}

export interface GrievanceInterpretationAdapter {
  interpret(input: GrievanceInterpretationInput): Promise<GrievanceInterpretation>;
}
