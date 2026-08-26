import { describe, expect, test } from "bun:test";
import {
  escalationAudienceLabel,
  escalationNotificationState,
  isWaitingOnCitizen,
  lastMeaningfulActionLabel,
} from "../src/lib/cpgrams/officer-presentation";
import type { GrievancePriorityRow, NotificationRow } from "../src/lib/cpgrams/data-access";
import type { GrievanceSummary } from "../src/lib/cpgrams/types";

const grievance = { adminStatus: "under_review" } as GrievanceSummary;
const waitingPriority = {
  waiting_on_citizen: true,
  last_meaningful_government_action_at: "2026-08-25T09:15:00.000Z",
} as GrievancePriorityRow;

describe("officer priority presentation", () => {
  test("keeps cases paused for citizen action out of the officer-neglect state", () => {
    expect(isWaitingOnCitizen(grievance, waitingPriority)).toBe(true);
    expect(isWaitingOnCitizen({ ...grievance, actionRequired: "Upload a document" }, null)).toBe(
      true,
    );
    expect(isWaitingOnCitizen(grievance, null)).toBe(false);
  });

  test("shows the persisted meaningful-action timestamp rather than general case activity", () => {
    expect(lastMeaningfulActionLabel(waitingPriority)).toContain("25-Aug-2026");
    expect(lastMeaningfulActionLabel(null)).toBe("No meaningful action recorded");
  });

  test("only reports the signed-in officer's recorded escalation notification state", () => {
    const notifications = [
      {
        grievance_id: "case-a",
        kind: "priority_escalation",
        created_at: "2026-08-26T09:00:00.000Z",
        read_at: null,
      },
      {
        grievance_id: "case-a",
        kind: "priority_escalation",
        created_at: "2026-08-26T10:00:00.000Z",
        read_at: "2026-08-26T10:05:00.000Z",
      },
    ] as NotificationRow[];

    expect(escalationNotificationState(notifications, "case-a")).toEqual({
      label: "Read",
      occurredAt: "2026-08-26T10:00:00.000Z",
    });
    expect(escalationNotificationState(notifications, "case-b").label).toBe(
      "No escalation notification addressed to you",
    );
    expect(escalationAudienceLabel(2)).toContain("Nodal");
  });
});
