import { describe, expect, test } from "bun:test";
import { deterministicInterpretationAdapter } from "../src/lib/cpgrams/deterministic-interpretation";

const taxonomy = [
  { id: "pension", code: "PENSION-DELAY", name: "Pension payment delay", parent_id: null, default_organization_id: "pension-office" },
  { id: "streetlight", code: "URBAN-LIGHT", name: "Streetlight maintenance", parent_id: null, default_organization_id: "municipal-office" },
];

const organizations = [
  { id: "pension-office", name: "Pension Office", level: "state" },
  { id: "municipal-office", name: "Municipal Corporation", level: "local" },
];

describe("deterministic grievance interpretation", () => {
  test("suggests the seeded pension taxonomy without inventing government activity", async () => {
    const result = await deterministicInterpretationAdapter.interpret({
      problem: "My pension has not been credited after the bank account migration.",
      requestedOutcome: "Credit the outstanding pension amount.",
      taxonomy,
      organizations,
    });

    expect(result.suggested_category).toBe("Pension payment delay");
    expect(result.suggested_organization).toBe("Pension Office");
    expect(result.requested_outcome).toBe("Credit the outstanding pension amount.");
    expect(result.structured_summary).toContain("pension has not been credited");
  });

  test("keeps an unmatched problem usable by returning a low-confidence manual-routing result", async () => {
    const result = await deterministicInterpretationAdapter.interpret({
      problem: "The public service near my home has not been working for several weeks.",
      taxonomy,
      organizations,
    });

    expect(result.confidence).toBe(0.35);
    expect(result.suggested_organization).toBeNull();
    expect(result.missing_recommended).toContain("What would count as resolution");
  });
});
