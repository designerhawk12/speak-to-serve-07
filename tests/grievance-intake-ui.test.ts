import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INTAKE_ROUTE_REVIEW_THRESHOLD,
  assessIntakeRoute,
  intakeFallbackMessage,
  intakeRouteNeedsReview,
  resolveActiveIntakeRoute,
} from "../src/lib/cpgrams/intake-policy";

const interpretation = {
  original_language: "en",
  issue: "Pension payment delay",
  structured_summary: "The citizen reports a delayed pension.",
  requested_outcome: "Receive the pending pension payment.",
  detected_location: null,
  detected_identifiers: [],
  suggested_government_level: "central_department",
  suggested_organization_id: "10000000-0000-4000-8000-000000000001",
  suggested_organization: "Pension office",
  suggested_category_id: "00000000-0000-4000-8000-000000000001",
  suggested_category: "Pension services",
  suggested_subcategory_id: null,
  suggested_subcategory: null,
  missing_required: [],
  missing_recommended: [],
  optional_suggestions: [],
  route_confidence: 0.8,
  route_explanation: "Matched against active taxonomy.",
  intake_type: "ACTIONABLE_GRIEVANCE" as const,
  eligibility_guidance: null,
};

describe("AI grievance intake presentation policy", () => {
  test("uses one configured low-confidence threshold and still preserves a candidate", () => {
    expect(INTAKE_ROUTE_REVIEW_THRESHOLD).toBe(0.65);
    expect(intakeRouteNeedsReview(interpretation)).toBe(false);
    expect(intakeRouteNeedsReview({ ...interpretation, route_confidence: 0.64 })).toBe(true);
  });

  test("accepts a valid streetlight route with or without a detected location", () => {
    const categoryId = interpretation.suggested_category_id;
    const organizationId = interpretation.suggested_organization_id;
    const categories = [{ id: categoryId, default_organization_id: null }];
    const organizations = [{ id: organizationId }];

    for (const candidate of [
      { ...interpretation, issue: "Streetlight not working", detected_location: "Kothrud, Pune" },
      {
        ...interpretation,
        issue: "Streetlight not working",
        detected_location: null,
        missing_recommended: ["Where the problem happened"],
      },
    ]) {
      const route = resolveActiveIntakeRoute(candidate, categories, organizations);
      expect(route).toEqual({ categoryId, organizationId });
      expect(
        assessIntakeRoute({
          interpretation: candidate,
          ...route,
          fallbackUsed: false,
        }),
      ).toBe("resolved");
    }
  });

  test("keeps a valid low-confidence route visible for review", () => {
    expect(
      assessIntakeRoute({
        interpretation: { ...interpretation, route_confidence: 0.64 },
        categoryId: interpretation.suggested_category_id,
        organizationId: interpretation.suggested_organization_id,
        fallbackUsed: false,
      }),
    ).toBe("review");
  });

  test("uses manual fallback only for invalid IDs or provider fallback", () => {
    expect(
      assessIntakeRoute({
        interpretation,
        categoryId: null,
        organizationId: interpretation.suggested_organization_id,
        fallbackUsed: false,
      }),
    ).toBe("manual");
    expect(
      assessIntakeRoute({
        interpretation,
        categoryId: interpretation.suggested_category_id,
        organizationId: interpretation.suggested_organization_id,
        fallbackUsed: true,
      }),
    ).toBe("manual");
  });

  test("genuine AI unavailability uses a neutral manual-selection message", () => {
    expect(intakeFallbackMessage()).toBe(
      "AI guidance is unavailable right now. You can continue by choosing the grievance type manually.",
    );
  });

  test("the rendered wizard keeps AI suggestions advisory and opens manual selection", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "routes", "citizen.grievances.new.tsx"),
      "utf8",
    );
    for (const label of [
      "WE UNDERSTOOD YOUR PROBLEM AS",
      "WHAT YOU WANT RESOLVED",
      "SUGGESTED GRIEVANCE TYPE",
      "SUGGESTED GOVERNMENT DESTINATION",
      "AI suggestion",
      "Please review the suggestion before continuing.",
      "Confirm destination",
    ]) {
      expect(source).toContain(label);
    }
    expect(source).not.toContain("We couldn't automatically determine");
    expect(source).not.toContain("Continue with this selection");
    expect(source).not.toContain("confirmSuggestedDestination");
    expect(source).toContain("suggestion is not selected automatically");
    expect(source).toContain("categoryId: draft.categoryId");
    expect(source).toContain("organizationId: draft.organizationId");
  });
});
