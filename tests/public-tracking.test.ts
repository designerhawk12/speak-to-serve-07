import { describe, expect, test } from "bun:test";
import {
  parsePublicAppealTracking,
  parsePublicGrievanceTracking,
} from "../src/lib/cpgrams/public-tracking";

describe("public tracking contracts", () => {
  test("accepts only the fixed safe grievance tracking fields", () => {
    const tracking = parsePublicGrievanceTracking({
      found: true,
      registration_number: "CPG-2026-ABCDEF0123456789",
      category: "Streetlight maintenance",
      administrative_stage: "With an office",
      organization_name: "Municipal Corporation",
      submitted_at: "2026-08-28T10:00:00Z",
      last_updated_at: "2026-08-28T11:00:00Z",
      milestones: [{ occurred_at: "2026-08-28T10:00:00Z", stage: "Grievance submitted" }],
      resolution_status: "No citizen outcome review is currently recorded",
      appeal_status: "No public appeal action is currently shown",
      citizen_id: "must-not-reach-ui",
      original_text: "private grievance text",
      requested_outcome: "private requested outcome",
      documents: [{ storage_path: "private/path" }],
      messages: [{ body: "private message" }],
    });

    expect(tracking).toEqual({
      registrationNumber: "CPG-2026-ABCDEF0123456789",
      category: "Streetlight maintenance",
      administrativeStage: "With an office",
      organizationName: "Municipal Corporation",
      submittedAt: "2026-08-28T10:00:00Z",
      lastUpdatedAt: "2026-08-28T11:00:00Z",
      milestones: [{ occurredAt: "2026-08-28T10:00:00Z", stage: "Grievance submitted" }],
      resolutionStatus: "No citizen outcome review is currently recorded",
      appealStatus: "No public appeal action is currently shown",
    });
  });

  test("treats invalid or generic-not-found grievance results identically", () => {
    expect(parsePublicGrievanceTracking({ found: false })).toBeNull();
    expect(parsePublicGrievanceTracking(null)).toBeNull();
  });

  test("accepts only safe appeal status and omits grounds, evidence, and decisions", () => {
    const tracking = parsePublicAppealTracking({
      found: true,
      reference_number: "APL-2026-ABCDEF0123456789",
      appeal_stage: "Appeal under review",
      appellate_organization_name: "Appellate Office",
      filed_at: "2026-08-28T10:00:00Z",
      last_updated_at: "2026-08-28T11:00:00Z",
      milestones: [{ occurred_at: "2026-08-28T10:00:00Z", stage: "Appeal filed" }],
      grounds: "private grounds",
      decision_summary: "private decision",
      documents: [{ file_name: "private.pdf" }],
    });

    expect(tracking).toEqual({
      referenceNumber: "APL-2026-ABCDEF0123456789",
      appealStage: "Appeal under review",
      appellateOrganizationName: "Appellate Office",
      filedAt: "2026-08-28T10:00:00Z",
      lastUpdatedAt: "2026-08-28T11:00:00Z",
      milestones: [{ occurredAt: "2026-08-28T10:00:00Z", stage: "Appeal filed" }],
    });
  });
});
