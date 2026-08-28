export const REVIEWER_DEMO_OTP = "24682468";

export const REVIEWER_DEMO_PROJECT_REF = "ptriuuhnesupbdmrmwka";

function configuredSupabaseProjectRef(): string | null {
  const configured = import.meta.env["VITE_SUPABASE_PROJECT_ID"];
  if (configured) return configured;
  const url = import.meta.env["VITE_SUPABASE_URL"];
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

const reviewerModeSetting = import.meta.env["VITE_REVIEWER_DEMO_MODE"];

/**
 * The checked demo project is an explicit browser-side gate. A future
 * production project is off by default and may force the mode off explicitly;
 * the Edge Function has a separate server-side gate as well.
 */
export const REVIEWER_DEMO_MODE =
  reviewerModeSetting === "true" ||
  (reviewerModeSetting !== "false" &&
    configuredSupabaseProjectRef() === REVIEWER_DEMO_PROJECT_REF);

export type ReviewerPersona = "Citizen" | "GRO" | "Nodal Officer" | "Appellate Authority";

export interface ReviewerAccount {
  persona: ReviewerPersona;
  email: string;
  organization: string;
  bestFor: string;
}

/**
 * Public, synthetic reviewer identities. There is deliberately no password or
 * private credential in this client module. Reviewer-mode authentication uses
 * the displayed mock OTP and a separately gated server function.
 */
export const REVIEWER_ACCOUNTS: readonly ReviewerAccount[] = [
  {
    persona: "Citizen",
    email: "citizen.1@demo-data.cpgrams.in",
    organization: "Private citizen workspace",
    bestFor: "Resolution review, appeals, reminders, transfers, and manual-routing guidance",
  },
  {
    persona: "Citizen",
    email: "citizen.2@demo-data.cpgrams.in",
    organization: "Private citizen workspace",
    bestFor: "Partial document request, clarification, closure-ready resolution, and SLA cases",
  },
  {
    persona: "GRO",
    email: "gro.urban.pune.a@demo-data.cpgrams.in",
    organization: "[DEMO] Urban Lighting Office — Pune",
    bestFor: "Assigned Pune streetlight work and multi-GRO assignment",
  },
  {
    persona: "GRO",
    email: "gro.urban.pune.b@demo-data.cpgrams.in",
    organization: "[DEMO] Urban Lighting Office — Pune",
    bestFor: "Assigned Pune streetlight work and access-control comparison",
  },
  {
    persona: "GRO",
    email: "gro.urban.bengaluru@demo-data.cpgrams.in",
    organization: "[DEMO] Urban Lighting Office — Bengaluru",
    bestFor: "Location-restricted assignment",
  },
  {
    persona: "GRO",
    email: "gro.water.a@demo-data.cpgrams.in",
    organization: "[DEMO] Water Service Office",
    bestFor: "Water cases, clarification, wrong-routing, and transfer deadline",
  },
  {
    persona: "GRO",
    email: "gro.water.b@demo-data.cpgrams.in",
    organization: "[DEMO] Water Service Office",
    bestFor: "Multi-GRO distribution and completed document review",
  },
  {
    persona: "GRO",
    email: "gro.pension.a@demo-data.cpgrams.in",
    organization: "[DEMO] Pension Service Office",
    bestFor: "Pension evidence, resolution, and priority cases",
  },
  {
    persona: "GRO",
    email: "gro.pension.b@demo-data.cpgrams.in",
    organization: "[DEMO] Pension Service Office",
    bestFor: "Pension workload balancing and reminder-cap case",
  },
  {
    persona: "Nodal Officer",
    email: "nodal@demo-data.cpgrams.in",
    organization: "[DEMO] Civic Services Supervisory Group",
    bestFor: "Subtree oversight, priority/SLA, workload, and systemic-issue views",
  },
  {
    persona: "Appellate Authority",
    email: "appellate@demo-data.cpgrams.in",
    organization: "[DEMO] Appellate Review Cell",
    bestFor: "Filed and decided appeals with original-case context",
  },
] as const;

export const REVIEWER_CASE_REFERENCES = {
  manualRouting: "CPG-2026-D3A00000000000000001",
  partialDocuments: "CPG-2026-D3A0000000000000000A",
  clarificationRequired: "CPG-2026-D3A0000000000000000C",
  resolutionReview: "CPG-2026-D3A00000000000000010",
  closureReady: "CPG-2026-D3A00000000000000012",
  partlyResolvedAppeal: "CPG-2026-D3A00000000000000015",
  notResolvedAppeal: "CPG-2026-D3A00000000000000017",
  decidedAppeal: "CPG-2026-D3A0000000000000001A",
  transferDeadline: "CPG-2026-D3A0000000000000001D",
} as const;

export function isReviewerAccountEmail(email: string): boolean {
  const normalized = email.trim().toLocaleLowerCase();
  return REVIEWER_ACCOUNTS.some((account) => account.email === normalized);
}
