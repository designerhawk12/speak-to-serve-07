import { describe, expect, test } from "bun:test";
import { buildCitizenCaseNarrative } from "../src/lib/cpgrams/citizen-narrative";
import type { GrievanceRow } from "../src/lib/cpgrams/data-access";

const baseGrievance = {
  administrative_state: "UNDER_EXAMINATION",
  citizen_confirmation_state: "AWAITING_CONFIRMATION",
} as GrievanceRow;

describe("citizen case narrative", () => {
  test("uses recorded owner and event data without inventing a blocker", () => {
    const narrative = buildCitizenCaseNarrative({
      grievance: baseGrievance,
      organizationName: "Pension Accounts Office",
      events: [
        {
          created_at: "2026-08-26T09:00:00.000Z",
          citizen_visible: true,
          title: "Case routed",
          description: null,
        } as never,
      ],
      action: {
        state: "no_action_required",
        title: "No action required",
        description: "The case is progressing.",
        requiresAction: false,
      },
    });

    expect(narrative.whereIsMyCase).toContain("Pension Accounts Office");
    expect(narrative.whatHasHappened).toContain("Case routed");
    expect(narrative.blocker).toBe("No blocker has been recorded.");
    expect(narrative.whatIsHappeningNow).toContain("under examination");
    expect(narrative.whatIsHappeningNow).toContain("not yet confirmed");
  });

  test("keeps an action request distinct from government state", () => {
    const narrative = buildCitizenCaseNarrative({
      grievance: { ...baseGrievance, administrative_state: "CLARIFICATION_REQUIRED" },
      organizationName: null,
      events: [],
      action: {
        state: "answer_clarification",
        title: "Answer clarification",
        description: "The office needs more information.",
        requiresAction: true,
      },
    });

    expect(narrative.blocker).toBe("The office needs more information.");
    expect(narrative.whatYouNeedToDo).toBe("The office needs more information.");
    expect(narrative.whatIsHappeningNow).toContain("clarification required");
  });
});
