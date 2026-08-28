import type { GrievanceInterpretationAdapter, IntakeType } from "./ai-contracts";
import { detectOriginalLanguage, normalizeLanguage } from "./language";

const CONCEPT_CUES = {
  pension: /\b(pension|ppo|retirement)\b|पेंशन|पेन्शन|পেনশন|పెన్షన్|ஓய்வூதிய|പെൻഷൻ|پنشن|ಪಿಂಚಣಿ/iu,
  streetlight:
    /\b(streetlight|street light|lamp post)\b|स्ट्रीटलाइट|रस्त्यावरील दिवा|রাস্তার আলো|వీధి దీప|தெருவிளக்கு|തെരുവുവിളക്ക്|سٹریٹ لائٹ|ಬೀದಿ ದೀಪ/iu,
  water:
    /\b(water supply|drinking water|water pressure)\b|पानी|पाणी|জল সরবরাহ|నీటి సరఫరా|குடிநீர்|ജലവിതരണം|پانی|ನೀರು/iu,
} as const;

const CATEGORY_CONCEPT_CUES = {
  pension: /pension|retirement|ppo/iu,
  streetlight: /streetlight|street light|lighting|lamp/iu,
  water: /water|supply|drinking/iu,
} as const;

function semanticScore(problem: string, category: string): number {
  return Object.entries(CONCEPT_CUES).reduce(
    (score, [concept, problemCue]) =>
      score +
      (problemCue.test(problem) &&
      CATEGORY_CONCEPT_CUES[concept as keyof typeof CATEGORY_CONCEPT_CUES].test(category)
        ? 4
        : 0),
    0,
  );
}

function intakeType(problem: string): IntakeType {
  const value = problem.normalize("NFKC").toLocaleLowerCase();
  if (/\b(rti|right to information)\b|सूचना का अधिकार/iu.test(value)) return "POSSIBLE_RTI";
  if (/\b(high court|supreme court|court judgment|sub[ -]?judice)\b|उच्च न्यायालय/iu.test(value))
    return "POSSIBLE_SUB_JUDICE";
  if (/\bgovernment employee\b.*\b(seniority|promotion|service matter)\b/iu.test(value))
    return "GOVERNMENT_EMPLOYEE_SERVICE_MATTER";
  if (/\b(government should|should build|suggestion|new metro station)\b/iu.test(value))
    return "SUGGESTION";
  if (Object.values(CONCEPT_CUES).some((cue) => cue.test(value))) return "ACTIONABLE_GRIEVANCE";
  return "UNCERTAIN";
}

function inferredOutcome(problem: string, language: string): string | null {
  if (CONCEPT_CUES.pension.test(problem)) {
    return language === "hi"
      ? "लंबित पेंशन भुगतान प्राप्त हो या देरी का स्पष्ट कारण मिले।"
      : "Receive the pending pension payment or a clear reason preventing payment.";
  }
  if (CONCEPT_CUES.streetlight.test(problem)) {
    if (language === "kn") return "ಬೀದಿ ದೀಪವನ್ನು ದುರಸ್ತಿ ಮಾಡಿ ಬೆಳಕು ಮರುಸ್ಥಾಪಿಸಬೇಕು.";
    if (language === "ta") return "தெருவிளக்கை பழுதுபார்த்து ஒளியை மீட்டமைக்க வேண்டும்.";
    return "Repair the streetlight and restore lighting.";
  }
  return null;
}

function tokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}

function titleFromProblem(problem: string): string {
  const firstSentence =
    problem
      .trim()
      .split(/[.!?\n]/u)[0]
      ?.trim() ?? "";
  return firstSentence.slice(0, 120) || "Grievance described by citizen";
}

/**
 * Local/offline fallback that ranks only the active taxonomy rows supplied by
 * the database query. It has no fixed category code or organization name.
 */
export const deterministicInterpretationAdapter: GrievanceInterpretationAdapter = {
  async interpret(input) {
    const problemTokens = new Set(tokens(input.problem));
    const ranked = input.taxonomy
      .map((category) => ({
        category,
        score:
          tokens(`${category.name} ${category.code} ${category.plain_language_hint ?? ""}`).filter(
            (token) => problemTokens.has(token),
          ).length +
          semanticScore(
            input.problem,
            `${category.name} ${category.code} ${category.plain_language_hint ?? ""}`,
          ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score || left.category.name.localeCompare(right.category.name),
      );
    const selected = ranked[0]?.score ? ranked[0].category : null;
    const parent = selected?.parent_id
      ? (input.taxonomy.find((entry) => entry.id === selected.parent_id) ?? null)
      : null;
    const organization = selected?.default_organization_id
      ? (input.organizations.find((entry) => entry.id === selected.default_organization_id) ?? null)
      : null;
    const detectedLocation = input.location?.trim() || null;
    const originalLanguage = detectOriginalLanguage(
      input.problem,
      input.language ? normalizeLanguage(input.language) : undefined,
    );
    const identifiers = [...input.problem.matchAll(/\b(?:[A-Z]{2,}[\d-]{3,}|\d{4,})\b/gu)].map(
      (match) => match[0],
    );
    const requestedOutcome =
      input.requestedOutcome?.trim() || inferredOutcome(input.problem, originalLanguage);
    return {
      original_language: originalLanguage,
      issue: titleFromProblem(input.problem),
      structured_summary: input.problem.trim(),
      requested_outcome: requestedOutcome,
      detected_location: detectedLocation,
      detected_identifiers: identifiers,
      suggested_government_level: organization?.level ?? null,
      suggested_organization_id: organization?.id ?? null,
      suggested_organization: organization?.name ?? null,
      suggested_category_id: parent?.id ?? selected?.id ?? null,
      suggested_category: parent?.name ?? selected?.name ?? null,
      suggested_subcategory_id: parent ? (selected?.id ?? null) : null,
      suggested_subcategory: parent ? (selected?.name ?? null) : null,
      missing_required: [],
      missing_recommended: [
        ...(detectedLocation ? [] : ["Where the problem happened"]),
        ...(CONCEPT_CUES.pension.test(input.problem) && !/\bppo\b/iu.test(input.problem)
          ? [
              "Adding your PPO/reference number may help the department identify your pension record faster.",
            ]
          : []),
        ...(requestedOutcome ? [] : ["What would count as resolution"]),
      ],
      optional_suggestions: [
        "You can add a location, relevant date, or reference number if it will help the office investigate.",
      ],
      route_confidence: selected ? Math.min(0.8, 0.45 + (ranked[0]?.score ?? 0) * 0.08) : 0.35,
      route_explanation: selected
        ? "This is a local cue match against the active database taxonomy and must be reviewed manually."
        : null,
      intake_type: intakeType(input.problem),
      eligibility_guidance: null,
    };
  },
};
