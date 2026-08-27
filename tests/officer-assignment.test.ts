import { describe, expect, test } from "bun:test";
import {
  assignmentDistribution,
  authorizedOrganizationIds,
  chooseEligibleGro,
  isEligibleGro,
  queueRange,
  type AssignmentCandidate,
} from "../src/lib/cpgrams/officer-assignment";

const candidate = (
  id: string,
  overrides: Partial<AssignmentCandidate> = {},
): AssignmentCandidate => ({
  id,
  organizationId: "pune-org",
  active: true,
  stateNames: [],
  districtNames: [],
  locationTerms: ["Pune"],
  activeCaseCount: 0,
  lastAssignedAt: null,
  ...overrides,
});

describe("deterministic GRO assignment", () => {
  test("filters by active role configuration, organization, and location before balancing", () => {
    const puneCase = { organizationId: "pune-org", locationText: "Kothrud, Pune" };
    expect(isEligibleGro(candidate("pune"), puneCase)).toBe(true);
    expect(isEligibleGro(candidate("bengaluru", { locationTerms: ["Bengaluru"] }), puneCase)).toBe(
      false,
    );
    expect(isEligibleGro(candidate("other-org", { organizationId: "other" }), puneCase)).toBe(
      false,
    );
    expect(isEligibleGro(candidate("inactive", { active: false }), puneCase)).toBe(false);
  });

  test("chooses the least-loaded eligible GRO with stable last-assigned/id tie breaking", () => {
    const selected = chooseEligibleGro(
      [
        candidate("gro-b", { activeCaseCount: 2 }),
        candidate("gro-c", { activeCaseCount: 1, lastAssignedAt: "2026-01-02T00:00:00Z" }),
        candidate("gro-a", { activeCaseCount: 1, lastAssignedAt: "2026-01-01T00:00:00Z" }),
      ],
      { organizationId: "pune-org", locationText: "Pune" },
    );
    expect(selected?.id).toBe("gro-a");
  });

  test("distributes eight equivalent grievances evenly across four GROs", () => {
    const distribution = assignmentDistribution(
      ["a", "b", "c", "d"].map((id) => candidate(id)),
      Array.from({ length: 8 }, () => ({ organizationId: "pune-org", locationText: "Pune" })),
    );
    expect(distribution).toEqual({ a: 2, b: 2, c: 2, d: 2 });
  });
});

describe("officer scope and queue pagination", () => {
  test("expands a Nodal root to its descendants but not an unrelated organization", () => {
    const organizations = [
      { id: "root", parent_id: null },
      { id: "child", parent_id: "root" },
      { id: "grandchild", parent_id: "child" },
      { id: "unrelated", parent_id: null },
    ];
    expect([...authorizedOrganizationIds(organizations, "root", true)].sort()).toEqual([
      "child",
      "grandchild",
      "root",
    ]);
    expect([...authorizedOrganizationIds(organizations, "child", false)]).toEqual(["child"]);
  });

  test("bounds queue pages and returns stable inclusive query ranges", () => {
    expect(queueRange(1, 25)).toEqual({ page: 1, pageSize: 25, from: 0, to: 24 });
    expect(queueRange(3, 25)).toEqual({ page: 3, pageSize: 25, from: 50, to: 74 });
    expect(queueRange(0, 500)).toEqual({ page: 1, pageSize: 100, from: 0, to: 99 });
  });
});
