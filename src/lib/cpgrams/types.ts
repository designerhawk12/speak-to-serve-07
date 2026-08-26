/**
 * Shared domain types for the CPGRAMS Resolution Workspace.
 *
 * These mirror the intended Supabase/Postgres schema (source of truth).
 * No data logic lives here — types + label maps only.
 */

export type UserRole = "public" | "citizen" | "officer" | "nodal" | "appellate";

/** What the GOVERNMENT says about the case. */
export type AdminStatus =
  | "received"
  | "under_review"
  | "assigned"
  | "action_taken"
  | "awaiting_citizen_input"
  | "disposed"
  | "closed_administratively";

/** What the CITIZEN says about their problem. Deliberately separate. */
export type CitizenOutcomeStatus =
  | "not_reported"
  | "problem_persists"
  | "partially_resolved"
  | "confirmed_resolved";

export type AppealStatus =
  | "not_filed"
  | "eligible"
  | "filed"
  | "under_appeal_review"
  | "appeal_decided"
  | "appeal_rejected";

export type SlaState = "on_track" | "due_soon" | "breached" | "paused";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "critical";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** Plain-language explanation shown to citizens. */
  meaning: string;
}

export const ADMIN_STATUS_META: Record<AdminStatus, StatusMeta> = {
  received: {
    label: "Received",
    tone: "neutral",
    meaning: "Your grievance has reached the portal and is waiting to be read by an officer.",
  },
  under_review: {
    label: "Under review",
    tone: "info",
    meaning: "An officer is reading your description and deciding which office should handle it.",
  },
  assigned: {
    label: "With an officer",
    tone: "info",
    meaning: "A specific office has accepted responsibility and is working on your case.",
  },
  action_taken: {
    label: "Action recorded",
    tone: "info",
    meaning:
      "The office has recorded what it did. This does not yet mean your problem is solved — you decide that.",
  },
  awaiting_citizen_input: {
    label: "Needs your input",
    tone: "warning",
    meaning: "The office cannot continue until you answer a question or upload a document.",
  },
  disposed: {
    label: "Disposed by government",
    tone: "info",
    meaning:
      "The government has marked this case finished on its side. You can still say the problem is not solved.",
  },
  closed_administratively: {
    label: "Closed administratively",
    tone: "neutral",
    meaning: "The case was closed for procedural reasons, not because an outcome was confirmed.",
  },
};

export const CITIZEN_OUTCOME_META: Record<CitizenOutcomeStatus, StatusMeta> = {
  not_reported: {
    label: "You haven't confirmed yet",
    tone: "neutral",
    meaning: "We have not asked you, or you have not yet told us whether the problem went away.",
  },
  problem_persists: {
    label: "Problem still there",
    tone: "critical",
    meaning: "You have told us the underlying problem has not changed.",
  },
  partially_resolved: {
    label: "Partly solved",
    tone: "warning",
    meaning: "Some of the problem was fixed, but part of it remains.",
  },
  confirmed_resolved: {
    label: "You confirmed it's solved",
    tone: "success",
    meaning: "You confirmed the real-world problem is actually resolved.",
  },
};

export const APPEAL_STATUS_META: Record<AppealStatus, StatusMeta> = {
  not_filed: {
    label: "No appeal",
    tone: "neutral",
    meaning: "No appeal has been raised on this case.",
  },
  eligible: {
    label: "Appeal available",
    tone: "warning",
    meaning: "You may ask a senior Appellate Authority to review how this case was handled.",
  },
  filed: {
    label: "Appeal filed",
    tone: "info",
    meaning: "Your appeal has been submitted and is waiting to be taken up.",
  },
  under_appeal_review: {
    label: "Appeal under review",
    tone: "info",
    meaning: "An Appellate Authority is reviewing the case file and the office's response.",
  },
  appeal_decided: {
    label: "Appeal decided",
    tone: "info",
    meaning: "The Appellate Authority has issued a decision with reasons.",
  },
  appeal_rejected: {
    label: "Appeal not accepted",
    tone: "critical",
    meaning: "The Appellate Authority declined to intervene and recorded why.",
  },
};

export const SLA_STATE_META: Record<SlaState, StatusMeta> = {
  on_track: { label: "On track", tone: "success", meaning: "Within the committed timeline." },
  due_soon: { label: "Due soon", tone: "warning", meaning: "The deadline is approaching." },
  breached: { label: "Overdue", tone: "critical", meaning: "The committed timeline has passed." },
  paused: {
    label: "Clock paused",
    tone: "neutral",
    meaning: "The timeline is paused while information is awaited.",
  },
};

export interface TimelineEventRecord {
  id: string;
  /** Immutable, append-only. Never edited after creation. */
  occurredAt: string;
  actorLabel: string;
  actorRole: UserRole;
  title: string;
  description?: string;
  tone?: StatusTone;
  attachments?: DocumentRecord[];
}

export interface DocumentRecord {
  id: string;
  name: string;
  sizeLabel?: string;
  kind?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface RequestedOutcome {
  /** In the citizen's own words. Preserved verbatim. */
  citizenWords: string;
  category?: string;
  urgency?: "routine" | "time_sensitive" | "urgent";
}

export interface GrievanceSummary {
  id: string;
  registrationNumber: string;
  /** Original citizen text, never rewritten. */
  originalText: string;
  shortTitle: string;
  urgency?: "routine" | "time_sensitive" | "urgent";
  office?: string;
  category?: string;
  lodgedAt: string;
  lastUpdated: string;
  adminStatus: AdminStatus;
  citizenOutcome: CitizenOutcomeStatus;
  appealStatus: AppealStatus;
  sla?: { state: SlaState; label: string; dueLabel?: string; percentElapsed?: number };
  actionRequired?: string;
}
