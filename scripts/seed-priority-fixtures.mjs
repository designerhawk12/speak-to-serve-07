import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production" || process.env.PRIORITY_FIXTURES_CONFIRM !== "development") {
  throw new Error("Priority fixtures are development-only. Set PRIORITY_FIXTURES_CONFIRM=development and do not run in production.");
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const FIXTURE_PREFIX = "[TEST PRIORITY]";
const BASE = "90000000-0000-4000-8000-";
const fixtureId = (suffix) => `${BASE}${suffix.toString().padStart(12, "0")}`;
const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 3_600_000).toISOString();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString();

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

const { data: profiles, error: profileError } = await admin
  .from("profiles")
  .select("id, email, organization_id")
  .in("email", ["citizen@demo.cpgrams.in", "gro@demo.cpgrams.in"]);
fail(profileError, "Unable to load demo profiles");
const citizen = profiles?.find((profile) => profile.email === "citizen@demo.cpgrams.in");
const gro = profiles?.find((profile) => profile.email === "gro@demo.cpgrams.in");
if (!citizen || !gro?.organization_id) throw new Error("The citizen and GRO demo profiles must exist before seeding priority fixtures.");

const { data: appellateOffice, error: appellateError } = await admin
  .from("organizations")
  .select("id")
  .eq("code", "APPEAL-URBAN")
  .maybeSingle();
fail(appellateError, "Unable to load the demo appellate office");
if (!appellateOffice) throw new Error("The APPEAL-URBAN organization must exist before seeding priority fixtures.");

const fixtures = [
  { key: "UNOPENED-25H", title: `${FIXTURE_PREFIX} Assigned >24h`, submittedHours: 96, slaHours: 720, assignmentHours: 25 },
  { key: "UNOPENED-49H", title: `${FIXTURE_PREFIX} Assigned >48h`, submittedHours: 120, slaHours: 720, assignmentHours: 49 },
  { key: "STALLED-4D", title: `${FIXTURE_PREFIX} No government action >3d`, submittedHours: 144, slaHours: 720, openedHours: 96 },
  { key: "STALLED-8D", title: `${FIXTURE_PREFIX} No government action >7d`, submittedHours: 240, slaHours: 720, openedHours: 192 },
  { key: "SLA-75", title: `${FIXTURE_PREFIX} SLA >75%`, submittedHours: 180, slaHours: 240 },
  { key: "SLA-BREACH", title: `${FIXTURE_PREFIX} SLA breached`, submittedHours: 264, slaHours: 240 },
  { key: "WAIT-CITIZEN", title: `${FIXTURE_PREFIX} Waiting on required citizen document`, submittedHours: 240, slaHours: 720, openedHours: 192, waiting: true },
  { key: "REMINDER-CAP", title: `${FIXTURE_PREFIX} Reminder contribution capped`, submittedHours: 48, slaHours: 720, reminders: 8 },
  { key: "RELATED", title: `${FIXTURE_PREFIX} Repeated related issue`, submittedHours: 48, slaHours: 720, related: true },
  { key: "APPEAL", title: `${FIXTURE_PREFIX} Active appeal review`, submittedHours: 48, slaHours: 720, appeal: true },
  { key: "RELATED-PEER", title: `${FIXTURE_PREFIX} Related issue peer`, submittedHours: 48, slaHours: 720 },
];

for (const [index, fixture] of fixtures.entries()) {
  const id = fixtureId(index + 1);
  const submittedAt = hoursAgo(fixture.submittedHours);
  const grievance = {
    id,
    registration_number: `DEV-PRIORITY-${fixture.key}`,
    citizen_id: citizen.id,
    short_title: fixture.title,
    original_text: `Development-only deterministic priority fixture: ${fixture.key}.`,
    requested_outcome: "Verify deterministic priority evaluation.",
    organization_id: gro.organization_id,
    assigned_officer_id: gro.id,
    appellate_organization_id: appellateOffice.id,
    administrative_state: fixture.waiting ? "CLARIFICATION_REQUIRED" : "ASSIGNED",
    outcome_state: "UNRESOLVED",
    citizen_confirmation_state: "NOT_REQUESTED",
    submitted_at: submittedAt,
    sla_due_at: new Date(new Date(submittedAt).getTime() + fixture.slaHours * 3_600_000).toISOString(),
  };
  const { error: grievanceError } = await admin.from("grievances").upsert(grievance, { onConflict: "id" });
  fail(grievanceError, `Unable to seed ${fixture.key}`);

  const priority = {
    grievance_id: id,
    priority_score: 0,
    priority_level: "NORMAL",
    priority_reasons: [],
    assignment_started_at: fixture.assignmentHours ? hoursAgo(fixture.assignmentHours) : null,
    first_opened_at: fixture.openedHours ? hoursAgo(fixture.openedHours) : null,
    last_meaningful_government_action_at: null,
    escalation_level: 0,
    next_escalation_at: null,
    waiting_on_citizen: Boolean(fixture.waiting),
    evaluated_at: now.toISOString(),
  };
  const { error: priorityError } = await admin.from("grievance_priorities").upsert(priority, { onConflict: "grievance_id" });
  fail(priorityError, `Unable to seed priority state for ${fixture.key}`);

  if (fixture.waiting) {
    const requestId = fixtureId(100 + index);
    const itemId = fixtureId(200 + index);
    const { error: requestError } = await admin.from("document_requests").upsert({ id: requestId, grievance_id: id, requested_by: gro.id, organization_id: gro.organization_id, reason: "Development-only required document fixture." }, { onConflict: "id" });
    fail(requestError, "Unable to seed waiting-on-citizen request");
    const { error: itemError } = await admin.from("document_request_items").upsert({ id: itemId, request_id: requestId, label: "Development fixture document", is_required: true, document_id: null }, { onConflict: "id" });
    fail(itemError, "Unable to seed waiting-on-citizen checklist item");
  }

  for (let reminder = 0; reminder < (fixture.reminders ?? 0); reminder += 1) {
    const { error: reminderError } = await admin.from("case_events").upsert({
      id: fixtureId(300 + index * 10 + reminder), grievance_id: id, event_type: "CITIZEN_REMINDER_SENT",
      actor_type: "citizen", actor_id: citizen.id, title: "Development-only citizen reminder", citizen_visible: true,
      created_at: hoursAgo(reminder + 1),
    }, { onConflict: "id" });
    fail(reminderError, "Unable to seed reminder event");
  }

  if (fixture.appeal) {
    const { error: appealError } = await admin.from("appeals").upsert({
      id: fixtureId(400 + index), grievance_id: id, citizen_id: citizen.id,
      appellate_organization_id: appellateOffice.id, state: "FILED", grounds: "Development-only active appeal fixture.",
    }, { onConflict: "id" });
    fail(appealError, "Unable to seed active appeal");
  }
}

const relatedIds = fixtures.filter((fixture) => fixture.related).map((fixture) => fixtureId(fixtures.indexOf(fixture) + 1));
if (relatedIds.length) {
  const clusterId = fixtureId(500);
  const { error: clusterError } = await admin.from("issue_clusters").upsert({ id: clusterId, title: `${FIXTURE_PREFIX} Related issue cluster`, status: "active" }, { onConflict: "id" });
  fail(clusterError, "Unable to seed related-issue cluster");
  const peerId = fixtureId(fixtures.findIndex((fixture) => fixture.key === "RELATED-PEER") + 1);
  for (const grievanceId of [relatedIds[0], peerId]) {
    const { error: memberError } = await admin.from("issue_cluster_members").upsert({ id: fixtureId(600 + Number(grievanceId.slice(-2))), cluster_id: clusterId, grievance_id: grievanceId }, { onConflict: "id" });
    fail(memberError, "Unable to seed related-issue membership");
  }
}

console.log(`Seeded ${fixtures.length} deterministic development priority fixtures. Run the scheduled evaluator or private.evaluate_all_grievance_priorities() to calculate their persisted states.`);
