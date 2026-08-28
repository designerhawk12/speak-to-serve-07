import { describe, expect, test } from "bun:test";
import {
  advanceNewGrievanceDraft,
  applyIntakeInterpretation,
  confirmManualDestination,
  correctInterpretedProblem,
  createNewGrievanceDraft,
  newGrievanceDraftKey,
  restoreNewGrievanceDraft,
} from "../src/lib/cpgrams/grievance-draft";

describe("new grievance draft", () => {
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
        original_language: "en",
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
        route_confidence: 0.82,
        route_explanation: "Matched to the active pension taxonomy.",
        intake_type: "ACTIONABLE_GRIEVANCE" as const,
        eligibility_guidance: null,
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

  test("migrates an existing v1 draft safely to the durable v3 model", () => {
    const oldDraft = {
      ...createNewGrievanceDraft(),
      version: 1,
      currentStep: undefined,
      problem: "Existing saved text",
    };
    expect(restoreNewGrievanceDraft(JSON.stringify(oldDraft))).toMatchObject({
      version: 3,
      problem: "Existing saved text",
      currentStep: 1,
    });
  });

  test("AI unavailability preserves text and forces the existing manual taxonomy UI", () => {
    const original = "My pension has not arrived for three months.";
    const interpretation = {
      original_language: "en",
      issue: "Pension payment delay",
      structured_summary: original,
      requested_outcome: "Receive the pending pension payment.",
      detected_location: null,
      detected_identifiers: [],
      suggested_government_level: "central_department",
      suggested_organization_id: "pension-office",
      suggested_organization: "Pension Office",
      suggested_category_id: "pension",
      suggested_category: "Pension services",
      suggested_subcategory_id: "pension-delay",
      suggested_subcategory: "Pension payment delay",
      missing_required: [],
      missing_recommended: ["Add a PPO/reference number if available."],
      optional_suggestions: [],
      route_confidence: 0.6,
      route_explanation: "Local fallback cue match.",
      intake_type: "ACTIONABLE_GRIEVANCE" as const,
      eligibility_guidance: null,
    };
    const applied = applyIntakeInterpretation(
      { ...createNewGrievanceDraft(), problem: original },
      interpretation,
      { categoryId: "pension-delay", organizationId: "pension-office", acceptance: "manual" },
    );
    expect(applied.problem).toBe(original);
    expect(applied).toMatchObject({
      manualTaxonomy: true,
      routingAssistance: "manual_fallback",
      destinationConfirmed: false,
      requestedOutcome: "Receive the pending pension payment.",
    });
  });

  test("valid AI suggestions remain advisory and do not replace a manual draft route", () => {
    const original =
      "The streetlight outside House 74 in Kothrud, Pune has not worked for three months.";
    const interpretation = {
      original_language: "en",
      issue: "Streetlight not working",
      structured_summary: "The streetlight outside House 74 is not working.",
      requested_outcome: "Repair the streetlight and restore lighting.",
      detected_location: "Kothrud, Pune",
      detected_identifiers: ["House 74"],
      suggested_government_level: "local",
      suggested_organization_id: "pune-municipal",
      suggested_organization: "Pune municipal office",
      suggested_category_id: "streetlight-root",
      suggested_category: "Street lighting",
      suggested_subcategory_id: "streetlight-repair",
      suggested_subcategory: "Streetlight repair",
      missing_required: [],
      missing_recommended: [],
      optional_suggestions: [],
      route_confidence: 0.92,
      route_explanation: "Matched to the active streetlight route.",
      intake_type: "ACTIONABLE_GRIEVANCE" as const,
      eligibility_guidance: null,
    };
    const applied = applyIntakeInterpretation(
      {
        ...createNewGrievanceDraft(),
        problem: original,
        manualTaxonomy: true,
        categoryId: null,
        organizationId: null,
      },
      interpretation,
      {
        categoryId: "streetlight-repair",
        organizationId: "pune-municipal",
        acceptance: "resolved",
      },
    );

    expect(applied).toMatchObject({
      categoryId: null,
      organizationId: null,
      manualTaxonomy: true,
      routingAssistance: "ai_review",
      destinationConfirmed: false,
    });
    expect(applied.interpretation?.suggested_subcategory).toBe("Streetlight repair");
  });

  test("a valid parent-category suggestion preserves the citizen's manual selection state", () => {
    const applied = applyIntakeInterpretation(
      createNewGrievanceDraft(),
      {
        original_language: "en",
        issue: "Streetlight not working",
        structured_summary: "A streetlight is not working.",
        requested_outcome: "Repair the streetlight.",
        detected_location: null,
        detected_identifiers: [],
        suggested_government_level: "local",
        suggested_organization_id: "pune-municipal",
        suggested_organization: "Pune municipal office",
        suggested_category_id: "streetlight",
        suggested_category: "Street lighting",
        suggested_subcategory_id: null,
        suggested_subcategory: null,
        missing_required: [],
        missing_recommended: ["Where the problem happened"],
        optional_suggestions: [],
        route_confidence: 0.84,
        route_explanation: "Matched to an active category.",
        intake_type: "ACTIONABLE_GRIEVANCE",
        eligibility_guidance: null,
      },
      {
        categoryId: "streetlight",
        organizationId: "pune-municipal",
        acceptance: "resolved",
      },
    );
    expect(applied.categoryId).toBeNull();
    expect(applied.organizationId).toBeNull();
    expect(applied.manualTaxonomy).toBe(true);
    expect(applied.interpretation?.suggested_category).toBe("Street lighting");
    expect(applied.location).toBe("");
  });

  test("Change makes the citizen's manual route authoritative", () => {
    const manuallyChanged = {
      ...createNewGrievanceDraft(),
      categoryId: "citizen-category",
      organizationId: "citizen-organization",
      manualTaxonomy: true,
      routingAssistance: "ai_resolved" as const,
    };
    const confirmed = confirmManualDestination(manuallyChanged);
    expect(confirmed).toMatchObject({
      categoryId: "citizen-category",
      organizationId: "citizen-organization",
      manualTaxonomy: true,
      destinationConfirmed: true,
      currentStep: 6,
    });
  });
});
