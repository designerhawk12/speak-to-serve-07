import { describe, expect, test } from "bun:test";
import {
  toAdminStatus,
  toCitizenOutcome,
  toGrievanceSummary,
  toTimelineEvent,
  toTimelineEventForViewer,
} from "../src/lib/cpgrams/data-adapters";
import type {
  CaseEventRow,
  DocumentRequestRow,
  GrievanceRow,
} from "../src/lib/cpgrams/data-access";

const streetlight = {
  id: "73788a69-4ab7-4eec-aa56-4d533c335e31",
  registration_number: "CPG-2026-STREETLT",
  short_title: "Streetlight dark for three weeks in Kothrud lane",
  original_text: "The original citizen description.",
  administrative_state: "RESOLUTION_PROVIDED",
  outcome_state: "RESOLUTION_PROPOSED",
  citizen_confirmation_state: "AWAITING_CONFIRMATION",
  submitted_at: "2026-08-13T00:00:00.000Z",
  created_at: "2026-08-13T00:00:00.000Z",
  updated_at: "2026-08-20T00:00:00.000Z",
  government_response_completed_at: "2026-08-20T00:00:00.000Z",
  sla_due_at: "2026-08-28T00:00:00.000Z",
  organization_id: "organization-id",
} as GrievanceRow;

describe("Supabase row adapters", () => {
  test("keeps administrative and citizen-confirmation states in separate UI lanes", () => {
    expect(toAdminStatus("RESOLUTION_PROVIDED")).toBe("action_taken");
    expect(toCitizenOutcome("AWAITING_CONFIRMATION")).toBe("not_reported");
  });

  test("preserves seeded grievance identity and original citizen text", () => {
    const summary = toGrievanceSummary(streetlight, "Pune Municipal Corporation");
    expect(summary.id).toBe(streetlight.id);
    expect(summary.registrationNumber).toBe("CPG-2026-STREETLT");
    expect(summary.shortTitle).toContain("Streetlight");
    expect(summary.originalText).toBe(streetlight.original_text);
  });

  test("uses an open database document request as the required action", () => {
    const request = {
      id: "request-id",
      grievance_id: streetlight.id,
      reason: "Please provide the pension payment order.",
      fulfilled_at: null,
    } as DocumentRequestRow;
    const summary = toGrievanceSummary(streetlight, undefined, [], [request]);
    expect(summary.actionRequired).toBe(request.reason);
  });

  test("stops the original SLA at the persisted government-response completion time", () => {
    const summary = toGrievanceSummary(streetlight, undefined);
    expect(summary.sla?.state).toBe("completed");
    expect(summary.sla?.label).toBe("Government processing ended after 7 days");
    expect(summary.sla?.dueLabel).toContain("Completed");
  });

  test("uses actor language for the current viewer persona", () => {
    const citizenEvent = {
      id: "event-1",
      grievance_id: streetlight.id,
      actor_type: "citizen",
      event_type: "CITIZEN_CONFIRMED_RESOLVED",
      title: "Citizen confirmed the issue is resolved",
      created_at: "2026-08-20T00:00:00.000Z",
    } as CaseEventRow;
    expect(toTimelineEvent(citizenEvent).actorLabel).toBe("You");
    expect(toTimelineEventForViewer(citizenEvent, "government").actorLabel).toBe("Citizen");
  });
});
