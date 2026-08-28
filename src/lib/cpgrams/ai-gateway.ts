import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const eligibilityClasses = [
  "ACTIONABLE_GRIEVANCE",
  "POSSIBLE_RTI",
  "POSSIBLE_SUB_JUDICE",
  "GOVERNMENT_EMPLOYEE_SERVICE_MATTER",
  "RELIGIOUS_OR_NON_SERVICE_MATTER",
  "SUGGESTION",
  "UNCERTAIN",
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
    suggested_actions: z.array(z.string().min(1).max(180)).max(5),
    case_context_used: z.boolean(),
    disclaimer: z.string().min(1),
    provider: z.string().min(1),
    prompt_version: z.string().min(1),
    fallback_used: z.boolean(),
  })
  .strict();

export type EligibilityResult = z.infer<typeof eligibilityResultSchema>;
export type GuidanceResult = z.infer<typeof guidanceResultSchema>;

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
  grievanceId?: string | null;
}): Promise<GuidanceResult> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      action: "guidance_chat",
      message: input.message,
      language: input.language,
      grievance_id: input.grievanceId ?? null,
    },
  });
  if (error) throw new Error("The guidance assistant is unavailable right now. Please try later.");
  const parsed = guidanceResultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("The guidance assistant returned an invalid response. Please try later.");
  return parsed.data;
}
