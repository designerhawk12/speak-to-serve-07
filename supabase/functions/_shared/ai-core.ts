export const ELIGIBILITY_PROMPT_VERSION = "eligibility-v1.0.0";
export const GUIDANCE_PROMPT_VERSION = "citizen-guidance-v1.0.0";
export const TRANSLATION_PROMPT_VERSION = "translation-v1.0.0";

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
    /\b(pension|ration|passport|municipal|streetlight|street light|government service|benefit|certificate)\b/u.test(
      value,
    ) &&
    /\b(not|has not|haven't|failed|missing|delayed|three months|problem|broken|pending)\b/u.test(
      value,
    )
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

export interface SafeCaseSnapshot {
  registration_number: string;
  short_title: string;
  administrative_state: string;
  outcome_state: string;
  citizen_confirmation_state: string;
  organization_name: string | null;
  submitted_at: string;
  updated_at: string;
}

export function mayUseCitizenCaseContext(input: {
  profile_role: string | null;
  user_id: string | null;
  citizen_id: string | null;
}): boolean {
  return (
    input.profile_role === "citizen" && Boolean(input.user_id) && input.user_id === input.citizen_id
  );
}

export function deterministicGuidanceReply(
  question: string,
  language: string,
  caseSnapshot: SafeCaseSnapshot | null,
): { answer: string; suggested_actions: string[]; case_context_used: boolean } {
  const q = question.toLocaleLowerCase();
  if (caseSnapshot) {
    const status = `${caseSnapshot.administrative_state.replaceAll("_", " ")}; citizen outcome ${caseSnapshot.outcome_state.replaceAll("_", " ")}`;
    const office = caseSnapshot.organization_name
      ? ` The current organization is ${caseSnapshot.organization_name}.`
      : "";
    return {
      answer:
        language === "hi"
          ? `${caseSnapshot.registration_number} की वर्तमान स्थिति: ${status}.${office} यह जानकारी आपके अधिकृत केस रिकॉर्ड से ली गई है; मैंने कोई सरकारी कार्रवाई नहीं की है।`
          : language === "ta"
            ? `${caseSnapshot.registration_number} வழக்கின் தற்போதைய நிலை: ${status}.${office} இது உங்கள் அங்கீகரிக்கப்பட்ட வழக்குப் பதிவிலிருந்து பெறப்பட்டது; நான் எந்த அரசு நடவடிக்கையும் செய்யவில்லை.`
            : `${caseSnapshot.registration_number} is currently ${status}.${office} This comes from your authorized case record; I have not performed any government action.`,
      suggested_actions: [
        language === "hi"
          ? "पूरी समयरेखा और वर्तमान कार्रवाई के लिए केस कार्यक्षेत्र खोलें।"
          : language === "ta"
            ? "முழு காலவரிசை மற்றும் தற்போதைய நடவடிக்கைகளுக்கு வழக்கு பணியிடத்தைத் திறக்கவும்."
            : "Open the case workspace for the complete timeline and current actions.",
      ],
      case_context_used: true,
    };
  }

  if (/\bappeal|partly|not resolved|not solved\b/u.test(q)) {
    return {
      answer:
        language === "hi"
          ? "रिकॉर्ड की गई प्रक्रिया अनुमति देने पर नागरिक कार्यक्षेत्र में अपील उपलब्ध होती है, जिसमें सरकारी समाधान पर PARTLY या NO उत्तर के बाद की स्थिति शामिल है। निर्णय अपीलीय प्राधिकारी करता है; यह सहायक नहीं।"
          : language === "ta"
            ? "பதிவுசெய்யப்பட்ட நடைமுறை அனுமதிக்கும் போது குடிமக்கள் பணியிடத்தில் மேல்முறையீடு கிடைக்கும்; அரசு தீர்வுக்கு PARTLY அல்லது NO பதிலுக்குப் பிறகும் இது பொருந்தும். முடிவை மேல்முறையீட்டு அதிகாரியே எடுப்பார்; இந்த உதவியாளர் அல்ல."
            : "An appeal becomes available in the citizen workspace when the recorded workflow permits it, including after a PARTLY or NO response to a government resolution. The Appellate Authority makes the decision; this assistant does not.",
      suggested_actions:
        language === "hi"
          ? ["अपना केस देखने के लिए साइन इन करें", "समाधान समीक्षा या अपील अनुभाग खोलें"]
          : language === "ta"
            ? [
                "உங்கள் வழக்கைப் பார்க்க உள்நுழையவும்",
                "தீர்வு மதிப்பாய்வு அல்லது மேல்முறையீட்டு பகுதியைத் திறக்கவும்",
              ]
            : ["Sign in to review your case", "Open the resolution review or appeal section"],
      case_context_used: false,
    };
  }
  if (/\bstatus|track|update\b/u.test(q)) {
    return {
      answer:
        language === "hi"
          ? "साइन इन किए हुए नागरिक मेरी शिकायतें अनुभाग में पूरी जानकारी देख सकते हैं। सार्वजनिक ट्रैकिंग सीमित और गोपनीयता-सुरक्षित विकल्प है, जो केवल सामान्य स्थिति दिखाता है।"
          : language === "ta"
            ? "உள்நுழைந்த குடிமக்கள் என் குறைகள் பகுதியில் முழு தகவலையும் பார்க்கலாம். பொது கண்காணிப்பு தனியுரிமை பாதுகாக்கும் வரையறுக்கப்பட்ட மாற்றாகும்; அது பொதுவான நிலையை மட்டும் காட்டும்."
            : "Signed-in citizens can see complete information under My grievances. Public tracking is a limited privacy-safe fallback and shows only general status fields.",
      suggested_actions:
        language === "hi"
          ? [
              "नागरिक कार्यक्षेत्र में साइन इन करें",
              "सीमित सार्वजनिक स्थिति के लिए शिकायत ट्रैक करें का उपयोग करें",
            ]
          : language === "ta"
            ? [
                "குடிமக்கள் பணியிடத்தில் உள்நுழையவும்",
                "வரையறுக்கப்பட்ட பொது நிலைக்கு குறையைக் கண்காணிக்கவும்",
              ]
            : [
                "Sign in to your citizen workspace",
                "Use Track grievance for limited public status",
              ],
      case_context_used: false,
    };
  }
  if (/\bfile|lodge|submit|write|formulate|grievance\b/u.test(q)) {
    return {
      answer:
        language === "hi"
          ? "जो हुआ उसे अपने शब्दों में लिखें, उपलब्ध तारीखें या संदर्भ संख्या जोड़ें और बताएं कि समाधान किसे मानेंगे। शुरू करने से पहले जिम्मेदार विभाग जानना जरूरी नहीं है।"
          : language === "ta"
            ? "என்ன நடந்தது என்பதை உங்கள் சொந்த வார்த்தைகளில் எழுதுங்கள்; உங்களிடம் உள்ள தேதிகள் அல்லது குறிப்பு எண்களைச் சேர்த்து, எது தீர்வாக இருக்கும் என்பதைச் சொல்லுங்கள். தொடங்கும் முன் பொறுப்பான துறையை அறிய வேண்டியதில்லை."
            : "Describe what happened in your own words, add dates or reference numbers you safely have, and state what would count as resolution. You do not need to know the responsible department before starting.",
      suggested_actions:
        language === "hi"
          ? ["समस्या का वर्णन करें", "वांछित परिणाम बताएं", "सुझाए गए गंतव्य की समीक्षा करें"]
          : language === "ta"
            ? [
                "பிரச்சினையை விவரிக்கவும்",
                "கோரிய முடிவைக் கூறவும்",
                "பரிந்துரைக்கப்பட்ட இலக்கை மதிப்பாய்வு செய்யவும்",
              ]
            : [
                "Describe the problem",
                "State the requested outcome",
                "Review the suggested destination",
              ],
      case_context_used: false,
    };
  }
  return {
    answer:
      language === "hi"
        ? "मैं CPGRAMS, शिकायत दर्ज करने, स्थिति समझने और अपील प्रक्रिया के बारे में मार्गदर्शन दे सकता हूँ। मैं कोई सरकारी कार्रवाई नहीं कर सकता।"
        : language === "ta"
          ? "CPGRAMS, குறைதீர்ப்பு பதிவு, நிலை விளக்கம் மற்றும் மேல்முறையீட்டு நடைமுறை குறித்து நான் வழிகாட்ட முடியும். எந்த அரசு நடவடிக்கையையும் நான் செய்ய முடியாது."
          : "I can explain CPGRAMS, filing, case statuses, and appeals. I can guide you, but I cannot perform or claim a government action.",
    suggested_actions: ["Ask how to file", "Ask what a status means", "Ask how appeals work"],
    case_context_used: false,
  };
}
