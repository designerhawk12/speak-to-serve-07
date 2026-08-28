import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  INTAKE_ORIGINAL_LANGUAGE_CODES,
  INTAKE_TYPES,
  type GrievanceInterpretation,
} from "./ai-contracts";

export const eligibilityClasses = [
  "ACTIONABLE_GRIEVANCE",
  "POSSIBLE_RTI",
  "POSSIBLE_SUB_JUDICE",
  "GOVERNMENT_EMPLOYEE_SERVICE_MATTER",
  "RELIGIOUS_OR_NON_SERVICE_MATTER",
  "SUGGESTION",
  "UNCERTAIN",
] as const;

export const guidanceRoutes = [
  "/",
  "/about",
  "/faq",
  "/track",
  "/auth/login",
  "/auth/signup",
  "/citizen",
  "/citizen/grievances/new",
  "/citizen/notifications",
  "/appeal-status",
] as const;

export const resolutionAssessments = [
  "ADDRESSES_REQUEST",
  "PARTIALLY_ADDRESSES_REQUEST",
  "LIKELY_UNRESOLVED",
  "INSUFFICIENT_INFORMATION",
] as const;

export const eligibilityResultSchema = z
  .object({
    kind: z.literal("eligibility_result"),
    classification: z.enum(eligibilityClasses),
    confidence: z.number().min(0).max(1),
    guidance: z.string().min(1).max(1600),
    can_continue: z.literal(true),
    advisory: z.literal(true),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
  })
  .strict();

export const guidanceResultSchema = z
  .object({
    kind: z.literal("guidance_result"),
    answer: z.string().min(1).max(2500),
    suggested_route: z.enum(guidanceRoutes).nullable(),
    suggested_action_label: z.string().min(1).max(120).nullable(),
    disclaimer: z.string().min(1),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
  })
  .strict();

export const grievanceIntakeResultSchema = z
  .object({
    kind: z.literal("grievance_intake_result"),
    original_language: z.enum(INTAKE_ORIGINAL_LANGUAGE_CODES),
    issue: z.string().min(1).max(240),
    structured_summary: z.string().min(1).max(1800),
    requested_outcome: z.string().max(2000).nullable(),
    detected_location: z.string().max(500).nullable(),
    detected_identifiers: z.array(z.string().min(1).max(160)).max(20),
    suggested_government_level: z.string().max(120).nullable(),
    suggested_organization_id: z.string().uuid().nullable(),
    suggested_organization: z.string().max(300).nullable(),
    suggested_category_id: z.string().uuid().nullable(),
    suggested_category: z.string().max(300).nullable(),
    suggested_subcategory_id: z.string().uuid().nullable(),
    suggested_subcategory: z.string().max(300).nullable(),
    missing_required: z.array(z.string().min(1).max(240)).max(8),
    missing_recommended: z.array(z.string().min(1).max(240)).max(12),
    optional_suggestions: z.array(z.string().min(1).max(280)).max(8),
    route_confidence: z.number().min(0).max(1),
    route_explanation: z.string().max(800).nullable(),
    intake_type: z.enum(INTAKE_TYPES),
    eligibility_guidance: z.string().max(1600).nullable(),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
    advisory: z.literal(true),
  })
  .strict();

export const officerSummaryResultSchema = z
  .object({
    kind: z.literal("officer_summary_result"),
    case_summary: z.string().min(1).max(1800),
    key_facts: z.array(z.string().min(1).max(360)).max(10),
    citizen_required_action: z.string().max(500).nullable(),
    open_questions: z.array(z.string().min(1).max(360)).max(8),
    confidence: z.number().min(0).max(1),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
    advisory: z.literal(true),
  })
  .strict();

export const resolutionComparisonResultSchema = z
  .object({
    kind: z.literal("resolution_compare_result"),
    assessment: z.enum(resolutionAssessments),
    citizen_requested: z.string().min(1).max(1800),
    government_says_it_did: z.string().min(1).max(1800),
    addressed_points: z.array(z.string().min(1).max(360)).max(8),
    unresolved_points: z.array(z.string().min(1).max(360)).max(8),
    generic_response_warning: z.boolean(),
    evidence_gap: z.string().min(1).max(800).nullable(),
    explanation: z.string().min(1).max(1800),
    suggested_improvement: z.string().min(1).max(1800),
    confidence: z.number().min(0).max(1),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
    advisory: z.literal(true),
  })
  .strict();

export const translationResultSchema = z
  .object({
    kind: z.literal("translation_result"),
    translated_text: z.string().min(1).max(7000),
    translated: z.boolean(),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
  })
  .strict();

export type EligibilityResult = z.infer<typeof eligibilityResultSchema>;
export type GuidanceResult = z.infer<typeof guidanceResultSchema>;
export type GrievanceIntakeResult = z.infer<typeof grievanceIntakeResultSchema>;
export type OfficerSummaryResult = z.infer<typeof officerSummaryResultSchema>;
export type ResolutionComparisonResult = z.infer<typeof resolutionComparisonResultSchema>;
export type TranslationResult = z.infer<typeof translationResultSchema>;

export async function classifyGrievanceEligibility(input: {
  text: string;
  requestedOutcome?: string;
  language: string;
}): Promise<EligibilityResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "classify_intake",
      text: input.text,
      requested_outcome: input.requestedOutcome ?? null,
      language: input.language,
    },
  });
  if (error) throw new Error("Eligibility guidance is unavailable. You can continue manually.");
  const parsed = eligibilityResultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("Eligibility guidance is unavailable. You can continue manually.");
  return parsed.data;
}

export async function requestCitizenGuidance(input: {
  message: string;
  language: string;
}): Promise<GuidanceResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "guidance_chat",
      message: input.message,
      language: input.language,
    },
  });
  if (error) throw new Error("The guidance assistant is unavailable right now. Please try later.");
  const parsed = guidanceResultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("The guidance assistant returned an invalid response. Please try later.");
  return parsed.data;
}

export async function interpretGrievanceWithAi(input: {
  text: string;
  requestedOutcome?: string | null;
  location?: string | null;
  language: string;
  draft?: {
    identifiers: string[];
    urgency: "routine" | "urgent";
    selectedOrganizationId: string | null;
    selectedCategoryId: string | null;
  };
}): Promise<GrievanceIntakeResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "grievance_intake",
      text: input.text,
      requested_outcome: input.requestedOutcome ?? null,
      location: input.location ?? null,
      language: input.language,
      draft: input.draft
        ? {
            identifiers: input.draft.identifiers,
            urgency: input.draft.urgency,
            selected_organization_id: input.draft.selectedOrganizationId,
            selected_category_id: input.draft.selectedCategoryId,
          }
        : null,
    },
  });
  if (error) throw new Error("Interpretation is unavailable. You can continue manually.");
  const parsed = grievanceIntakeResultSchema.safeParse(data);
  if (!parsed.success) throw new Error("Interpretation is unavailable. You can continue manually.");
  return parsed.data;
}

export async function requestOfficerSummary(input: {
  grievanceId: string;
  language: string;
}): Promise<OfficerSummaryResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: { action: "officer_summary", grievance_id: input.grievanceId, language: input.language },
  });
  if (error)
    throw new Error("AI case summary is unavailable. Continue with the recorded case file.");
  const parsed = officerSummaryResultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("AI case summary is unavailable. Continue with the recorded case file.");
  return parsed.data;
}

export async function compareResolutionWithAi(input: {
  grievanceId: string;
  actionTaken: string;
  outcomeAchieved: string;
  citizenNextStep: string;
  narrative: string;
  partialReason?: string | null;
  evidenceReference?: string | null;
  language: string;
}): Promise<ResolutionComparisonResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "resolution_compare",
      grievance_id: input.grievanceId,
      action_taken: input.actionTaken,
      outcome_achieved: input.outcomeAchieved,
      citizen_next_step: input.citizenNextStep,
      resolution_narrative: input.narrative,
      partial_or_unresolved_reason: input.partialReason ?? null,
      evidence_reference: input.evidenceReference ?? null,
      language: input.language,
    },
  });
  if (error) throw new Error("AI comparison is unavailable. You can submit after your own review.");
  const parsed = resolutionComparisonResultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("AI comparison is unavailable. You can submit after your own review.");
  return parsed.data;
}

export async function translateWithAiGateway(input: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  contentType: "message" | "resolution" | "clarification" | "grievance";
}): Promise<TranslationResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "translate",
      text: input.text,
      source_language: input.sourceLanguage,
      target_language: input.targetLanguage,
      content_type: input.contentType,
    },
  });
  if (error) throw new Error("Translation is unavailable.");
  const parsed = translationResultSchema.safeParse(data);
  if (!parsed.success) throw new Error("Translation is unavailable.");
  return parsed.data;
}

export type AiGrievanceInterpretation = GrievanceInterpretation &
  Pick<GrievanceIntakeResult, "provider" | "prompt_version" | "fallback_used">;
