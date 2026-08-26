import type { GrievancePriorityRow, NotificationRow } from "./data-access";
import type { GrievanceSummary } from "./types";

/** Presentation-only interpretation of persisted case and priority facts. */
export function isWaitingOnCitizen(
  grievance: Pick<GrievanceSummary, "adminStatus" | "actionRequired">,
  priority: GrievancePriorityRow | null | undefined,
): boolean {
  return Boolean(
    priority?.waiting_on_citizen ||
    grievance.adminStatus === "awaiting_citizen_input" ||
    grievance.actionRequired,
  );
}

export function lastMeaningfulActionLabel(
  priority: GrievancePriorityRow | null | undefined,
): string {
  if (!priority?.last_meaningful_government_action_at) return "No meaningful action recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(priority.last_meaningful_government_action_at));
}

export interface EscalationNotificationState {
  label: string;
  occurredAt?: string;
}

/**
 * Notifications are visible only to their recipient under RLS. This describes
 * the signed-in officer's recorded state; it does not infer delivery to others.
 */
export function escalationNotificationState(
  notifications: NotificationRow[] | undefined,
  grievanceId: string,
): EscalationNotificationState {
  const latest = notifications
    ?.filter(
      (notification) =>
        notification.grievance_id === grievanceId && notification.kind === "priority_escalation",
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (!latest) return { label: "No escalation notification addressed to you" };
  return {
    label: latest.read_at ? "Read" : "Action required — unread",
    occurredAt: latest.created_at,
  };
}

export function escalationAudienceLabel(escalationLevel: number): string {
  if (escalationLevel >= 2) return "Responsible officer and authorized Nodal supervision";
  if (escalationLevel === 1) return "Responsible officer";
  return "No active escalation audience";
}
