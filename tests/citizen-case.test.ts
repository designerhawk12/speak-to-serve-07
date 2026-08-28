import { describe, expect, test } from "bun:test";
import { getCitizenActionState, matchesCitizenDashboardFilter, requiredDocumentProgress } from "../src/lib/cpgrams/citizen-case";
import type { AppealRow, ClarificationRequestRow, DocumentRequestItemRow, DocumentRequestRow, GrievanceRow } from "../src/lib/cpgrams/data-access";

const pension = {
  id: "pension-case",
  administrative_state: "CLARIFICATION_REQUIRED",
  outcome_state: "UNRESOLVED",
  citizen_confirmation_state: "NOT_REQUESTED",
} as GrievanceRow;

const streetlight = {
  id: "streetlight-case",
  administrative_state: "RESOLUTION_PROVIDED",
  outcome_state: "RESOLUTION_PROPOSED",
  citizen_confirmation_state: "AWAITING_CONFIRMATION",
} as GrievanceRow;

const openRequest = { id: "request", grievance_id: pension.id, fulfilled_at: null } as DocumentRequestRow;
const missingRequiredItem = { id: "item", request_id: openRequest.id, is_required: true, document_id: null } as DocumentRequestItemRow;

describe("deterministic citizen case states", () => {
  test("puts the Pension golden scenario in document upload state", () => {
    expect(getCitizenActionState(pension, [openRequest], [missingRequiredItem], []).state).toBe("upload_documents");
    expect(requiredDocumentProgress([missingRequiredItem])).toEqual({ required: 1, supplied: 0 });
  });

  test("puts the Streetlight golden scenario in resolution review state", () => {
    expect(getCitizenActionState(streetlight, [], [], []).state).toBe("review_government_resolution");
  });

  test("derives clarification only from an unresolved request for that grievance", () => {
    const caseA = { ...pension, id: "case-a" };
    const caseB = { ...pension, id: "case-b" };
    const clarification = { id: "clarification-a", grievance_id: caseA.id, fulfilled_at: null, question: "Provide the payment reference" } as ClarificationRequestRow;
    expect(getCitizenActionState(caseA, [], [], [], [clarification]).state).toBe("answer_clarification");
    expect(getCitizenActionState(caseB, [], [], [], []).state).toBe("no_action_required");
    expect(getCitizenActionState(caseA, [], [], [], [{ ...clarification, fulfilled_at: "2026-08-27T10:00:00Z" }]).state).toBe("no_action_required");
  });

  test("keeps closed and appealed dashboard filters independent", () => {
    const appeal = { id: "appeal", grievance_id: streetlight.id, state: "UNDER_REVIEW" } as AppealRow;
    const action = getCitizenActionState(streetlight, [], [], [appeal]);
    expect(matchesCitizenDashboardFilter("appealed", streetlight, action, [appeal])).toBe(true);
    expect(matchesCitizenDashboardFilter("closed", streetlight, action, [appeal])).toBe(false);
  });
});
