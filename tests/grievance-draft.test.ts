import { describe, expect, test } from "bun:test";
import { advanceNewGrievanceDraft, confirmManualDestination, confirmSuggestedDestination, createNewGrievanceDraft, newGrievanceDraftKey, restoreNewGrievanceDraft } from "../src/lib/cpgrams/grievance-draft";

describe("new grievance draft", () => {
  test("Confirm commits real suggested IDs and advances to completion review", () => {
    const result = confirmSuggestedDestination(createNewGrievanceDraft(), { organizationId: "pune-municipal", categoryId: "streetlight" });
    expect(result).toMatchObject({ organizationId: "pune-municipal", categoryId: "streetlight", manualTaxonomy: false, destinationConfirmed: true, currentStep: 6 });
  });

  test("missing suggested IDs gives the route a validation signal instead of advancing", () => {
    expect(confirmSuggestedDestination(createNewGrievanceDraft(), { organizationId: null, categoryId: "streetlight" })).toBeNull();
  });

  test("manual change can be confirmed and advances without replacing the choice", () => {
    const draft = { ...createNewGrievanceDraft(), manualTaxonomy: true, organizationId: "other-office", categoryId: "other-category" };
    expect(confirmManualDestination(draft)).toMatchObject({ organizationId: "other-office", categoryId: "other-category", currentStep: 6, destinationConfirmed: true });
  });

  test("restores fields and exact wizard step after a remount or refresh", () => {
    const draft = advanceNewGrievanceDraft({ ...createNewGrievanceDraft(), problem: "A streetlight has been dark for twelve days.", requestedOutcome: "Repair the light.", categoryId: "streetlight", organizationId: "pune-municipal" }, 5);
    expect(restoreNewGrievanceDraft(JSON.stringify(draft))).toMatchObject({ problem: draft.problem, requestedOutcome: draft.requestedOutcome, currentStep: 5, categoryId: "streetlight", organizationId: "pune-municipal" });
  });

  test("uses a distinct storage key for every authenticated citizen", () => {
    expect(newGrievanceDraftKey("citizen-a")).not.toBe(newGrievanceDraftKey("citizen-b"));
  });

  test("migrates an existing v1 draft safely to the durable v2 model", () => {
    const oldDraft = { ...createNewGrievanceDraft(), version: 1, currentStep: undefined, problem: "Existing saved text" };
    expect(restoreNewGrievanceDraft(JSON.stringify(oldDraft))).toMatchObject({ version: 2, problem: "Existing saved text", currentStep: 1 });
  });
});
