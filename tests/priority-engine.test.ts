import { describe, expect, test } from "bun:test";
import {
  calculatePriority,
  notificationAudience,
  STARTING_PRIORITY_CONFIG,
  type PriorityFacts,
} from "../src/lib/cpgrams/priority-engine";

const NOW = new Date("2026-08-26T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);
const daysAgo = (days: number) => hoursAgo(days * 24);

function facts(overrides: Partial<PriorityFacts> = {}): PriorityFacts {
  return {
    now: NOW,
    waitingOnCitizen: false,
    recentReminderCount: 0,
    relatedCaseCount: 0,
    hasActiveAppeal: false,
    ...overrides,
  };
}

describe("deterministic priority rules", () => {
  test("raises an unopened grievance after 24 hours and more strongly after 48 hours", () => {
    const first = calculatePriority(facts({ assignmentStartedAt: hoursAgo(25) }));
    const strong = calculatePriority(facts({ assignmentStartedAt: hoursAgo(49) }));
    expect(first.level).toBe("ELEVATED");
    expect(first.score).toBe(STARTING_PRIORITY_CONFIG.unopenedFirstPoints);
    expect(strong.level).toBe("HIGH");
    expect(strong.reasons[0]).toContain("not opened for 49 hours");
  });

  test("raises an opened but stalled grievance after three and seven days", () => {
    const first = calculatePriority(facts({ openedAt: daysAgo(4) }));
    const strong = calculatePriority(facts({ openedAt: daysAgo(8) }));
    expect(first.level).toBe("ELEVATED");
    expect(first.reasons).toContain("No meaningful government action for 4 days");
    expect(strong.level).toBe("HIGH");
    expect(strong.score).toBe(STARTING_PRIORITY_CONFIG.stalledStrongPoints);
  });

  test("progresses through SLA risk and makes a breach critical", () => {
    const submittedAt = daysAgo(10);
    const slaDueAt = new Date(submittedAt.getTime() + 12 * 86_400_000);
    const nearing = calculatePriority(facts({ submittedAt, slaDueAt }));
    expect(nearing.level).toBe("ELEVATED");
    expect(nearing.reasons[0]).toContain("10 of 12 target days elapsed");

    const breached = calculatePriority(
      facts({ submittedAt: daysAgo(22), slaDueAt: daysAgo(1) }),
    );
    expect(breached.level).toBe("CRITICAL");
    expect(breached.reasons[0]).toContain("SLA breached");
  });

  test("pauses government inactivity while required citizen action is outstanding", () => {
    const result = calculatePriority(
      facts({ openedAt: daysAgo(10), waitingOnCitizen: true }),
    );
    expect(result.score).toBe(0);
    expect(result.level).toBe("NORMAL");
    expect(result.reasons).toEqual([
      "Government inactivity escalation paused while required citizen action is outstanding",
    ]);
  });

  test("caps repeated citizen reminder contribution", () => {
    const result = calculatePriority(facts({ recentReminderCount: 50 }));
    expect(result.score).toBe(STARTING_PRIORITY_CONFIG.reminderPointsCap);
    expect(result.reasons[0]).toContain("contribution capped at 15 points");
  });

  test("records every contributing reason in human-readable form", () => {
    const result = calculatePriority(
      facts({
        submittedAt: daysAgo(17),
        slaDueAt: new Date(daysAgo(17).getTime() + 21 * 86_400_000),
        openedAt: daysAgo(5),
        relatedCaseCount: 2,
        hasActiveAppeal: true,
      }),
    );
    expect(result.reasons).toContain("No meaningful government action for 5 days");
    expect(result.reasons.some((reason) => reason.startsWith("17 of 21 target days elapsed"))).toBe(true);
    expect(result.reasons).toContain("2 related grievances indicate a repeated issue");
    expect(result.reasons).toContain("An active appeal requires senior review attention");
  });

  test("critical attention includes the responsible officer and Nodal supervisor", () => {
    const result = calculatePriority(
      facts({ submittedAt: daysAgo(22), slaDueAt: daysAgo(1) }),
    );
    expect(notificationAudience(result)).toEqual([
      "RESPONSIBLE_OFFICER",
      "NODAL_SUPERVISOR",
    ]);
  });
});
