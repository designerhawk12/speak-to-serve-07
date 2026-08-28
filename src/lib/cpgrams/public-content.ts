export type FaqSection =
  | "Getting started"
  | "Your case"
  | "Resolution and appeal"
  | "Eligibility guidance"
  | "Account help";

export interface FaqEntry {
  id: string;
  section: FaqSection;
  question: string;
  answer: string;
  keywords: string[];
}

export const FAQ_SECTIONS: readonly FaqSection[] = [
  "Getting started",
  "Your case",
  "Resolution and appeal",
  "Eligibility guidance",
  "Account help",
];

export const FAQ_SEARCH_SUGGESTIONS = [
  { label: "Filing process", query: "filing process" },
  { label: "Document requests", query: "document requests" },
  { label: "Email OTP login", query: "email OTP" },
  { label: "Appeal", query: "appeal" },
] as const;

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    id: "who-can-lodge",
    section: "Getting started",
    question: "Who can lodge a grievance?",
    answer:
      "This demonstration lets a citizen create a private case using an email account. Government officer and appellate accounts are provisioned separately. A signed-in citizen can see only their own cases.",
    keywords: ["citizen", "eligible", "lodge", "account"],
  },
  {
    id: "how-to-file",
    section: "Getting started",
    question: "How do I file a grievance?",
    answer:
      "Sign in, choose Describe a problem, explain what happened, add the important details and the outcome you want, review the suggested destination, then submit. The original words you write are retained with the case.",
    keywords: ["file", "filing process", "process for filing", "submit", "lodge", "new grievance"],
  },
  {
    id: "problem-first",
    section: "Getting started",
    question: "How does problem-first filing work?",
    answer:
      "You begin with “What happened?” rather than a ministry list. This prototype can offer deterministic guidance from your description, but it is not a government decision. You can correct the suggestion or choose a destination and category manually before submission.",
    keywords: ["problem first", "category", "ministry", "routing", "suggestion"],
  },
  {
    id: "tracking",
    section: "Your case",
    question: "How does grievance tracking work?",
    answer:
      "After signing in, use your Citizen workspace for the full private case. Track Grievance is a limited public fallback for a registration number and returns only safe, high-level status information—not your complaint, evidence, or private messages.",
    keywords: ["track", "registration", "number", "public", "dashboard"],
  },
  {
    id: "statuses",
    section: "Your case",
    question: "What do the case statuses mean?",
    answer:
      "The government’s administrative progress, the real-world outcome, and your confirmation are separate. For example, an office may provide a resolution while your case still waits for you to say whether the problem was actually solved.",
    keywords: ["status", "administrative", "outcome", "disposed", "progress"],
  },
  {
    id: "action-required",
    section: "Your case",
    question: "What does Action Required mean?",
    answer:
      "Your case needs something from you, such as an answer to a clarification, one or more requested documents, or a review of a government resolution. The workspace groups current actions by grievance so unrelated cases are not mixed together.",
    keywords: ["action", "required", "documents", "clarification", "review"],
  },
  {
    id: "target",
    section: "Your case",
    question: "What is the 21-day target shown in this prototype?",
    answer:
      "This application’s prototype/policy model uses a 21-day standard grievance target where a case’s configured category provides that target. It is not a statement of an official Government of India service guarantee. When the case is waiting for required information from you, government-processing time is shown as paused.",
    keywords: ["21", "days", "sla", "target", "deadline", "clock"],
  },
  {
    id: "clarification-documents",
    section: "Your case",
    question: "How do clarification and document requests work?",
    answer:
      "An authorised officer can ask a case-specific question or request a checklist of documents. You can answer in the private case workspace and upload requested items one at a time. Remaining required items stay visible until they are supplied.",
    keywords: [
      "clarification",
      "document",
      "document requests",
      "requested documents",
      "upload",
      "checklist",
      "request",
    ],
  },
  {
    id: "resolution-confirmation",
    section: "Resolution and appeal",
    question:
      "What is the difference between a government resolution and citizen-confirmed resolution?",
    answer:
      "A government resolution records what the office says it did. It does not automatically mean the real-world problem is resolved. You can answer Yes, Partly, or No after reviewing it; only Yes records a citizen-confirmed resolved outcome.",
    keywords: ["resolution", "confirmed", "yes", "partly", "no", "government"],
  },
  {
    id: "appeal",
    section: "Resolution and appeal",
    question: "How does an appeal work?",
    answer:
      "If the government response only partly solves the problem or does not solve it, the case presents an appeal action. The appeal starts with your original complaint, requested outcome, government response, disagreement, and authorised evidence. An Appellate Authority reviews it manually.",
    keywords: ["appeal", "dissatisfied", "partly", "not resolved", "appellate"],
  },
  {
    id: "rti",
    section: "Eligibility guidance",
    question: "Can I use this for an RTI request?",
    answer:
      "Requests for records under the Right to Information Act may need an RTI route rather than a grievance workflow. The prototype can show this as guidance, but it does not make a binding eligibility decision; you may continue manually if the guidance is not right for your situation.",
    keywords: ["rti", "records", "information", "right to information"],
  },
  {
    id: "court",
    section: "Eligibility guidance",
    question: "What if my matter is before a court?",
    answer:
      "A request to change or override a court judgment is generally not a grievance workflow matter. The prototype will flag a possible sub-judice issue as guidance only. It does not give legal advice or decide whether your specific matter can proceed.",
    keywords: ["court", "sub judice", "judgment", "legal"],
  },
  {
    id: "service-matter",
    section: "Eligibility guidance",
    question: "Can a government employee raise a service matter?",
    answer:
      "Government employee service matters may be subject to a separate service-grievance process. This prototype provides guidance rather than a final rejection, so check the relevant service rules or use the appropriate approved channel.",
    keywords: ["employee", "service", "seniority", "government employee"],
  },
  {
    id: "suggestion",
    section: "Eligibility guidance",
    question: "What if I have a suggestion rather than a service failure?",
    answer:
      "A proposal, such as introducing a new facility, is different from reporting an existing service problem. The prototype may label it as a suggestion so you can decide how to continue; it does not invent a failed government action.",
    keywords: ["suggestion", "proposal", "new service", "idea"],
  },
  {
    id: "password-otp",
    section: "Account help",
    question: "How do password and email OTP sign-in work?",
    answer:
      "This website uses email-based account access; it has no username. Use your password or the available email OTP option. For a password reset, follow the recovery link sent to your registered email. Never share an OTP or password with another person.",
    keywords: [
      "password",
      "otp",
      "email otp",
      "otp login",
      "otp troubleshooting",
      "login",
      "sign in",
      "reset",
      "username",
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterFaqEntries(query: string, section: FaqSection | "All") {
  const normalizedQuery = normalize(query);
  return FAQ_ENTRIES.filter((entry) => {
    if (section !== "All" && entry.section !== section) return false;
    if (!normalizedQuery) return true;
    return [entry.question, entry.answer, entry.section, ...entry.keywords]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export interface PublicSitemapEntry {
  path: string;
  label: string;
  description: string;
}

export const PUBLIC_SITEMAP: readonly PublicSitemapEntry[] = [
  {
    path: "/",
    label: "Home",
    description: "Overview and links to the public grievance experience.",
  },
  {
    path: "/about",
    label: "How it works",
    description: "A plain-language explanation of the prototype workflow.",
  },
  {
    path: "/reviewer-guide",
    label: "Reviewer / Demo Guide",
    description: "Synthetic accounts, guided journeys, working features, and prototype limits.",
  },
  {
    path: "/faq",
    label: "Frequently asked questions",
    description: "Filing, status, eligibility, and account guidance.",
  },
  {
    path: "/contact",
    label: "Contact",
    description: "Prototype support and safe ways to find help.",
  },
  {
    path: "/track",
    label: "Track Grievance",
    description: "Limited public tracking by registration number.",
  },
  {
    path: "/appeal-status",
    label: "Appeal status",
    description: "Limited public appeal tracking by appeal reference.",
  },
  {
    path: "/dashboard/public",
    label: "Public reporting status",
    description: "The prototype’s public-reporting surface.",
  },
  {
    path: "/dashboard/appeals",
    label: "Appeal reporting status",
    description: "The prototype’s public appeal-reporting surface.",
  },
  {
    path: "/officers/central",
    label: "Central ministries directory",
    description: "Prototype directory presentation for central organisations.",
  },
  {
    path: "/officers/states",
    label: "States and UTs directory",
    description: "Prototype directory presentation for state organisations.",
  },
  {
    path: "/officers/appeals",
    label: "Appellate authorities directory",
    description: "Prototype directory presentation for appellate offices.",
  },
  {
    path: "/disclaimer",
    label: "Disclaimer",
    description: "Important limits of this demonstration interface.",
  },
  {
    path: "/privacy",
    label: "Privacy and website policies",
    description: "Prototype privacy and website-use information.",
  },
  {
    path: "/accessibility",
    label: "Accessibility",
    description: "Accessibility information and practical assistance guidance.",
  },
  { path: "/sitemap", label: "Sitemap", description: "This public route directory." },
];
