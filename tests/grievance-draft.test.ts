import { describe, expect, test } from "bun:test";
import {
  advanceNewGrievanceDraft,
  confirmManualDestination,
  confirmSuggestedDestination,
  correctInterpretedProblem,
  createNewGrievanceDraft,
  newGrievanceDraftKey,
  restoreNewGrievanceDraft,
} from "../src/lib/cpgrams/grievance-draft";

describe("new grievance draft", () => {
  test("Confirm commits real suggested IDs and advances to completion review", () => {
    const result = confirmSuggestedDestination(createNewGrievanceDraft(), {
      organizationId: "pune-municipal",
      categoryId: "streetlight",
    });
    expect(result).toMatchObject({
      organizationId: "pune-municipal",
      categoryId: "streetlight",
      manualTaxonomy: false,
      destinationConfirmed: true,
      currentStep: 6,
    });
  });

  test("missing suggested IDs gives the route a validation signal instead of advancing", () => {
    expect(
      confirmSuggestedDestination(createNewGrievanceDraft(), {
        organizationId: null,
        categoryId: "streetlight",
      }),
    ).toBeNull();
  });

  test("manual change can be confirmed and advances without replacing the choice", () => {
    const draft = {
      ...createNewGrievanceDraft(),
      manualTaxonomy: true,
      organizationId: "other-office",
      categoryId: "other-category",
    };
    expect(confirmManualDestination(draft)).toMatchObject({
      organizationId: "other-office",
      categoryId: "other-category",
      currentStep: 6,
      destinationConfirmed: true,
    });
  });

  test("review corrections preserve the original citizen text and selected category", () => {
    const original = "The pension was not credited after the bank account migration.";
    const draft = {
      ...createNewGrievanceDraft(),
      problem: original,
      categoryId: "pension-delay",
      organizationId: "pension-office",
      interpretation: {
        issue: "Pension credit delayed",
        structured_summary: "A payment needs review.",
        requested_outcome: null,
        detected_location: null,
        detected_identifiers: [],
        suggested_government_level: "central_department",
        suggested_organization_id: "pension-office",
        suggested_organization: "Pension Office",
        suggested_category_id: "pension-delay",
        suggested_category: "Pension payment delay",
        suggested_subcategory_id: null,
        suggested_subcategory: null,
        missing_required: [],
        missing_recommended: ["Where the problem happened", "What would count as resolution"],
        optional_suggestions: [],
        confidence: 0.82,
      },
    };

    const corrected = correctInterpretedProblem(draft, {
      issue: "Outstanding pension payment after account migration",
      structured_summary: "Citizen says the migration left the pension unpaid.",
      requested_outcome: "Credit the outstanding pension.",
      detected_location: "Pune",
      detected_identifiers: ["PPO-1234"],
    });

    expect(corrected.problem).toBe(original);
    expect(corrected.categoryId).toBe("pension-delay");
    expect(corrected.interpretation).toMatchObject({
      issue: "Outstanding pension payment after account migration",
      structured_summary: "Citizen says the migration left the pension unpaid.",
    });
    expect(corrected).toMatchObject({
      requestedOutcome: "Credit the outstanding pension.",
      location: "Pune",
      identifiers: ["PPO-1234"],
    });
    expect(corrected.interpretation?.missing_recommended).toEqual([]);
  });

  test("restores fields and exact wizard step after a remount or refresh", () => {
    const draft = advanceNewGrievanceDraft(
      {
        ...createNewGrievanceDraft(),
        problem: "A streetlight has been dark for twelve days.",
        requestedOutcome: "Repair the light.",
        categoryId: "streetlight",
        organizationId: "pune-municipal",
      },
      5,
    );
    expect(restoreNewGrievanceDraft(JSON.stringify(draft))).toMatchObject({
      problem: draft.problem,
      requestedOutcome: draft.requestedOutcome,
      currentStep: 5,
      categoryId: "streetlight",
      organizationId: "pune-municipal",
    });
  });

  test("uses a distinct storage key for every authenticated citizen", () => {
    expect(newGrievanceDraftKey("citizen-a")).not.toBe(newGrievanceDraftKey("citizen-b"));
  });

  test("migrates an existing v1 draft safely to the durable v2 model", () => {
    const oldDraft = {
      ...createNewGrievanceDraft(),
      version: 1,
      currentStep: undefined,
      problem: "Existing saved text",
    };
    expect(restoreNewGrievanceDraft(JSON.stringify(oldDraft))).toMatchObject({
      version: 2,
      problem: "Existing saved text",
      currentStep: 1,
    });
  });
});
