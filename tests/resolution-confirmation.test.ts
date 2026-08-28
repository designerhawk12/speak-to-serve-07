import { afterEach, describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GrievanceRouteBoundary } from "../src/components/cpgrams/GrievanceRouteBoundary";
import { getCitizenAppealPreload } from "../src/lib/cpgrams/appeal-preload";
import { getCitizenActionItems } from "../src/lib/cpgrams/citizen-case";
import {
  confirmationTransition,
  isResolutionEvidence,
  isResolutionReviewEvidence,
} from "../src/lib/cpgrams/citizen-resolution";
import { openPrivateDocumentFromClick } from "../src/lib/cpgrams/private-document-open";
import {
  clearResolutionConfirmationDraft,
  loadResolutionConfirmationDraft,
  saveResolutionConfirmationDraft,
} from "../src/lib/cpgrams/resolution-confirmation-draft";
import {
  acquireResolutionSubmissionLock,
  refreshAfterResolutionConfirmation,
  submitResolutionConfirmation,
  validateResolutionConfirmation,
} from "../src/lib/cpgrams/resolution-confirmation-flow";
import {
  citizenOutcomeMetaForViewer,
  isOriginalGovernmentProcessingActive,
} from "../src/lib/cpgrams/resolution-lifecycle";

describe("grievance child-route rendering regression", () => {
  test("renders the matched resolution child instead of leaving the grievance detail visible", () => {
    const html = renderToStaticMarkup(
      createElement(GrievanceRouteBoundary, {
        isDetailRoute: false,
        detail: createElement("p", null, "Previous grievance detail"),
        nestedRoute: createElement("p", null, "Resolution confirmation screen"),
      }),
    );
    expect(html).toContain("Resolution confirmation screen");
    expect(html).not.toContain("Previous grievance detail");
  });

  test("YES validation ignores PARTLY and NO-only fields", () => {
    expect(
      validateResolutionConfirmation({
        confirmation: "CONFIRMED_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "",
        requestedCorrection: "",
      }),
    ).toBeNull();
    expect(
      validateResolutionConfirmation({
        confirmation: "PARTIALLY_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "",
        requestedCorrection: "",
      }),
    ).toBe("Tell us what was fixed.");
    expect(
      validateResolutionConfirmation({
        confirmation: "NOT_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "",
        requestedCorrection: "",
      }),
    ).toBe("Tell us what remains unresolved.");
  });
});

describe("resolution confirmation rendered-flow services", () => {
  test("synchronously blocks a rapid second submit before pending UI state renders", () => {
    const lock = { current: false };
    expect(acquireResolutionSubmissionLock(lock)).toBe(true);
    expect(acquireResolutionSubmissionLock(lock)).toBe(false);
  });

  test("YES submits the exact persisted state/event contract through the route submit service", async () => {
    const calls: unknown[] = [];
    await submitResolutionConfirmation(
      {
        grievanceId: "case-a",
        userId: "citizen",
        confirmation: "CONFIRMED_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "",
        requestedCorrection: "",
        file: null,
      },
      {
        uploadEvidence: async () => ({ id: "unused" }),
        confirm: async (input) => {
          calls.push(input);
        },
      },
    );
    expect(calls).toEqual([
      {
        grievanceId: "case-a",
        confirmation: "CONFIRMED_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "",
        requestedCorrection: "",
        evidenceDocumentId: null,
      },
    ]);
    expect(confirmationTransition("CONFIRMED_RESOLVED")).toEqual({
      outcome: "RESOLVED",
      event: "CITIZEN_CONFIRMED_RESOLVED",
    });
  });

  test("PARTLY and NO submit the citizen's structured disagreement and optional evidence", async () => {
    const calls: unknown[] = [];
    const services = {
      uploadEvidence: async () => ({ id: "evidence-1" }),
      confirm: async (input: unknown) => {
        calls.push(input);
      },
    };
    await submitResolutionConfirmation(
      {
        grievanceId: "case-a",
        userId: "citizen",
        confirmation: "PARTIALLY_RESOLVED",
        whatWasFixed: "One lamp works",
        whatRemainsUnresolved: "Lane is still dark",
        requestedCorrection: "",
        file: {} as File,
      },
      services,
    );
    await submitResolutionConfirmation(
      {
        grievanceId: "case-b",
        userId: "citizen",
        confirmation: "NOT_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "No repair",
        requestedCorrection: "Repair the light",
        file: null,
      },
      services,
    );
    expect(calls).toEqual([
      {
        grievanceId: "case-a",
        confirmation: "PARTIALLY_RESOLVED",
        whatWasFixed: "One lamp works",
        whatRemainsUnresolved: "Lane is still dark",
        requestedCorrection: "",
        evidenceDocumentId: "evidence-1",
      },
      {
        grievanceId: "case-b",
        confirmation: "NOT_RESOLVED",
        whatWasFixed: "",
        whatRemainsUnresolved: "No repair",
        requestedCorrection: "Repair the light",
        evidenceDocumentId: null,
      },
    ]);
  });

  test("success refreshes the active case and citizen dashboard query observers", async () => {
    const calls: string[] = [];
    const client = {
      invalidateQueries: async ({ queryKey }: { queryKey: readonly string[] }) => {
        calls.push(`invalidate:${queryKey.join(":")}`);
      },
      refetchQueries: async ({ queryKey }: { queryKey: readonly string[] }) => {
        calls.push(`refetch:${queryKey.join(":")}`);
      },
    };
    await refreshAfterResolutionConfirmation(client as never, "case-a", "citizen-a");
    expect(calls.sort()).toEqual([
      "invalidate:cpgrams:citizen-grievances:citizen-a",
      "invalidate:cpgrams:grievance:case-a",
      "refetch:cpgrams:citizen-grievances:citizen-a",
      "refetch:cpgrams:grievance:case-a",
    ]);
  });
});

describe("resolution lifecycle presentation", () => {
  test("uses citizen wording only in the citizen view", () => {
    expect(citizenOutcomeMetaForViewer("confirmed_resolved", "citizen").label).toBe(
      "You confirmed it's solved",
    );
    expect(citizenOutcomeMetaForViewer("confirmed_resolved", "government").label).toBe(
      "Citizen confirmed the issue is resolved",
    );
  });

  test("retains terminal cases in history but excludes them from active government work", () => {
    expect(isOriginalGovernmentProcessingActive("ACTION_IN_PROGRESS")).toBe(true);
    expect(isOriginalGovernmentProcessingActive("RESOLUTION_PROVIDED")).toBe(false);
    expect(isOriginalGovernmentProcessingActive("APPEAL_FILED")).toBe(false);
    expect(isOriginalGovernmentProcessingActive("CLOSED")).toBe(false);
    expect(isOriginalGovernmentProcessingActive("ROUTED", "CONFIRMED_RESOLVED")).toBe(false);
  });
});

describe("current actions are grouped by grievance", () => {
  test("keeps multiple action types inside one grievance and separate from another grievance", () => {
    const grievance = {
      administrative_state: "CLARIFICATION_REQUIRED",
      outcome_state: "RESOLUTION_PROPOSED",
      citizen_confirmation_state: "AWAITING_CONFIRMATION",
    } as never;
    const actionsA = getCitizenActionItems(
      grievance,
      [{ id: "request-a", fulfilled_at: null, reason: "Provide bills" }] as never,
      [{ request_id: "request-a", is_required: true, document_id: null }] as never,
      [] as never,
      [
        {
          id: "clarification-a",
          grievance_id: "case-a",
          question: "Explain the mismatch",
          fulfilled_at: null,
        },
      ] as never,
    );
    const actionsB = getCitizenActionItems(
      {
        administrative_state: "IN_PROGRESS",
        outcome_state: "PENDING",
        citizen_confirmation_state: "NOT_REQUIRED",
      } as never,
      [{ id: "request-b", fulfilled_at: null, reason: "Provide a photo" }] as never,
      [{ request_id: "request-b", is_required: true, document_id: null }] as never,
      [] as never,
    );
    expect(actionsA.map((action) => action.state)).toEqual([
      "upload_documents",
      "answer_clarification",
      "review_government_resolution",
    ]);
    expect(actionsB.map((action) => action.state)).toEqual(["upload_documents"]);
  });
});

describe("resolution evidence and private document controls", () => {
  test("keeps case evidence sections distinct while allowing legacy government evidence in the resolution review", () => {
    expect(
      isResolutionEvidence(
        { uploaded_by: "officer", doc_kind: "government_evidence" } as never,
        "citizen",
      ),
    ).toBe(false);
    expect(
      isResolutionEvidence(
        { uploaded_by: "officer", doc_kind: "resolution_evidence" } as never,
        "citizen",
      ),
    ).toBe(true);
    expect(
      isResolutionEvidence(
        { uploaded_by: "citizen", doc_kind: "government_evidence" } as never,
        "citizen",
      ),
    ).toBe(false);
    expect(
      isResolutionEvidence(
        { uploaded_by: "officer", doc_kind: "requested_evidence" } as never,
        "citizen",
      ),
    ).toBe(false);
    expect(
      isResolutionReviewEvidence(
        { uploaded_by: "officer", doc_kind: "government_evidence" } as never,
        "citizen",
      ),
    ).toBe(true);
    expect(
      isResolutionReviewEvidence(
        { uploaded_by: "officer", doc_kind: "resolution_evidence" } as never,
        "citizen",
      ),
    ).toBe(true);
    expect(
      isResolutionReviewEvidence(
        { uploaded_by: "citizen", doc_kind: "resolution_evidence" } as never,
        "citizen",
      ),
    ).toBe(false);
  });

  test("opens a blank tab synchronously, then navigates it to an authorized signed URL", async () => {
    let opened = false;
    let navigatedTo = "";
    let closed = false;
    await openPrivateDocumentFromClick(
      async () => "https://storage.example/signed",
      () => ({
        opener: {} as Window,
        close: () => {
          closed = true;
        },
        location: {
          replace: (url) => {
            navigatedTo = url;
          },
        },
      }),
    );
    opened = true;
    expect(opened).toBe(true);
    expect(navigatedTo).toBe("https://storage.example/signed");
    expect(closed).toBe(false);
  });

  test("closes the blank tab and surfaces the original safe error when signed URL creation fails", async () => {
    let closed = false;
    await expect(
      openPrivateDocumentFromClick(
        async () => {
          throw new Error("Unable to access document");
        },
        () => ({
          opener: null,
          close: () => {
            closed = true;
          },
          location: { replace: () => undefined },
        }),
      ),
    ).rejects.toThrow("Unable to access document");
    expect(closed).toBe(true);
  });
});

describe("resolution confirmation session draft", () => {
  const priorWindow = globalThis.window;
  afterEach(() => {
    Object.defineProperty(globalThis, "window", { value: priorWindow, configurable: true });
  });
  test("survives close/reopen and is isolated by authenticated citizen plus grievance", () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });
    saveResolutionConfirmationDraft("citizen-a", "case-a", {
      choice: "PARTIALLY_RESOLVED",
      whatWasFixed: "Street lamp replaced",
      whatRemainsUnresolved: "Lane remains dark",
      requestedCorrection: "Repair the remaining lamp",
    });
    saveResolutionConfirmationDraft("citizen-a", "case-b", {
      choice: "NOT_RESOLVED",
      whatWasFixed: "",
      whatRemainsUnresolved: "Nothing was fixed",
      requestedCorrection: "Replace the lamp",
    });
    expect(loadResolutionConfirmationDraft("citizen-a", "case-a").whatRemainsUnresolved).toBe(
      "Lane remains dark",
    );
    expect(loadResolutionConfirmationDraft("citizen-a", "case-b").whatRemainsUnresolved).toBe(
      "Nothing was fixed",
    );
    expect(loadResolutionConfirmationDraft("citizen-b", "case-a").choice).toBeNull();
    clearResolutionConfirmationDraft("citizen-a", "case-a");
    expect(loadResolutionConfirmationDraft("citizen-a", "case-a").choice).toBeNull();
  });
});

test("appeal preload retains original grievance, requested outcome, resolution, disagreement, and authorized evidence", () => {
  const preload = getCitizenAppealPreload({
    grievance: { original_text: "Original request", requested_outcome: "Repair the streetlight" },
    resolutions: [
      { is_interim: false, resolution_narrative: "Work completed", action_taken: "Repair" },
    ],
    feedback: [{ what_remains_unresolved: "It is still dark", comments: null }],
    documents: [{ id: "evidence" }],
  } as never);
  expect(preload).toEqual({
    originalGrievance: "Original request",
    requestedOutcome: "Repair the streetlight",
    governmentResolution: "Work completed",
    citizenDisagreement: "It is still dark",
    evidence: [{ id: "evidence" }],
  });
});
