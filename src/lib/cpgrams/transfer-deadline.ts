export interface TransferDeadlineState {
  pending: boolean;
  overdue: boolean;
  remainingLabel: string;
}

const HOUR_MS = 60 * 60 * 1000;

export function transferDeadlineState(
  detectedAt: string | null,
  dueAt: string | null,
  resolvedAt: string | null,
  now = new Date(),
): TransferDeadlineState | null {
  if (!detectedAt || !dueAt) return null;
  if (resolvedAt) return { pending: false, overdue: false, remainingLabel: "Transfer completed" };

  const due = new Date(dueAt).getTime();
  const remainingMs = due - now.getTime();
  if (remainingMs === 0) {
    return { pending: true, overdue: false, remainingLabel: "Due now" };
  }
  const overdue = remainingMs < 0;
  const absoluteHours = Math.max(1, Math.ceil(Math.abs(remainingMs) / HOUR_MS));

  return {
    pending: true,
    overdue,
    remainingLabel: overdue
      ? `Overdue by ${absoluteHours} ${absoluteHours === 1 ? "hour" : "hours"}`
      : `${absoluteHours} ${absoluteHours === 1 ? "hour" : "hours"} remaining`,
  };
}
