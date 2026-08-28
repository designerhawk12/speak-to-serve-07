import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { caseClosureAvailability } from "../src/lib/cpgrams/officer-case-closure";

const baseEligibility = {
  actorRole: "gro" as const,
  actorId: "assigned-gro",
  assignedOfficerId: "assigned-gro",
  administrativeState: "RESOLUTION_PROVIDED" as const,
  citizenConfirmationState: "CONFIRMED_RESOLVED" as const,
  hasFinalResolution: true,
};

describe("assigned GRO case-closure eligibility", () => {
  test("allows only the assigned GRO after citizen confirmation and a final resolution", () => {
    expect(caseClosureAvailability(baseEligibility).available).toBe(true);
    expect(
      caseClosureAvailability({ ...baseEligibility, assignedOfficerId: "another-gro" }).available,
    ).toBe(false);
    expect(caseClosureAvailability({ ...baseEligibility, actorRole: "nodal" }).available).toBe(
      false,
    );
  });

  test("keeps closure unavailable before citizen confirmation or a final resolution", () => {
    expect(
      caseClosureAvailability({
        ...baseEligibility,
        citizenConfirmationState: "AWAITING_CONFIRMATION",
      }),
    ).toEqual({
      available: false,
      message: "Close case becomes available after the citizen confirms the issue is resolved.",
    });
    expect(
      caseClosureAvailability({ ...baseEligibility, hasFinalResolution: false }).available,
    ).toBe(false);
  });

  test("accepts only the existing closable lifecycle states and reports closed history", () => {
    expect(
      caseClosureAvailability({ ...baseEligibility, administrativeState: "UNDER_EXAMINATION" })
        .available,
    ).toBe(false);
    expect(caseClosureAvailability({ ...baseEligibility, administrativeState: "CLOSED" })).toEqual({
      available: false,
      message: "This case is closed and remains available in case history.",
    });
  });
});

describe("case-closure database and UI contracts", () => {
  const migrationName = readdirSync(join(process.cwd(), "supabase", "migrations")).find((name) =>
    name.endsWith("_reviewer_assigned_gro_case_closure.sql"),
  );
  if (!migrationName) throw new Error("Assigned-GRO case-closure migration is missing.");
  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", migrationName),
    "utf8",
  );
  const actionsSource = readFileSync(
    join(process.cwd(), "src", "components", "cpgrams", "OfficerCaseActions.tsx"),
    "utf8",
  );
  const dataAccessSource = readFileSync(
    join(process.cwd(), "src", "lib", "cpgrams", "data-access.ts"),
    "utf8",
  );

  test("RPC is transactional, assignment-specific, idempotent, and least-privileged", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("private.current_role_of(v_user_id)");
    expect(migration).toContain("is distinct from 'gro'::public.app_role");
    expect(migration).toContain("v_grievance.assigned_officer_id is distinct from v_user_id");
    expect(migration).toContain("for update");
    expect(migration).toContain("citizen_confirmation_state <> 'CONFIRMED_RESOLVED'");
    expect(migration).toContain("and not r.is_interim");
    expect(migration).toContain("not in ('RESOLUTION_PROVIDED', 'DISPOSED')");
    expect(migration).toContain("administrative_state = 'CLOSED'");
    expect(migration).toContain("closed_at = statement_timestamp()");
    expect(migration).toContain("'CASE_CLOSED'");
    expect(migration).toContain("jsonb_build_object('resolution_id', v_resolution_id)");
    expect(migration).toContain(
      "revoke all on function public.officer_close_grievance(uuid) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.officer_close_grievance(uuid) to authenticated",
    );
    expect(migration).not.toContain("private.can_act_on_grievance(p_grievance_id)");
  });

  test("rendered action is GRO-specific and uses the typed RPC wrapper", () => {
    expect(actionsSource).toContain('actorRole === "gro" && assignedOfficerId === userId');
    expect(actionsSource).toContain('id: "close" as const');
    expect(actionsSource).toContain('id="case-closure-status"');
    expect(actionsSource).toContain("closeOfficerGrievance(grievanceId)");
    expect(dataAccessSource).toContain('supabase.rpc("officer_close_grievance"');
    expect(actionsSource).toContain("cpgramsQueryKeys.authorizedGrievancePages");
    expect(actionsSource).toContain("cpgramsQueryKeys.citizenGrievances(citizenId)");
  });
});
