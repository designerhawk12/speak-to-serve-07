import type {
  GrievanceInterpretation,
  GrievanceInterpretationAdapter,
  GrievanceInterpretationInput,
} from "./ai-contracts";

function titleFromProblem(problem: string): string {
  const firstSentence = problem.trim().split(/[.!?\n]/)[0]?.trim() ?? "";
  return firstSentence.slice(0, 120) || "Grievance described by citizen";
}

function categoryByCode(input: GrievanceInterpretationInput, code: string) {
  return input.taxonomy.find((entry) => entry.code === code) ?? null;
}

/**
 * Temporary deterministic adapter. It never claims a government action and is
 * intentionally replaceable by a LangGraph implementation using the same contract.
 */
export const deterministicInterpretationAdapter: GrievanceInterpretationAdapter = {
  async interpret(input) {
    const text = input.problem.toLocaleLowerCase();
    const pension = /pension|arrear|bank migration|credit/.test(text);
    const streetlight = /street.?light|lamp post|dark lane|dark street/.test(text);
    const selected = pension
      ? categoryByCode(input, "PENSION-DELAY")
      : streetlight
        ? categoryByCode(input, "URBAN-LIGHT")
        : null;
    const parent = selected?.parent_id ? input.taxonomy.find((entry) => entry.id === selected.parent_id) ?? null : null;
    const organization = selected?.default_organization_id
      ? input.organizations.find((entry) => entry.id === selected.default_organization_id) ?? null
      : null;
    const detectedLocation = input.location?.trim() || (text.includes("kothrud") ? "Kothrud" : null);
    const identifiers = [...input.problem.matchAll(/\b(?:[A-Z]{2,}[\d-]{3,}|\d{4,})\b/g)].map((match) => match[0]);
    const missingRequired = input.problem.trim().length >= 20 ? [] : ["A short description of what happened"];
    const missingRecommended = [
      ...(detectedLocation ? [] : ["Where the problem happened"]),
      ...(input.requestedOutcome?.trim() ? [] : ["What would count as resolution"]),
    ];

    return {
      issue: titleFromProblem(input.problem),
      structured_summary: input.problem.trim(),
      requested_outcome: input.requestedOutcome?.trim() || null,
      detected_location: detectedLocation,
      detected_identifiers: identifiers,
      suggested_government_level: organization?.level ?? null,
      suggested_organization_id: organization?.id ?? null,
      suggested_organization: organization?.name ?? null,
      suggested_category_id: parent?.id ?? selected?.id ?? null,
      suggested_category: parent?.name ?? selected?.name ?? null,
      suggested_subcategory_id: parent ? selected?.id ?? null : null,
      suggested_subcategory: parent ? selected?.name ?? null : null,
      missing_required: missingRequired,
      missing_recommended: missingRecommended,
      optional_suggestions: ["You can add a location, relevant date, or reference number if it will help the office investigate."],
      confidence: selected ? 0.82 : 0.35,
    };
  },
};
