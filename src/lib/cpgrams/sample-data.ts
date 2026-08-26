/**
 * PLACEHOLDER DATA ONLY.
 *
 * Used to make the foundation navigable and to demonstrate the design system.
 * Supabase/Postgres is the source of truth (BUILD_CONTRACT #2); every usage of
 * this module must be replaced with a query before the feature ships.
 */
import type { DocumentRecord, GrievanceSummary, TimelineEventRecord } from "./types";

export const SAMPLE_GRIEVANCES: GrievanceSummary[] = [
  {
    id: "g-1041",
    registrationNumber: "DOPST/E/2026/0001041",
    shortTitle: "Pension arrears not credited for four months",
    originalText:
      "My father's pension has not come since April. We went to the office twice and they said it is processed but the bank has nothing. He needs the money for his medicines.",
    office: "Department of Pension & Pensioners' Welfare",
    lodgedAt: "12 Aug 2026",
    lastUpdated: "08 Sep 2026, 09:20",
    adminStatus: "action_taken",
    citizenOutcome: "problem_persists",
    appealStatus: "eligible",
    sla: { state: "breached", label: "34 of 30 days used", dueLabel: "Due 11 Sep", percentElapsed: 100 },
    actionRequired: "The office says it acted, but you reported the problem continues. You can appeal.",
  },
  {
    id: "g-1042",
    registrationNumber: "MOHUA/E/2026/0002210",
    shortTitle: "Street water supply cut without notice",
    originalText:
      "There has been no water in our lane for eleven days. No notice was put up. The tanker comes only twice a week and is not enough for the whole street.",
    office: "Ministry of Housing & Urban Affairs",
    lodgedAt: "20 Aug 2026",
    lastUpdated: "24 Aug 2026, 15:10",
    adminStatus: "awaiting_citizen_input",
    citizenOutcome: "not_reported",
    appealStatus: "not_filed",
    sla: { state: "paused", label: "Clock paused while we wait for your reply", percentElapsed: 40 },
    actionRequired: "The office has asked you to confirm your exact street address.",
  },
  {
    id: "g-1043",
    registrationNumber: "DOPOST/E/2026/0000988",
    shortTitle: "Speed post parcel marked delivered but never received",
    originalText:
      "The tracking says my parcel was delivered on 2 August, signed by someone I do not know. I never received it. It had my original certificates.",
    office: "Department of Posts",
    lodgedAt: "05 Aug 2026",
    lastUpdated: "23 Aug 2026, 11:00",
    adminStatus: "disposed",
    citizenOutcome: "confirmed_resolved",
    appealStatus: "not_filed",
    sla: { state: "on_track", label: "Closed within 18 days", percentElapsed: 60 },
  },
];

export const SAMPLE_DOCUMENTS: DocumentRecord[] = [
  {
    id: "doc-1",
    name: "pension-passbook-april-july.pdf",
    kind: "PDF",
    sizeLabel: "412 KB",
    uploadedBy: "You",
    uploadedAt: "12 Aug 2026",
  },
  {
    id: "doc-2",
    name: "office-action-note.pdf",
    kind: "PDF",
    sizeLabel: "88 KB",
    uploadedBy: "Department of Pension",
    uploadedAt: "02 Sep 2026",
  },
];

export const SAMPLE_TIMELINE: TimelineEventRecord[] = [
  {
    id: "e-1",
    occurredAt: "12 Aug 2026, 10:14",
    actorLabel: "You",
    actorRole: "citizen",
    title: "Grievance described and registered",
    description: "You described the problem in your own words. The original text is preserved on this case.",
    tone: "neutral",
    attachments: [SAMPLE_DOCUMENTS[0]!],
  },
  {
    id: "e-2",
    occurredAt: "14 Aug 2026, 16:02",
    actorLabel: "Grievance Cell",
    actorRole: "nodal",
    title: "Routed to the Department of Pension & Pensioners' Welfare",
    description: "Routing was based on the pension disbursement issue described, not on a category you had to pick.",
    tone: "info",
  },
  {
    id: "e-3",
    occurredAt: "02 Sep 2026, 11:40",
    actorLabel: "Section Officer, Pension Cell",
    actorRole: "officer",
    title: "Action recorded by the office",
    description:
      "The office stated the arrears were released to the bank on 29 August and attached its action note.",
    tone: "info",
    attachments: [SAMPLE_DOCUMENTS[1]!],
  },
  {
    id: "e-4",
    occurredAt: "08 Sep 2026, 09:20",
    actorLabel: "You",
    actorRole: "citizen",
    title: "You reported the problem still persists",
    description: "You confirmed no credit has appeared in the bank account. The case remains open on your side.",
    tone: "critical",
  },
];

export const SAMPLE_OFFICER_DIRECTORY = [
  {
    id: "o-1",
    name: "Sh. R. Venkatesan",
    designation: "Joint Secretary & Nodal Grievance Officer",
    organisation: "Department of Posts",
    email: "nodal.posts@example.gov.in",
    phone: "011-2309 0000",
  },
  {
    id: "o-2",
    name: "Smt. A. Bhattacharya",
    designation: "Director & Nodal Grievance Officer",
    organisation: "Department of Pension & Pensioners' Welfare",
    email: "nodal.pension@example.gov.in",
    phone: "011-2462 0000",
  },
  {
    id: "o-3",
    name: "Sh. M. Iqbal",
    designation: "Appellate Authority",
    organisation: "Ministry of Housing & Urban Affairs",
    email: "appeals.mohua@example.gov.in",
    phone: "011-2306 0000",
  },
];
