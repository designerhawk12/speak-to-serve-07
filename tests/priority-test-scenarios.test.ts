import { describe, expect, test } from "bun:test";
import {
  PRIORITY_TEST_SCENARIOS,
  priorityNotificationAudienceForScenario,
  priorityResultForScenario,
} from "../src/lib/cpgrams/priority-test-scenarios";

const NOW = new Date("2026-08-28T12:00:00.000Z");

describe("development priority test scenarios", () => {
  for (const scenario of PRIORITY_TEST_SCENARIOS) {
    test(`${scenario.id} has the configured deterministic result`, () => {
      const result = priorityResultForScenario(scenario, NOW);
      expect(result.score).toBe(scenario.expected.score);
      expect(result.level).toBe(scenario.expected.level);
      if (scenario.expected.reasonIncludes) {
        expect(
          result.reasons.some((reason) => reason.includes(scenario.expected.reasonIncludes)),
        ).toBe(true);
      } else {
        expect(result.reasons).toEqual([]);
      }
    });
  }

  test("SLA scenarios increase monotonically through the configured thresholds", () => {
    const scenarios = PRIORITY_TEST_SCENARIOS.filter((scenario) => /^P[6-9]_SLA/.test(scenario.id));
    const scores = scenarios.map((scenario) => priorityResultForScenario(scenario, NOW).score);
    expect(scores).toEqual([10, 25, 45, 70]);
  });

  test("waiting on citizen suppresses only government inactivity, not the factual pause reason", () => {
    const scenario = PRIORITY_TEST_SCENARIOS.find((entry) => entry.id === "P10_WAITING_CITIZEN_7D");
    if (!scenario) throw new Error("Missing P10 test scenario");
    const result = priorityResultForScenario(scenario, NOW);
    expect(result.reasons).toEqual([
      "Government inactivity escalation paused while required citizen action is outstanding",
    ]);
  });

  test("critical escalation targets the responsible GRO and authorized Nodal attention", () => {
    const scenario = PRIORITY_TEST_SCENARIOS.find(
      (entry) => entry.id === "P13_CRITICAL_ESCALATION",
    );
    if (!scenario) throw new Error("Missing P13 test scenario");
    expect(priorityNotificationAudienceForScenario(scenario, NOW)).toEqual([
      "RESPONSIBLE_OFFICER",
      "NODAL_SUPERVISOR",
    ]);
  });
});
