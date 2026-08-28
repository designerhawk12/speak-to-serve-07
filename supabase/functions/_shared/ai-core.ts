export const ELIGIBILITY_PROMPT_VERSION = "eligibility-v1.0.0";
export const GUIDANCE_PROMPT_VERSION = "citizen-guidance-v2.0.0";
export const TRANSLATION_PROMPT_VERSION = "translation-v1.0.0";
export const GRIEVANCE_INTAKE_PROMPT_VERSION = "grievance-intake-v2.0.1";
export const OFFICER_SUMMARY_PROMPT_VERSION = "officer-summary-v1.0.0";
export const RESOLUTION_COMPARE_PROMPT_VERSION = "resolution-compare-v2.0.0";

export interface AiTaxonomyCategory {
  id: string;
  code: string;
  name: string;
  plain_language_hint?: string | null;
  parent_id: string | null;
  default_organization_id: string | null;
}

export interface AiTaxonomyOrganization {
  id: string;
  name: string;
  level: string;
  parent_id?: string | null;
}

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

export const INTAKE_LANGUAGE_CODES = [
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

const intakeLanguageCodes = new Set<string>(INTAKE_LANGUAGE_CODES);

export interface IntakeSuggestion {
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

function semanticCategoryScore(problem: string, category: string): number {
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

export function detectIntakeLanguage(text: string, selectedLanguage?: string): string {
  const preferred = selectedLanguage?.trim().toLocaleLowerCase().split("-")[0] ?? "";
  const sharedScript = (
    {
      hi: /[\u0900-\u097f]/u,
      mr: /[\u0900-\u097f]/u,
      brx: /[\u0900-\u097f]/u,
      kok: /[\u0900-\u097f]/u,
      ne: /[\u0900-\u097f]/u,
      doi: /[\u0900-\u097f]/u,
      mai: /[\u0900-\u097f]/u,
      sa: /[\u0900-\u097f]/u,
      bn: /[\u0980-\u09ff]/u,
      as: /[\u0980-\u09ff]/u,
      ur: /[\u0600-\u06ff]/u,
      sd: /[\u0600-\u06ff]/u,
      ks: /[\u0600-\u06ff]/u,
    } as Record<string, RegExp>
  )[preferred];
  if (intakeLanguageCodes.has(preferred) && sharedScript?.test(text)) return preferred;
  if (/[\u1c50-\u1c7f]/u.test(text)) return "sat";
  if (/[\uabc0-\uabff]/u.test(text)) return "mni";
  if (/[\u0d00-\u0d7f]/u.test(text)) return "ml";
  if (/[\u0c80-\u0cff]/u.test(text)) return "kn";
  if (/[\u0c00-\u0c7f]/u.test(text)) return "te";
  if (/[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[\u0b00-\u0b7f]/u.test(text)) return "or";
  if (/[\u0a80-\u0aff]/u.test(text)) return "gu";
  if (/[\u0a00-\u0a7f]/u.test(text)) return "pa";
  if (/[ৰৱ]/u.test(text)) return "as";
  if (/[\u0980-\u09ff]/u.test(text)) return "bn";
  if (/[\u0900-\u097f]/u.test(text)) return "hi";
  if (/[\u0600-\u06ff]/u.test(text)) return "ur";
  if (/[A-Za-z]/u.test(text)) return "en";
  return "und";
}

function deterministicIntakeType(text: string): IntakeType {
  const classification = classifyEligibilityDeterministically(text).classification;
  return classification === "RELIGIOUS_OR_NON_SERVICE_MATTER"
    ? "RELIGIOUS_OR_NON_SERVICE"
    : classification;
}

function eligibilityRequiresManualRouting(intakeType: IntakeType): boolean {
  return intakeType !== "ACTIONABLE_GRIEVANCE" && intakeType !== "UNCERTAIN";
}

function detectLocation(text: string, provided?: string | null): string | null {
  if (provided?.trim()) return provided.trim();
  const match = text.match(
    /\b(?:in|at|near)\s+([^.!?]{2,80}?)(?=\s+(?:has|have|is|was|for)\b|[.!?]|$)/iu,
  );
  return match?.[1]?.trim() || null;
}

function fallbackIssueAndOutcome(
  text: string,
  language: string,
  requestedOutcome?: string | null,
): { issue: string; requestedOutcome: string | null } {
  if (CONCEPT_CUES.pension.test(text)) {
    if (language === "hi")
      return {
        issue: "पेंशन भुगतान में देरी",
        requestedOutcome:
          requestedOutcome?.trim() || "लंबित पेंशन भुगतान प्राप्त हो या देरी का स्पष्ट कारण मिले।",
      };
    return {
      issue: "Pension payment delay",
      requestedOutcome:
        requestedOutcome?.trim() ||
        "Receive the pending pension payment or a clear reason preventing payment.",
    };
  }
  if (CONCEPT_CUES.streetlight.test(text)) {
    if (language === "kn")
      return {
        issue: "ಬೀದಿ ದೀಪ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿಲ್ಲ",
        requestedOutcome:
          requestedOutcome?.trim() || "ಬೀದಿ ದೀಪವನ್ನು ದುರಸ್ತಿ ಮಾಡಿ ಬೆಳಕು ಮರುಸ್ಥಾಪಿಸಬೇಕು.",
      };
    if (language === "ta")
      return {
        issue: "தெருவிளக்கு வேலை செய்யவில்லை",
        requestedOutcome:
          requestedOutcome?.trim() || "தெருவிளக்கை பழுதுபார்த்து ஒளியை மீட்டமைக்க வேண்டும்.",
      };
    return {
      issue: "Streetlight not working",
      requestedOutcome: requestedOutcome?.trim() || "Repair the streetlight and restore lighting.",
    };
  }
  return { issue: titleFromText(text), requestedOutcome: requestedOutcome?.trim() || null };
}

function normalizedTokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}

function titleFromText(value: string) {
  return (
    value
      .trim()
      .split(/[.!?\n]/u)[0]
      ?.trim()
      .slice(0, 120) || "Grievance described by citizen"
  );
}

/**
 * Provider-free fallback based only on the active taxonomy supplied to it. It
 * deliberately has no fixed CPGRAMS category codes or organization names.
 */
export function deterministicIntakeSuggestion(input: {
  text: string;
  requestedOutcome?: string | null;
  location?: string | null;
  language?: string | null;
  categories: AiTaxonomyCategory[];
  organizations: AiTaxonomyOrganization[];
}): IntakeSuggestion {
  const intakeType = deterministicIntakeType(input.text);
  const problemTokens = new Set(normalizedTokens(input.text));
  const ranked = input.categories
    .map((category) => {
      const categoryText = `${category.name} ${category.code} ${category.plain_language_hint ?? ""}`;
      const categoryTokens = new Set(normalizedTokens(categoryText));
      return {
        category,
        score:
          [...categoryTokens].filter((token) => problemTokens.has(token)).length +
          semanticCategoryScore(input.text, categoryText),
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.category.name.localeCompare(right.category.name),
    );
  const candidate =
    !eligibilityRequiresManualRouting(intakeType) && ranked[0]?.score ? ranked[0].category : null;
  const parent = candidate?.parent_id
    ? (input.categories.find((category) => category.id === candidate.parent_id) ?? null)
    : null;
  const organization = candidate?.default_organization_id
    ? (input.organizations.find((item) => item.id === candidate.default_organization_id) ?? null)
    : null;
  const detectedLocation = detectLocation(input.text, input.location);
  const originalLanguage = detectIntakeLanguage(input.text, input.language ?? undefined);
  const fallbackCopy = fallbackIssueAndOutcome(
    input.text,
    originalLanguage,
    input.requestedOutcome,
  );
  const identifiers = [...input.text.matchAll(/\b(?:[A-Z]{2,}[\d-]{3,}|\d{4,})\b/gu)].map(
    (match) => match[0],
  );
  return {
    original_language: originalLanguage,
    issue: fallbackCopy.issue,
    structured_summary: input.text.trim(),
    requested_outcome: fallbackCopy.requestedOutcome,
    detected_location: detectedLocation,
    detected_identifiers: identifiers,
    suggested_government_level: organization?.level ?? null,
    suggested_organization_id: organization?.id ?? null,
    suggested_organization: organization?.name ?? null,
    suggested_category_id: parent?.id ?? candidate?.id ?? null,
    suggested_category: parent?.name ?? candidate?.name ?? null,
    suggested_subcategory_id: parent ? (candidate?.id ?? null) : null,
    suggested_subcategory: parent ? (candidate?.name ?? null) : null,
    missing_required: [],
    missing_recommended: [
      ...(detectedLocation ? [] : ["Where the problem happened"]),
      ...(CONCEPT_CUES.pension.test(input.text) && !/\bppo\b/iu.test(input.text)
        ? [
            "Adding your PPO/reference number may help the department identify your pension record faster.",
          ]
        : []),
    ],
    optional_suggestions: [
      "You can add a location, relevant date, or reference number if it will help the office investigate.",
    ],
    route_confidence: candidate ? Math.min(0.8, 0.45 + (ranked[0]?.score ?? 0) * 0.08) : 0.35,
    route_explanation: candidate
      ? "This is a deterministic cue match against the active database taxonomy and requires manual review."
      : null,
    intake_type: intakeType,
    eligibility_guidance:
      intakeType === "ACTIONABLE_GRIEVANCE"
        ? null
        : classifyEligibilityDeterministically(input.text).guidance,
  };
}

export function reconcileIntakeTaxonomySuggestion(
  candidate: IntakeSuggestion,
  taxonomy: {
    categories: AiTaxonomyCategory[];
    organizations: AiTaxonomyOrganization[];
  },
  originalText: string,
  selectedLanguage: string,
): IntakeSuggestion {
  const deterministicEligibility = classifyEligibilityDeterministically(originalText);
  const deterministicType =
    deterministicEligibility.classification === "RELIGIOUS_OR_NON_SERVICE_MATTER"
      ? "RELIGIOUS_OR_NON_SERVICE"
      : deterministicEligibility.classification;
  const intakeType =
    deterministicType !== "ACTIONABLE_GRIEVANCE" && deterministicType !== "UNCERTAIN"
      ? deterministicType
      : candidate.intake_type;
  const routeMayBePresented = !eligibilityRequiresManualRouting(intakeType);
  const categoryCandidate = candidate.suggested_category_id
    ? (taxonomy.categories.find((item) => item.id === candidate.suggested_category_id) ?? null)
    : null;
  const subcategoryCandidate = candidate.suggested_subcategory_id
    ? (taxonomy.categories.find((item) => item.id === candidate.suggested_subcategory_id) ?? null)
    : null;
  const selected = subcategoryCandidate ?? categoryCandidate;
  const selectedSubcategory = selected?.parent_id ? selected : null;
  const category = selectedSubcategory
    ? (taxonomy.categories.find((item) => item.id === selectedSubcategory.parent_id) ?? null)
    : selected;
  const suggestedOrganizationId =
    selectedSubcategory?.default_organization_id ?? category?.default_organization_id ?? null;
  const organization = suggestedOrganizationId
    ? (taxonomy.organizations.find((item) => item.id === suggestedOrganizationId) ?? null)
    : null;
  const suggestedIdsAreValid = routeMayBePresented && Boolean(category && organization);
  const recommended = [...candidate.missing_required, ...candidate.missing_recommended].filter(
    (item, index, items) => items.indexOf(item) === index,
  );
  const detectedLanguage = detectIntakeLanguage(originalText, selectedLanguage);
  return {
    ...candidate,
    original_language:
      detectedLanguage !== "und"
        ? detectedLanguage
        : intakeLanguageCodes.has(candidate.original_language)
          ? candidate.original_language
          : "und",
    suggested_organization_id: routeMayBePresented ? (organization?.id ?? null) : null,
    suggested_organization: routeMayBePresented ? (organization?.name ?? null) : null,
    suggested_government_level: routeMayBePresented ? (organization?.level ?? null) : null,
    suggested_category_id: routeMayBePresented ? (category?.id ?? null) : null,
    suggested_category: routeMayBePresented ? (category?.name ?? null) : null,
    suggested_subcategory_id: routeMayBePresented ? (selectedSubcategory?.id ?? null) : null,
    suggested_subcategory: routeMayBePresented ? (selectedSubcategory?.name ?? null) : null,
    missing_required: [],
    missing_recommended: recommended.slice(0, 12),
    route_confidence: suggestedIdsAreValid ? candidate.route_confidence : 0,
    intake_type: intakeType,
    eligibility_guidance:
      intakeType === candidate.intake_type
        ? candidate.eligibility_guidance
        : deterministicEligibility.guidance,
  };
}

export interface OfficerSummarySuggestion {
  case_summary: string;
  key_facts: string[];
  citizen_required_action: string | null;
  open_questions: string[];
  confidence: number;
}

export const RESOLUTION_ASSESSMENTS = [
  "ADDRESSES_REQUEST",
  "PARTIALLY_ADDRESSES_REQUEST",
  "LIKELY_UNRESOLVED",
  "INSUFFICIENT_INFORMATION",
] as const;

export type ResolutionAssessment = (typeof RESOLUTION_ASSESSMENTS)[number];

export interface ResolutionComparisonSuggestion {
  assessment: ResolutionAssessment;
  citizen_requested: string;
  government_says_it_did: string;
  addressed_points: string[];
  unresolved_points: string[];
  generic_response_warning: boolean;
  evidence_gap: string | null;
  explanation: string;
  suggested_improvement: string;
  confidence: number;
}

export function deterministicOfficerSummary(input: {
  title: string | null;
  originalText: string;
  requestedOutcome: string | null;
  administrativeState: string;
  organizationName: string | null;
  citizenRequiredAction: string | null;
}): OfficerSummarySuggestion {
  const facts = [
    `Administrative state: ${input.administrativeState.replaceAll("_", " ")}`,
    ...(input.organizationName ? [`Current organization: ${input.organizationName}`] : []),
    ...(input.requestedOutcome ? ["A requested outcome has been recorded."] : []),
  ];
  return {
    case_summary: `${input.title || "This case"} concerns ${input.originalText.trim().slice(0, 500)}`,
    key_facts: facts,
    citizen_required_action: input.citizenRequiredAction,
    open_questions: input.citizenRequiredAction ? [input.citizenRequiredAction] : [],
    confidence: 0.45,
  };
}

export function deterministicResolutionComparison(input: {
  originalGrievance?: string | null;
  requestedOutcome: string | null;
  actionTaken: string;
  outcomeAchieved: string;
  citizenNextStep: string;
  narrative: string;
  partialReason?: string | null;
  evidenceReference?: string | null;
}): ResolutionComparisonSuggestion {
  const citizenRequested =
    input.requestedOutcome?.trim() || input.originalGrievance?.trim() || "Not recorded";
  const responseParts = [input.actionTaken, input.outcomeAchieved, input.narrative]
    .map((part) => part.trim())
    .filter((part, index, parts) => part && parts.indexOf(part) === index);
  const governmentSaysItDid =
    responseParts.join(" ").slice(0, 1800) || "No completed action stated";
  const response = `${governmentSaysItDid} ${input.citizenNextStep}`.toLocaleLowerCase();
  const genericPatterns = [
    /\bnecessary action (?:has been )?taken\b/u,
    /\bappropriate action (?:has been )?taken\b/u,
    /\bforwarded (?:to|for)\b/u,
    /\bmatter (?:has been )?(?:looked into|processed)\b/u,
    /\bcase (?:has been )?processed\b/u,
    /\bdisposed(?: of)?\b/u,
    /\bas per rules\b/u,
    /\baction (?:has been )?initiated\b/u,
    /\bunder process\b/u,
  ];
  const completionPattern =
    /\b(repaired|replaced|restored|rectified|tested|paid|credited|released|issued|delivered|completed|installed|sanctioned)\b/u;
  const referencePattern =
    /\b(work order|reference|order|receipt|transaction|ticket|memo)\b[^.\n]{0,80}\b[A-Z0-9][A-Z0-9/-]{2,}\b/iu;
  const genericResponse = genericPatterns.some((pattern) => pattern.test(response));
  const completionClaim = completionPattern.test(response);
  const evidenceOrReference =
    Boolean(input.evidenceReference?.trim()) || referencePattern.test(response);
  const hasRequestedOutcome = citizenRequested !== "Not recorded";
  const hasSubstantiveResponse = governmentSaysItDid !== "No completed action stated";

  let assessment: ResolutionAssessment;
  if (!hasRequestedOutcome || !hasSubstantiveResponse) {
    assessment = "INSUFFICIENT_INFORMATION";
  } else if (genericResponse && !completionClaim) {
    assessment = "LIKELY_UNRESOLVED";
  } else if (completionClaim && input.outcomeAchieved.trim()) {
    assessment = "ADDRESSES_REQUEST";
  } else if (completionClaim || input.partialReason?.trim() || input.actionTaken.trim()) {
    assessment = "PARTIALLY_ADDRESSES_REQUEST";
  } else {
    assessment = "INSUFFICIENT_INFORMATION";
  }

  const addressedPoints = completionClaim
    ? [`The draft states a concrete completed action: ${governmentSaysItDid.slice(0, 360)}`]
    : [];
  const unresolvedPoints = [
    ...(!hasRequestedOutcome
      ? ["The citizen's requested outcome is not recorded clearly enough for comparison."]
      : []),
    ...(!hasSubstantiveResponse
      ? ["The draft does not state what government action was completed."]
      : []),
    ...(genericResponse && !completionClaim
      ? [
          "The draft reports processing, forwarding, or disposal but does not establish that the citizen's requested outcome was achieved.",
        ]
      : []),
    ...(!input.outcomeAchieved.trim()
      ? ["The draft does not clearly state the outcome achieved for the citizen."]
      : []),
  ].slice(0, 8);
  const evidenceGap =
    hasSubstantiveResponse && !evidenceOrReference
      ? "No supporting evidence or verifiable reference is identified in the draft."
      : null;
  const explanation =
    assessment === "ADDRESSES_REQUEST"
      ? "The draft states a concrete completed action and an achieved outcome that can be checked against the citizen's request. The officer must still verify accuracy and sufficiency."
      : assessment === "PARTIALLY_ADDRESSES_REQUEST"
        ? "The draft describes some action, but it does not yet demonstrate that every part of the citizen's requested outcome was achieved."
        : assessment === "LIKELY_UNRESOLVED"
          ? "The response confirms processing or forwarding, but it does not confirm that the citizen's requested outcome was actually achieved."
          : "There is not enough specific information to compare the citizen's request with a completed government outcome.";
  const suggestedImprovement =
    assessment === "ADDRESSES_REQUEST"
      ? (evidenceGap ??
        "Confirm that the cited action and outcome are accurate, then keep the final response specific and citizen-readable.")
      : "State the concrete action completed, the citizen-facing outcome, and any verifiable evidence or reference. If the request remains unresolved, explain what remains and why.";
  return {
    assessment,
    citizen_requested: citizenRequested.slice(0, 1800),
    government_says_it_did: governmentSaysItDid,
    addressed_points: addressedPoints,
    unresolved_points: unresolvedPoints,
    generic_response_warning: genericResponse && !completionClaim,
    evidence_gap: evidenceGap,
    explanation,
    suggested_improvement: suggestedImprovement,
    confidence: assessment === "INSUFFICIENT_INFORMATION" ? 0.45 : completionClaim ? 0.72 : 0.68,
  };
}

export function guidanceDisclaimer(language: string): string {
  return language === "hi"
    ? "AI मार्गदर्शन केवल सलाह है। यह शिकायत या अपील को अस्वीकार, बंद, स्थानांतरित, हल या तय नहीं कर सकता।"
    : language === "ta"
      ? "AI வழிகாட்டுதல் ஆலோசனை மட்டுமே. அது குறை அல்லது மேல்முறையீட்டை நிராகரிக்கவோ, மூடவோ, மாற்றவோ, தீர்க்கவோ, முடிவு செய்யவோ முடியாது."
      : "AI guidance is advisory. It cannot reject, close, transfer, resolve, or decide a grievance or appeal.";
}

export const ELIGIBILITY_CLASSES = [
  "ACTIONABLE_GRIEVANCE",
  "POSSIBLE_RTI",
  "POSSIBLE_SUB_JUDICE",
  "GOVERNMENT_EMPLOYEE_SERVICE_MATTER",
  "RELIGIOUS_OR_NON_SERVICE_MATTER",
  "SUGGESTION",
  "UNCERTAIN",
] as const;

export type EligibilityClassification = (typeof ELIGIBILITY_CLASSES)[number];

export interface EligibilityDecision {
  classification: EligibilityClassification;
  confidence: number;
  guidance: string;
  can_continue: true;
  advisory: true;
}

const GUIDANCE: Record<EligibilityClassification, string> = {
  ACTIONABLE_GRIEVANCE:
    "This appears to describe a problem with a government service. Review the details and destination before submitting.",
  POSSIBLE_RTI:
    "This appears to be a request for records or information. The RTI process may be the more appropriate channel, but this guidance does not prevent you from continuing if you are also reporting a service failure.",
  POSSIBLE_SUB_JUDICE:
    "This appears to concern a matter before a court or a request to change a judicial decision. CPGRAMS cannot change a court order. You may still continue if you are reporting a separate government-service failure.",
  GOVERNMENT_EMPLOYEE_SERVICE_MATTER:
    "This appears to concern a government employee service matter. Check the applicable departmental service-grievance channel. You may continue if you believe CPGRAMS is still appropriate.",
  RELIGIOUS_OR_NON_SERVICE_MATTER:
    "This may not describe delivery of a government service. Review whether another lawful channel is more appropriate. You may continue if relevant government-service facts were omitted.",
  SUGGESTION:
    "This reads as a policy or infrastructure suggestion rather than a failure of an existing service. You may continue, but describe any current service failure separately if one exists.",
  UNCERTAIN:
    "We could not classify this confidently. You can continue manually; an authorized official, not the assistant, determines how the submission is handled.",
};

/** Deterministic, auditable fallback. It is guidance only and never blocks filing. */
export function classifyEligibilityDeterministically(text: string): EligibilityDecision {
  const value = text.normalize("NFKC").toLocaleLowerCase();
  let classification: EligibilityClassification = "UNCERTAIN";
  let confidence = 0.45;

  if (
    /\b(rti|right to information)\b|\brecords? of expenditure\b|\binformation under the rti act\b/u.test(
      value,
    )
  ) {
    classification = "POSSIBLE_RTI";
    confidence = 0.95;
  } else if (
    /\b(high court|supreme court|court judgment|court order|sub[ -]?judice|pending before (?:a |the )?court)\b/u.test(
      value,
    )
  ) {
    classification = "POSSIBLE_SUB_JUDICE";
    confidence = 0.94;
  } else if (
    /\bgovernment employee\b/u.test(value) &&
    /\b(seniority|promotion|service matter|service record|cadre|posting)\b/u.test(value)
  ) {
    classification = "GOVERNMENT_EMPLOYEE_SERVICE_MATTER";
    confidence = 0.92;
  } else if (
    /\b(religious doctrine|religious ceremony|place of worship|temple ritual|church ritual|mosque ritual|private family dispute|private neighbour dispute)\b/u.test(
      value,
    )
  ) {
    classification = "RELIGIOUS_OR_NON_SERVICE_MATTER";
    confidence = 0.88;
  } else if (
    /\b(government should|please introduce|should introduce|suggest(?:ion)?|new metro station|new policy)\b/u.test(
      value,
    )
  ) {
    classification = "SUGGESTION";
    confidence = 0.9;
  } else if (
    Object.values(CONCEPT_CUES).some((cue) => cue.test(value)) ||
    (/\b(ration|passport|municipal|government service|benefit|certificate)\b/u.test(value) &&
      /\b(not|has not|haven't|failed|missing|delayed|three months|problem|broken|pending)\b/u.test(
        value,
      ))
  ) {
    classification = "ACTIONABLE_GRIEVANCE";
    confidence = 0.91;
  }

  return {
    classification,
    confidence,
    guidance: GUIDANCE[classification],
    can_continue: true,
    advisory: true,
  };
}

export interface PiiRedaction {
  text: string;
  redaction_count: number;
}

/** Removes common direct identifiers before provider transmission or audit. */
export function redactCommonPii(input: string): PiiRedaction {
  let count = 0;
  const redact = (value: string, expression: RegExp, label: string) =>
    value.replace(expression, () => {
      count += 1;
      return `[${label}_${count}]`;
    });

  let text = input;
  text = redact(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "EMAIL");
  text = redact(text, /(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)/gu, "PHONE");
  text = redact(text, /(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)/gu, "ID");
  text = redact(text, /\b(?:account|a\/c)\s*(?:no\.?|number)?\s*[:#-]?\s*\d{8,18}\b/giu, "ACCOUNT");
  return { text, redaction_count: count };
}

const FORBIDDEN_ACTION_CLAIMS = [
  /\bi (?:have |'ve )?(?:closed|resolved|transferred|approved|rejected|disposed|assigned|submitted) (?:your|the) (?:case|grievance|appeal)\b/iu,
  /\b(?:your|the) (?:case|grievance|appeal) (?:has been|is now) (?:closed|resolved|transferred|approved|rejected|disposed|assigned)\b/iu,
];

export function containsForbiddenGovernmentActionClaim(text: string): boolean {
  return FORBIDDEN_ACTION_CLAIMS.some((pattern) => pattern.test(text));
}

/** These advisory tasks always require an authenticated, RLS-authorized GRO or Nodal Officer. */
export function requiresAuthorizedOfficerCase(action: string): boolean {
  return action === "officer_summary" || action === "resolution_compare";
}

/** Mirrors action authority: a GRO must be assigned; a Nodal Officer remains RLS-subtree scoped. */
export function mayAnalyzeOfficerCase(input: {
  profileRole: string | null;
  userId: string | null;
  assignedOfficerId: string | null;
  caseVisibleThroughRls: boolean;
}): boolean {
  if (!input.userId || !input.caseVisibleThroughRls) return false;
  if (input.profileRole === "gro") return input.assignedOfficerId === input.userId;
  return input.profileRole === "nodal";
}

const FORBIDDEN_RESOLUTION_CONCLUSIONS = [
  /\blegally (?:adequate|correct|compliant|valid)\b/iu,
  /\bthe citizen (?:is|is not) entitled\b/iu,
  /\bthe officer (?:must|should) submit\b/iu,
  /\bthis (?:case|grievance) (?:must|should) be closed\b/iu,
];

export function containsForbiddenResolutionConclusion(text: string): boolean {
  return FORBIDDEN_RESOLUTION_CONCLUSIONS.some((pattern) => pattern.test(text));
}

export const GUIDANCE_ROUTE_ALLOWLIST = [
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

export type GuidanceRoute = (typeof GUIDANCE_ROUTE_ALLOWLIST)[number];

export interface GuidanceSuggestion {
  answer: string;
  suggested_route: GuidanceRoute | null;
  suggested_action_label: string | null;
}

export function isAllowedGuidanceRoute(value: string): value is GuidanceRoute {
  return (GUIDANCE_ROUTE_ALLOWLIST as readonly string[]).includes(value);
}

/** Rejects model-invented absolute URLs and application paths embedded in prose or labels. */
export function containsDisallowedGuidanceUrl(text: string): boolean {
  if (/https?:\/\//iu.test(text)) return true;
  const paths = text.match(/\/[a-z0-9][a-z0-9/_?=#.-]*/giu) ?? [];
  return paths.some((path) => !isAllowedGuidanceRoute(path.replace(/[.,;:!?]+$/u, "")));
}

export function deterministicGuidanceReply(
  question: string,
  language: string,
  authenticated = false,
): GuidanceSuggestion {
  const q = question.toLocaleLowerCase();
  const localized = (english: string, hindi: string, tamil: string) =>
    language === "hi" ? hindi : language === "ta" ? tamil : english;

  if (
    /\bwhat happened to|\bwhere (?:are|is) my (?:complaints?|grievances?|cases?)|\bmy (?:complaints?|grievances?|cases?)|\bgrievance\s+[a-z0-9-]{3,}|\bstatus|\btrack|\bupdate\b/u.test(
      q,
    )
  ) {
    const asksForOwnWorkspace =
      /\bwhere (?:are|is) my (?:complaints?|grievances?|cases?)|\bmy (?:complaints?|grievances?|cases?)/u.test(
        q,
      );
    return {
      answer: localized(
        authenticated
          ? "I cannot retrieve or summarize a private case in chat. Open My grievances for your authorized case details. Public tracking provides only a limited privacy-safe status."
          : "I cannot retrieve private grievance details in chat. Sign in for your own cases, or use Track grievance for limited privacy-safe public status.",
        authenticated
          ? "मैं चैट में निजी केस नहीं खोलता या उसका सार नहीं देता। अपने अधिकृत केस विवरण के लिए मेरी शिकायतें खोलें। सार्वजनिक ट्रैकिंग केवल सीमित, गोपनीयता-सुरक्षित स्थिति दिखाती है।"
          : "मैं चैट में निजी शिकायत विवरण नहीं खोलता। अपने केस के लिए साइन इन करें या सीमित गोपनीयता-सुरक्षित स्थिति के लिए शिकायत ट्रैक करें का उपयोग करें।",
        authenticated
          ? "அரட்டையில் தனிப்பட்ட வழக்கை நான் பெறவோ சுருக்கவோ மாட்டேன். உங்கள் அங்கீகரிக்கப்பட்ட விவரங்களுக்கு என் குறைகள் பகுதியைத் திறக்கவும். பொது கண்காணிப்பு வரையறுக்கப்பட்ட நிலையை மட்டும் காட்டும்."
          : "அரட்டையில் தனிப்பட்ட குறை விவரங்களை நான் பெற மாட்டேன். உங்கள் வழக்குகளுக்கு உள்நுழையவும் அல்லது வரையறுக்கப்பட்ட பொது நிலைக்கு குறையைக் கண்காணிக்கவும்.",
      ),
      suggested_route: asksForOwnWorkspace || authenticated ? "/citizen" : "/track",
      suggested_action_label:
        asksForOwnWorkspace || authenticated ? "My grievances" : "Track grievance",
    };
  }

  if (/\bappellate authority\b/u.test(q)) {
    return {
      answer:
        "An Appellate Authority manually reviews an eligible appeal, including the original complaint, government resolution, citizen disagreement, and authorized evidence. This assistant does not decide appeals.",
      suggested_route: "/faq",
      suggested_action_label: "Read appeal guidance",
    };
  }

  if (/\bappeal status\b/u.test(q)) {
    return {
      answer:
        "Use Appeal status for limited public status. Signed-in citizens should use My grievances for the complete authorized appeal context.",
      suggested_route: "/appeal-status",
      suggested_action_label: "Check appeal status",
    };
  }

  if (/\bappeal|\bpartly|\bnot resolved|\bnot solved\b/u.test(q)) {
    return {
      answer: localized(
        "If the workflow allows an appeal, the citizen workspace offers it after the citizen reviews the government resolution and records what remains unresolved. The Appellate Authority decides the appeal; this assistant does not.",
        "जब प्रक्रिया अपील की अनुमति देती है, तो नागरिक सरकारी समाधान की समीक्षा और शेष समस्या दर्ज करने के बाद नागरिक कार्यक्षेत्र से अपील कर सकता है। निर्णय अपीलीय प्राधिकारी करता है; यह सहायक नहीं।",
        "நடைமுறை மேல்முறையீட்டை அனுமதித்தால், அரசு தீர்வை மதிப்பாய்வு செய்து தீராததை பதிவு செய்த பிறகு குடிமக்கள் பணியிடத்தில் மேல்முறையீடு செய்யலாம். முடிவை மேல்முறையீட்டு அதிகாரியே எடுப்பார்.",
      ),
      suggested_route: "/citizen",
      suggested_action_label: "My grievances",
    };
  }

  if (
    /\bclarification|\brequested documents?|\bupload|\baction required|\breview (?:a |the )?government resolution\b/u.test(
      q,
    )
  ) {
    return {
      answer:
        "Action Required means your case needs a citizen response, such as answering a clarification, uploading a requested document, or reviewing a government resolution. Open the relevant case under My grievances; chat does not submit the response for you.",
      suggested_route: "/citizen",
      suggested_action_label: "My grievances",
    };
  }

  if (
    /\bwhat does gro|\bgro mean|\bnodal officer|\btypes? of issues|\bout of scope|\brti|\bsub[ -]?judice|\bservice matter\b/u.test(
      q,
    )
  ) {
    return {
      answer: /\bnodal officer\b/u.test(q)
        ? "A Nodal Officer provides supervisory visibility for the authorized organization subtree. Escalation draws attention; it does not silently transfer legal ownership."
        : /\bwhat does gro|\bgro mean/u.test(q)
          ? "A Grievance Redressal Officer (GRO) handles grievances assigned within their authorized organization and jurisdiction."
          : "The FAQ explains grievance scope and advisory guidance for RTI, court or sub-judice matters, service matters, and suggestions. Uncertain guidance does not itself reject a filing.",
      suggested_route: "/faq",
      suggested_action_label: "Read the FAQ",
    };
  }

  if (/\blog ?in|\bsign ?in|\bpassword|\botp\b/u.test(q)) {
    return {
      answer:
        "Use the shared sign-in page. Citizens and government officers authenticate through the same secure account system; roles come from the account profile, not a role selector.",
      suggested_route: "/auth/login",
      suggested_action_label: "Sign in",
    };
  }

  if (/\bsign ?up|\bcreate (?:an )?account|\bregister\b/u.test(q)) {
    return {
      answer:
        "Public signup creates a citizen account. Government roles are provisioned separately and cannot be selected during signup.",
      suggested_route: "/auth/signup",
      suggested_action_label: "Create citizen account",
    };
  }

  if (/\bfile|\blodge|\bsubmit|\bwrite|\bformulate|\bhow do i.*grievance\b/u.test(q)) {
    return {
      answer: localized(
        "Describe what happened in your own words and state what would count as resolution. You do not need to know the responsible department before starting; review the suggested route before submission.",
        "जो हुआ उसे अपने शब्दों में लिखें और बताएं कि समाधान किसे मानेंगे। शुरू करने से पहले जिम्मेदार विभाग जानना जरूरी नहीं है; जमा करने से पहले सुझाए गए मार्ग की समीक्षा करें।",
        "என்ன நடந்தது என்பதை உங்கள் சொந்த வார்த்தைகளில் எழுதி, எது தீர்வாக இருக்கும் என்பதைச் சொல்லுங்கள். தொடங்கும் முன் பொறுப்பான துறையை அறிய வேண்டியதில்லை; சமர்ப்பிக்கும் முன் பரிந்துரைக்கப்பட்ட வழியைப் பாருங்கள்.",
      ),
      suggested_route: "/citizen/grievances/new",
      suggested_action_label: "Lodge grievance",
    };
  }

  if (/\bwhat is this portal|\bwhat is cpgrams|\babout (?:this|the) portal\b/u.test(q)) {
    return {
      answer:
        "This is a demonstration CPGRAMS Resolution Workspace: one prototype website for public guidance, citizen grievance workflows, and authorized officer workspaces. It is not an official Government of India website.",
      suggested_route: "/about",
      suggested_action_label: "About this prototype",
    };
  }

  return {
    answer: localized(
      "I can explain this prototype, filing, Action Required, tracking, roles, resolution review, and appeals. I provide navigation and guidance only; I cannot retrieve private cases or perform a government action.",
      "मैं इस प्रोटोटाइप, शिकायत दर्ज करने, आवश्यक कार्रवाई, ट्रैकिंग, भूमिकाओं, समाधान समीक्षा और अपील के बारे में बता सकता हूँ। मैं केवल मार्गदर्शन देता हूँ; निजी केस नहीं खोलता और कोई सरकारी कार्रवाई नहीं करता।",
      "இந்த முன்மாதிரி, குறை பதிவு, தேவையான நடவடிக்கை, கண்காணிப்பு, பங்குகள், தீர்வு மதிப்பாய்வு மற்றும் மேல்முறையீடு குறித்து விளக்க முடியும். நான் வழிகாட்டுதல் மட்டுமே தருகிறேன்; தனிப்பட்ட வழக்குகளைப் பெறவோ அரசு நடவடிக்கை செய்யவோ மாட்டேன்.",
    ),
    suggested_route: "/faq",
    suggested_action_label: "Browse guidance",
  };
}
