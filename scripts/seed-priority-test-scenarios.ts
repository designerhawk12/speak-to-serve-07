import { createClient } from "@supabase/supabase-js";
import {
  PRIORITY_TEST_SCENARIOS,
  hoursBefore,
  priorityFactsForScenario,
  priorityResultForScenario,
} from "../src/lib/cpgrams/priority-test-scenarios";

const CONFIRMATION_VALUE = "development";
const FIXTURE_PREFIX = "[TEST PRIORITY SCENARIO]";
const UUID_PREFIX = "91000000-0000-4000-8000-";

function fixtureId(index: number) {
  return `${UUID_PREFIX}${index.toString().padStart(12, "0")}`;
}

function fail(error: { message: string } | null, context: string): asserts error is null {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function parseSnapshot() {
  const argument = process.argv.find((value) => value.startsWith("--at="));
  const raw = argument?.slice("--at=".length) ?? process.env.PRIORITY_TEST_SCENARIOS_AT;
  const snapshot = raw ? new Date(raw) : new Date();
  if (Number.isNaN(snapshot.getTime())) {
    throw new Error("Use an ISO timestamp for --at=<timestamp> or PRIORITY_TEST_SCENARIOS_AT.");
  }
  return snapshot;
}

function assertDevelopmentOnly() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.PRIORITY_TEST_SCENARIOS_CONFIRM !== CONFIRMATION_VALUE ||
    process.env.PRIORITY_TEST_SCENARIOS_TARGET !== "development"
  ) {
    throw new Error(
      "Priority test scenarios are development-only. Set PRIORITY_TEST_SCENARIOS_CONFIRM=development and PRIORITY_TEST_SCENARIOS_TARGET=development; never run this command against production.",
    );
  }
}

assertDevelopmentOnly();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const scenarioIds = PRIORITY_TEST_SCENARIOS.map((_, index) => fixtureId(index + 1));

async function deleteByGrievance(table: string) {
  const { error } = await admin.from(table).delete().in("grievance_id", scenarioIds);
  fail(error, `Unable to remove ${table} rows for priority scenarios`);
}

async function removeScenarios() {
  const { data: requests, error: requestQueryError } = await admin
    .from("document_requests")
    .select("id")
    .in("grievance_id", scenarioIds);
  fail(requestQueryError, "Unable to locate priority scenario document requests");
  const requestIds = (requests ?? []).map((request) => request.id);
  if (requestIds.length > 0) {
    const { error } = await admin
      .from("document_request_items")
      .delete()
      .in("request_id", requestIds);
    fail(error, "Unable to remove priority scenario checklist items");
  }

  await deleteByGrievance("notifications");
  await deleteByGrievance("feedback");
  await deleteByGrievance("resolutions");
  await deleteByGrievance("appeals");
  await deleteByGrievance("case_events");
  await deleteByGrievance("grievance_priorities");
  await deleteByGrievance("document_requests");

  const { error: grievanceError } = await admin.from("grievances").delete().in("id", scenarioIds);
  fail(grievanceError, "Unable to remove priority test scenarios");
}

if (process.argv.includes("--remove")) {
  await removeScenarios();
  console.log(
    `Removed ${PRIORITY_TEST_SCENARIOS.length} development-only priority test scenarios.`,
  );
  process.exit(0);
}

const now = parseSnapshot();
const { data: profiles, error: profileError } = await admin
  .from("profiles")
  .select("id, email, role, organization_id")
  .in("email", ["citizen@demo.cpgrams.in", "gro@demo.cpgrams.in", "nodal@demo.cpgrams.in"]);
fail(profileError, "Unable to load development demo profiles");

const citizen = profiles?.find(
  (profile) => profile.email === "citizen@demo.cpgrams.in" && profile.role === "citizen",
);
const gro = profiles?.find(
  (profile) => profile.email === "gro@demo.cpgrams.in" && profile.role === "gro",
);
if (!citizen || !gro?.organization_id) {
  throw new Error(
    "The citizen and GRO demo profiles must exist before priority scenarios can be generated.",
  );
}

await removeScenarios();

for (const [index, scenario] of PRIORITY_TEST_SCENARIOS.entries()) {
  const id = fixtureId(index + 1);
  const facts = priorityFactsForScenario(scenario, now);
  const result = priorityResultForScenario(scenario, now);
  const submittedAt = facts.submittedAt!;
  const isTerminal = Boolean(scenario.terminalGovernmentResponse);

  const { error: grievanceError } = await admin.from("grievances").insert({
    id,
    registration_number: `DEV-PRIORITY-${scenario.id}`,
    citizen_id: citizen.id,
    short_title: `${FIXTURE_PREFIX} ${scenario.id}: ${scenario.title}`,
    original_text: `Development-only deterministic priority scenario ${scenario.id}.`,
    requested_outcome: "Verify the configured deterministic priority result.",
    organization_id: gro.organization_id,
    assigned_officer_id: gro.id,
    administrative_state: isTerminal ? "RESOLUTION_PROVIDED" : "ASSIGNED",
    outcome_state: isTerminal ? "RESOLVED" : "UNKNOWN",
    citizen_confirmation_state: isTerminal ? "CONFIRMED_RESOLVED" : "NOT_REQUESTED",
    submitted_at: submittedAt.toISOString(),
    sla_due_at: facts.slaDueAt?.toISOString(),
    government_response_completed_at: isTerminal ? hoursBefore(now, 2_400).toISOString() : null,
  });
  fail(grievanceError, `Unable to seed ${scenario.id}`);

  const { error: priorityError } = await admin.from("grievance_priorities").upsert(
    {
      grievance_id: id,
      priority_score: result.score,
      priority_level: result.level,
      priority_reasons: result.reasons,
      assignment_started_at: facts.assignmentStartedAt?.toISOString() ?? null,
      first_opened_at: facts.openedAt?.toISOString() ?? null,
      last_meaningful_government_action_at:
        facts.lastMeaningfulGovernmentActionAt?.toISOString() ?? null,
      escalation_level: result.escalationLevel,
      next_escalation_at: result.nextEscalationAt?.toISOString() ?? null,
      waiting_on_citizen: facts.waitingOnCitizen,
      evaluated_at: now.toISOString(),
    },
    { onConflict: "grievance_id" },
  );
  fail(priorityError, `Unable to seed priority state for ${scenario.id}`);

  if (facts.openedAt) {
    const { error } = await admin.from("case_events").insert({
      id: fixtureId(1_000 + index),
      grievance_id: id,
      event_type: "CASE_OPENED",
      actor_type: "officer",
      actor_id: gro.id,
      organization_id: gro.organization_id,
      title: "Development-only case opened",
      citizen_visible: false,
      created_at: facts.openedAt.toISOString(),
    });
    fail(error, `Unable to seed ${scenario.id} opened event`);
  }

  if (facts.lastMeaningfulGovernmentActionAt) {
    const { error } = await admin.from("case_events").insert({
      id: fixtureId(2_000 + index),
      grievance_id: id,
      event_type: "INTERIM_UPDATE_ADDED",
      actor_type: "officer",
      actor_id: gro.id,
      organization_id: gro.organization_id,
      title: "Development-only meaningful government action",
      citizen_visible: false,
      created_at: facts.lastMeaningfulGovernmentActionAt.toISOString(),
    });
    fail(error, `Unable to seed ${scenario.id} government action`);
  }

  for (const [reminderIndex, reminderHoursAgo] of (scenario.reminderHoursAgo ?? []).entries()) {
    const { error } = await admin.from("case_events").insert({
      id: fixtureId(3_000 + index * 100 + reminderIndex),
      grievance_id: id,
      event_type: "CITIZEN_REMINDER_SENT",
      actor_type: "citizen",
      actor_id: citizen.id,
      title: "Development-only citizen reminder",
      citizen_visible: true,
      created_at: hoursBefore(now, reminderHoursAgo).toISOString(),
    });
    fail(error, `Unable to seed ${scenario.id} reminder`);
  }

  if (scenario.waitingOnCitizen) {
    const requestId = fixtureId(4_000 + index);
    const { error: requestError } = await admin.from("document_requests").insert({
      id: requestId,
      grievance_id: id,
      requested_by: gro.id,
      organization_id: gro.organization_id,
      reason:
        "Development-only required document; government inactivity is paused until the citizen responds.",
      created_at: hoursBefore(now, 168).toISOString(),
    });
    fail(requestError, `Unable to seed ${scenario.id} document request`);
    const { error: itemError } = await admin.from("document_request_items").insert({
      id: fixtureId(5_000 + index),
      request_id: requestId,
      label: "Development-only required document",
      is_required: true,
      document_id: null,
    });
    fail(itemError, `Unable to seed ${scenario.id} required document item`);
  }

  if (isTerminal) {
    const { error } = await admin.from("resolutions").insert({
      id: fixtureId(6_000 + index),
      grievance_id: id,
      authored_by: gro.id,
      organization_id: gro.organization_id,
      action_taken: "Development-only historical resolution.",
      outcome_claimed: "RESOLUTION_PROPOSED",
      outcome_achieved: "Historical scenario resolved.",
      is_interim: false,
      created_at: hoursBefore(now, 2_400).toISOString(),
    });
    fail(error, `Unable to seed ${scenario.id} historical resolution`);
  }
}

console.log(
  `Seeded ${PRIORITY_TEST_SCENARIOS.length} development-only priority scenarios at ${now.toISOString()}. ` +
    "The displayed priority snapshot is calculated from the same deterministic rule contract; the scheduled database evaluator will recalculate the stored facts without waiting days.",
);
