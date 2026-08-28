import { describe, expect, test } from "bun:test";
import {
  classifyEligibilityDeterministically,
  containsForbiddenGovernmentActionClaim,
  mayUseCitizenCaseContext,
  redactCommonPii,
  deterministicGuidanceReply,
} from "../supabase/functions/_shared/ai-core";
import { eligibilityResultSchema, guidanceResultSchema } from "../src/lib/cpgrams/ai-gateway";

describe("AI gateway eligibility fallback", () => {
  const examples = [
    ["Please provide records of expenditure under the RTI Act.", "POSSIBLE_RTI"],
    [
      "My matter is before the High Court and I want CPGRAMS to change the court judgment.",
      "POSSIBLE_SUB_JUDICE",
    ],
    [
      "I am a government employee requesting correction of my service seniority.",
      "GOVERNMENT_EMPLOYEE_SERVICE_MATTER",
    ],
    [
      "This is a private dispute about a religious ceremony and not a government service.",
      "RELIGIOUS_OR_NON_SERVICE_MATTER",
    ],
    ["Government should introduce a new metro station here.", "SUGGESTION"],
    ["My pension has not arrived for three months.", "ACTIONABLE_GRIEVANCE"],
    ["I need some help with an issue.", "UNCERTAIN"],
  ] as const;

  for (const [text, expected] of examples) {
    test(`classifies ${expected}`, () => {
      const result = classifyEligibilityDeterministically(text);
      expect(result.classification).toBe(expected);
      expect(result.can_continue).toBe(true);
      expect(result.advisory).toBe(true);
      expect(result.guidance.length).toBeGreaterThan(20);
    });
  }
});

describe("AI gateway privacy and authority boundaries", () => {
  test("redacts common direct identifiers before provider transmission", () => {
    const result = redactCommonPii(
      "Email me@example.in, call +91 9876543210, Aadhaar 1234 5678 9012 and account no 123456789012.",
    );
    expect(result.text).not.toContain("me@example.in");
    expect(result.text).not.toContain("9876543210");
    expect(result.text).not.toContain("1234 5678 9012");
    expect(result.text).not.toContain("123456789012");
    expect(result.redaction_count).toBe(4);
  });

  test("only an owning citizen may supply private case context", () => {
    expect(
      mayUseCitizenCaseContext({
        profile_role: "citizen",
        user_id: "citizen-a",
        citizen_id: "citizen-a",
      }),
    ).toBe(true);
    expect(
      mayUseCitizenCaseContext({
        profile_role: "citizen",
        user_id: "citizen-a",
        citizen_id: "citizen-b",
      }),
    ).toBe(false);
    expect(
      mayUseCitizenCaseContext({
        profile_role: "gro",
        user_id: "officer-a",
        citizen_id: "officer-a",
      }),
    ).toBe(false);
  });

  test("rejects model language that claims a government action", () => {
    expect(containsForbiddenGovernmentActionClaim("I have closed your grievance.")).toBe(true);
    expect(containsForbiddenGovernmentActionClaim("I can explain how closure works.")).toBe(false);
  });

  test("uses the selected Hindi and Tamil language in deterministic fallback", () => {
    expect(deterministicGuidanceReply("How do I file a grievance?", "hi", null).answer).toMatch(
      /[\u0900-\u097f]/u,
    );
    expect(deterministicGuidanceReply("How do I file a grievance?", "ta", null).answer).toMatch(
      /[\u0b80-\u0bff]/u,
    );
  });

  test("client runtime schemas reject authoritative or malformed output", () => {
    expect(
      eligibilityResultSchema.safeParse({
        kind: "eligibility_result",
        classification: "ACTIONABLE_GRIEVANCE",
        confidence: 0.9,
        guidance: "Review before filing.",
        can_continue: false,
        advisory: true,
        provider: "test",
        prompt_version: "v1",
        fallback_used: false,
      }).success,
    ).toBe(false);
    expect(
      guidanceResultSchema.safeParse({
        kind: "guidance_result",
        answer: "Guidance only.",
        suggested_actions: [],
        case_context_used: false,
        disclaimer: "Advisory only.",
        provider: "test",
        prompt_version: "v1",
        fallback_used: true,
        chain_of_thought: "must not be accepted",
      }).success,
    ).toBe(false);
  });
});
