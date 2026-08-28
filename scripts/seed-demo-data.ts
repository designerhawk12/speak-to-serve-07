import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { calculatePriority } from "../src/lib/cpgrams/priority-engine";
import {
  DEMO_ACCOUNTS,
  DEMO_CASES,
  DEMO_CATEGORIES,
  DEMO_CLUSTERS,
  DEMO_DATA_LABEL,
  DEMO_ORGANIZATIONS,
  LEGACY_DEMO_AUTH_EMAILS,
  LEGACY_DEMO_CASE_IDS,
  LEGACY_DEMO_CLUSTER_IDS,
  demoId,
  demoScenarioCounts,
} from "./demo-data-manifest";
import { reviewerSeedGuardStatus } from "./reviewer-seed-guard";

type AdminClient = ReturnType<typeof createClient>;

const isSeed = process.argv.includes("--seed");
const isReset = process.argv.includes("--reset");
const isDryRun = process.argv.includes("--dry-run");
const target =
  process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ??
  process.env.DEMO_DATA_TARGET;
const atValue = process.argv.find((value) => value.startsWith("--at="))?.split("=")[1];
const url = process.env.SUPABASE_URL;
const configText = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
const guard = reviewerSeedGuardStatus({
  nodeEnv: process.env.NODE_ENV,
  target,
  confirmation: process.env.REVIEWER_RESET_CONFIRM,
  expectedProjectRef: process.env.REVIEWER_DEMO_PROJECT_REF,
  supabaseUrl: url,
  configText,
});

if ([isSeed, isReset, isDryRun].filter(Boolean).length !== 1) {
  throw new Error("Choose exactly one of --seed, --reset, or --dry-run.");
}

if (isDryRun) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        target: guard.target,
        project: {
          expectedProjectRef: guard.expectedProjectRef,
          urlProjectRef: guard.urlProjectRef,
          configProjectRef: guard.configProjectRef,
          guardAllowed: guard.allowed,
          guardFailures: guard.failures,
        },
        planned: {
          reviewerAccounts: DEMO_ACCOUNTS.length,
          legacyAccountsToRemove: LEGACY_DEMO_AUTH_EMAILS.length,
          legacyFixtureCasesToRemove: LEGACY_DEMO_CASE_IDS.length,
          legacyFixtureClustersToRemove: LEGACY_DEMO_CLUSTER_IDS.length,
          preservesOrganizationsAndTaxonomy: true,
        },
        accounts: DEMO_ACCOUNTS.length,
        organizations: DEMO_ORGANIZATIONS.length,
        categories: DEMO_CATEGORIES.length,
        grievances: DEMO_CASES.length,
        clusters: DEMO_CLUSTERS.length,
        scenarios: demoScenarioCounts(),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!guard.allowed) {
  throw new Error(
    `Reviewer data operation refused: ${guard.failures.join("; ")}. ` +
      "Use only the explicitly approved demo project and never run with NODE_ENV=production.",
  );
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_DATA_PASSWORD ?? process.env.DEMO_AUTH_PASSWORD;
if (!url || !serviceRoleKey) {
  throw new Error("Missing server-only SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
if (isSeed && !password) {
  throw new Error(
    "Missing DEMO_DATA_PASSWORD or DEMO_AUTH_PASSWORD. Demo passwords belong only to Supabase Auth.",
  );
}

const now = atValue ? new Date(atValue) : new Date();
if (Number.isNaN(now.getTime())) throw new Error("--at must be a valid ISO timestamp.");

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function hoursBefore(hours: number) {
  return new Date(now.getTime() - hours * 3_600_000);
}

function isoHoursBefore(hours: number) {
  return hoursBefore(hours).toISOString();
}

function fail(error: { message: string } | null, context: string): asserts error is null {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function listDemoUsers(client: AdminClient) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1_000 });
    fail(error, "Unable to list Auth users");
    users.push(...data.users);
    if (data.users.length < 1_000) return users;
  }
}

async function removeKnownDemoStorageObjects(
  client: AdminClient,
  users: Array<{ id: string; email?: string | null }>,
) {
  const ownedEmails = new Set<string>([
    ...DEMO_ACCOUNTS.map((account) => account.email),
    ...LEGACY_DEMO_AUTH_EMAILS,
  ]);
  const knownCaseIds = new Set<string>([
    ...DEMO_CASES.map((item) => item.id),
    ...LEGACY_DEMO_CASE_IDS,
  ]);
  const paths: string[] = [];

  for (const user of users) {
    if (!user.email || !ownedEmails.has(user.email)) continue;
    const { data: caseFolders, error: folderError } = await client.storage
      .from("grievance-documents")
      .list(user.id, { limit: 1_000 });
    fail(folderError, `Unable to list demo document folders for ${user.email}`);

    for (const folder of caseFolders ?? []) {
      if (!knownCaseIds.has(folder.name)) continue;
      const prefix = `${user.id}/${folder.name}/demo-pack`;
      const { data: files, error: fileError } = await client.storage
        .from("grievance-documents")
        .list(prefix, { limit: 1_000 });
      fail(fileError, `Unable to list scoped demo documents for ${user.email}`);
      for (const file of files ?? []) paths.push(`${prefix}/${file.name}`);
    }
  }

  if (!paths.length) return;
  const { error } = await client.storage.from("grievance-documents").remove(paths);
  fail(error, "Unable to remove scoped demo document objects");
}

async function removePackData(client: AdminClient, deleteAccounts: boolean) {
  const users = await listDemoUsers(client);
  const demoUsers = users.filter((user) => DEMO_ACCOUNTS.some((item) => item.email === user.email));
  await removeKnownDemoStorageObjects(client, users);

  const clusterIds = DEMO_CLUSTERS.map((item) => item.id);
  const caseIds = DEMO_CASES.map((item) => item.id);
  const { error: clusterError } = await client.from("issue_clusters").delete().in("id", clusterIds);
  fail(clusterError, "Unable to remove demo clusters");
  const { error: grievanceError } = await client.from("grievances").delete().in("id", caseIds);
  fail(grievanceError, "Unable to remove demo grievances");

  if (!deleteAccounts) return;
  for (const user of demoUsers) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    fail(error, `Unable to remove demo Auth user ${user.email}`);
  }
}

async function removeLegacyDemoData(client: AdminClient) {
  const { error: clusterError } = await client
    .from("issue_clusters")
    .delete()
    .in("id", [...LEGACY_DEMO_CLUSTER_IDS]);
  fail(clusterError, "Unable to remove known legacy demo clusters");

  const { error: grievanceError } = await client
    .from("grievances")
    .delete()
    .in("id", [...LEGACY_DEMO_CASE_IDS]);
  fail(grievanceError, "Unable to remove known legacy demo fixture cases");

  const users = await listDemoUsers(client);
  const legacyUsers = users.filter((user) =>
    LEGACY_DEMO_AUTH_EMAILS.includes(user.email as (typeof LEGACY_DEMO_AUTH_EMAILS)[number]),
  );
  for (const user of legacyUsers) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    fail(error, `Unable to remove known legacy demo Auth user ${user.email}`);
  }

  return legacyUsers.length;
}

if (isReset) {
  await removePackData(admin, true);
  const legacyAccountsRemoved = await removeLegacyDemoData(admin);
  console.log(
    `Removed ${DEMO_CASES.length} reviewer grievances, ${DEMO_CLUSTERS.length} reviewer clusters, files, ${DEMO_ACCOUNTS.length} reviewer accounts, and ${legacyAccountsRemoved} known legacy demo accounts. Organizations and taxonomy were preserved.`,
  );
  process.exit(0);
}

await removePackData(admin, false);
await removeLegacyDemoData(admin);

const organizationIdByCode = new Map(DEMO_ORGANIZATIONS.map((item) => [item.code, item.id]));
for (const organization of DEMO_ORGANIZATIONS) {
  const { error } = await admin.from("organizations").upsert(
    {
      id: organization.id,
      code: organization.code,
      name: organization.name,
      level: organization.level,
      parent_id: organization.parentCode ? organizationIdByCode.get(organization.parentCode) : null,
      state_name: organization.stateName,
      is_appellate_office: organization.isAppellate,
      is_active: true,
      contact_email: null,
    },
    { onConflict: "id" },
  );
  fail(error, `Unable to seed organization ${organization.code}`);
}

const categoryIdByCode = new Map(DEMO_CATEGORIES.map((item) => [item.code, item.id]));
for (const category of DEMO_CATEGORIES) {
  const { error } = await admin.from("grievance_categories").upsert(
    {
      id: category.id,
      code: category.code,
      name: category.name,
      parent_id: category.parentCode ? categoryIdByCode.get(category.parentCode) : null,
      default_organization_id: organizationIdByCode.get(category.organizationCode),
      sla_days: category.slaDays,
      plain_language_hint: category.hint,
      is_active: true,
    },
    { onConflict: "id" },
  );
  fail(error, `Unable to seed category ${category.code}`);
}

const authUsers = await listDemoUsers(admin);
for (const account of DEMO_ACCOUNTS) {
  let user = authUsers.find((candidate) => candidate.email === account.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: password!,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, demo_data_pack: true },
    });
    fail(error, `Unable to create demo account ${account.email}`);
    user = data.user;
    authUsers.push(user);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: password!,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: account.fullName, demo_data_pack: true },
    });
    fail(error, `Unable to refresh demo account ${account.email}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      phone: null,
      role: account.role,
      organization_id: account.organizationCode
        ? organizationIdByCode.get(account.organizationCode)
        : null,
      designation: account.role === "citizen" ? null : `${DEMO_DATA_LABEL} ${account.role} account`,
    },
    { onConflict: "id" },
  );
  fail(profileError, `Unable to seed profile ${account.email}`);

  if (account.role === "gro") {
    const { error: assignmentError } = await admin.from("officer_assignment_profiles").upsert(
      {
        officer_id: user.id,
        is_active: true,
        jurisdiction_state_names: [],
        jurisdiction_district_names: [],
        jurisdiction_location_terms: account.locationTerms,
        last_assigned_at: null,
      },
      { onConflict: "officer_id" },
    );
    fail(assignmentError, `Unable to seed assignment profile ${account.email}`);
  }
}

const userIdByEmail = new Map(
  authUsers
    .filter((user) => DEMO_ACCOUNTS.some((account) => account.email === user.email))
    .map((user) => [user.email!, user.id]),
);
const citizenIds = DEMO_ACCOUNTS.filter((item) => item.role === "citizen").map((item) =>
  userIdByEmail.get(item.email),
);
const nodalId = userIdByEmail.get("nodal@demo-data.cpgrams.in")!;
const appellateId = userIdByEmail.get("appellate@demo-data.cpgrams.in")!;
if (citizenIds.some((id) => !id) || !nodalId || !appellateId) {
  throw new Error("Demo account provisioning did not return every required user ID.");
}

const assignmentByCase = new Map<string, string>();
for (const [caseIndex, item] of DEMO_CASES.entries()) {
  const submittedAt = hoursBefore(item.submittedHoursAgo);
  const isFinalResponse = [
    "resolution-review",
    "confirmed-resolved",
    "partly-resolved",
    "not-resolved",
    "appealed",
    "appeal-decided",
  ].some((tag) => item.tags.includes(tag as never));
  const responseAt = isFinalResponse ? hoursBefore(item.lastActionHoursAgo ?? 24) : null;
  const wrongRouteDetectedAt = item.tags.includes("transfer-risk") ? hoursBefore(20) : null;
  const { data, error } = await admin
    .from("grievances")
    .insert({
      id: item.id,
      registration_number: item.reference,
      citizen_id: citizenIds[item.citizen]!,
      original_text: `${DEMO_DATA_LABEL} Fictional prototype scenario. ${item.title}. No real citizen or government activity is represented.`,
      original_language: "en",
      short_title: item.title,
      requested_outcome:
        "A clear recorded response and practical correction in this fictional scenario.",
      urgency: item.tags.includes("critical")
        ? "urgent"
        : item.tags.includes("sla-risk")
          ? "time_sensitive"
          : "routine",
      category_id: categoryIdByCode.get(item.categoryCode),
      organization_id: organizationIdByCode.get(item.organizationCode),
      appellate_organization_id: organizationIdByCode.get("DEMO-APPEAL"),
      location_text: item.location,
      state_name: item.state,
      district_name: item.district,
      administrative_state: item.administrativeState,
      outcome_state: item.outcomeState,
      citizen_confirmation_state: item.confirmationState,
      submitted_at: submittedAt.toISOString(),
      sla_due_at: new Date(submittedAt.getTime() + item.slaWindowHours * 3_600_000).toISOString(),
      government_response_completed_at: responseAt?.toISOString() ?? null,
      disposed_at: responseAt?.toISOString() ?? null,
      closed_at:
        item.tags.includes("confirmed-resolved") && !item.tags.includes("closure-ready")
          ? isoHoursBefore(12)
          : null,
      wrong_route_detected_at: wrongRouteDetectedAt?.toISOString() ?? null,
      transfer_due_at: wrongRouteDetectedAt
        ? new Date(wrongRouteDetectedAt.getTime() + 48 * 3_600_000).toISOString()
        : null,
      wrong_route_resolved_at: null,
      created_at: submittedAt.toISOString(),
      updated_at: isoHoursBefore(item.lastActionHoursAgo ?? Math.min(item.submittedHoursAgo, 2)),
    })
    .select("id, assigned_officer_id")
    .single();
  fail(error, `Unable to seed grievance ${item.reference}`);
  if (!data.assigned_officer_id) {
    throw new Error(`No eligible GRO was assigned to ${item.reference}.`);
  }
  assignmentByCase.set(item.id, data.assigned_officer_id);

  const waitingOnCitizen =
    item.tags.includes("documents-partial") || item.tags.includes("clarification-open");
  const terminal = ["confirmed-resolved", "appeal-decided"].some((tag) =>
    item.tags.includes(tag as never),
  );
  const openedAt = item.openedHoursAgo == null ? undefined : hoursBefore(item.openedHoursAgo);
  const assignmentHours = item.tags.includes("unopened")
    ? caseIndex === 3
      ? 25
      : 49
    : Math.max(1, item.submittedHoursAgo - 1);
  const relatedCount =
    DEMO_CASES.filter((candidate) =>
      candidate.tags.some((tag) => item.tags.includes(tag) && tag.endsWith("-cluster")),
    ).length - 1;
  const activeAppeal = item.tags.includes("appealed") && !item.tags.includes("appeal-decided");
  const result = terminal
    ? {
        score: 0,
        level: "NORMAL" as const,
        reasons: [
          "Original government-processing phase is complete; active inactivity escalation is stopped",
        ],
        escalationLevel: 0 as const,
      }
    : calculatePriority({
        now,
        submittedAt,
        slaDueAt: new Date(submittedAt.getTime() + item.slaWindowHours * 3_600_000),
        assignmentStartedAt: hoursBefore(assignmentHours),
        ...(openedAt ? { openedAt } : {}),
        ...(item.lastActionHoursAgo == null
          ? {}
          : { lastMeaningfulGovernmentActionAt: hoursBefore(item.lastActionHoursAgo) }),
        waitingOnCitizen,
        recentReminderCount: item.reminderCount ?? 0,
        relatedCaseCount: Math.max(0, relatedCount),
        hasActiveAppeal: activeAppeal,
      });
  const { error: priorityError } = await admin.from("grievance_priorities").upsert(
    {
      grievance_id: item.id,
      priority_score: result.score,
      priority_level: result.level,
      priority_reasons: result.reasons,
      assignment_started_at: hoursBefore(assignmentHours).toISOString(),
      first_opened_at: openedAt?.toISOString() ?? null,
      last_meaningful_government_action_at:
        item.lastActionHoursAgo == null ? null : isoHoursBefore(item.lastActionHoursAgo),
      escalation_level: result.escalationLevel,
      next_escalation_at:
        "nextEscalationAt" in result ? result.nextEscalationAt?.toISOString() : null,
      waiting_on_citizen: waitingOnCitizen,
      evaluated_at: now.toISOString(),
    },
    { onConflict: "grievance_id" },
  );
  fail(priorityError, `Unable to seed priority for ${item.reference}`);
}

function eventId(caseIndex: number, ordinal: number) {
  return demoId(5_000 + caseIndex * 20 + ordinal);
}

const resolutionByCase = new Map<string, string>();
const appealByCase = new Map<string, string>();
const events = [];
const notifications = [];

for (const [caseIndex, item] of DEMO_CASES.entries()) {
  const officerId = assignmentByCase.get(item.id)!;
  const organizationId = organizationIdByCode.get(item.organizationCode)!;
  const citizenId = citizenIds[item.citizen]!;
  events.push({
    id: eventId(caseIndex, 1),
    grievance_id: item.id,
    event_type: "GRIEVANCE_SUBMITTED",
    actor_type: "citizen",
    actor_id: citizenId,
    title: "Demo grievance submitted",
    description: "A fictional prototype grievance was submitted.",
    metadata: { demo_pack: true },
    citizen_visible: true,
    created_at: isoHoursBefore(item.submittedHoursAgo),
  });
  if (item.openedHoursAgo != null)
    events.push({
      id: eventId(caseIndex, 2),
      grievance_id: item.id,
      event_type: "CASE_OPENED",
      actor_type: "officer",
      actor_id: officerId,
      organization_id: organizationId,
      title: "Demo case opened",
      description: "The assigned demo officer opened this fictional case.",
      metadata: { demo_pack: true },
      citizen_visible: false,
      created_at: isoHoursBefore(item.openedHoursAgo),
    });
  if (item.tags.includes("transferred"))
    events.push({
      id: eventId(caseIndex, 3),
      grievance_id: item.id,
      event_type: "CASE_TRANSFERRED",
      actor_type: "officer",
      actor_id: officerId,
      organization_id: organizationId,
      title: "Case transferred to [DEMO] Urban Lighting Office",
      description:
        "The fictional case moved from [DEMO] Civic Services Supervisory Group to [DEMO] Urban Lighting Office.",
      metadata: {
        demo_pack: true,
        from_organization_name: "[DEMO] Civic Services Supervisory Group",
        to_organization_name: "[DEMO] Urban Lighting Office",
        reason: "Demo routing correction",
      },
      citizen_visible: true,
      created_at: isoHoursBefore(24),
    });
  if (item.tags.includes("transfer-risk"))
    events.push({
      id: eventId(caseIndex, 3),
      grievance_id: item.id,
      event_type: "WRONG_ROUTE_FLAGGED",
      actor_type: "officer",
      actor_id: officerId,
      organization_id: organizationId,
      title: "Transfer required",
      description: "The demo officer recorded that routing needs review within 48 hours.",
      metadata: { demo_pack: true, reason: "Demo incorrect-routing scenario" },
      citizen_visible: true,
      created_at: isoHoursBefore(20),
    });
  for (let reminder = 0; reminder < (item.reminderCount ?? 0); reminder += 1) {
    events.push({
      id: eventId(caseIndex, 8 + reminder),
      grievance_id: item.id,
      event_type: "CITIZEN_REMINDER_SENT",
      actor_type: "citizen",
      actor_id: citizenId,
      organization_id: organizationId,
      title: "Citizen reminder received",
      description: "A fictional citizen reminder was recorded for demonstration.",
      metadata: { demo_pack: true },
      citizen_visible: true,
      created_at: isoHoursBefore(2 + reminder * 72),
    });
  }
  if (item.tags.includes("interim")) {
    const resolutionId = demoId(3_000 + caseIndex);
    const { error } = await admin.from("resolutions").insert({
      id: resolutionId,
      grievance_id: item.id,
      authored_by: officerId,
      organization_id: organizationId,
      action_taken: "The demo office completed an initial record check.",
      outcome_claimed: "UNRESOLVED",
      outcome_achieved: "Initial verification completed; final action remains pending.",
      is_interim: true,
      current_blocker: "A fictional external verification is pending.",
      expected_next_step: "Review the verification response.",
      expected_date: new Date(now.getTime() + 5 * 86_400_000).toISOString().slice(0, 10),
      resolution_narrative: "Prototype interim update only.",
      created_at: isoHoursBefore(item.lastActionHoursAgo ?? 6),
    });
    fail(error, `Unable to seed interim update for ${item.reference}`);
    events.push({
      id: eventId(caseIndex, 4),
      grievance_id: item.id,
      event_type: "INTERIM_UPDATE_ADDED",
      actor_type: "officer",
      actor_id: officerId,
      organization_id: organizationId,
      title: "Interim update added",
      description: "The demo office recorded progress and the next step.",
      metadata: { demo_pack: true },
      citizen_visible: true,
      created_at: isoHoursBefore(item.lastActionHoursAgo ?? 6),
    });
  }

  const needsFinalResolution = [
    "resolution-review",
    "confirmed-resolved",
    "partly-resolved",
    "not-resolved",
    "appealed",
    "appeal-decided",
  ].some((tag) => item.tags.includes(tag as never));
  if (needsFinalResolution) {
    const resolutionId = demoId(3_000 + caseIndex);
    resolutionByCase.set(item.id, resolutionId);
    const { error } = await admin.from("resolutions").insert({
      id: resolutionId,
      grievance_id: item.id,
      authored_by: officerId,
      organization_id: organizationId,
      action_taken: "The demo office inspected records and recorded a fictional corrective action.",
      outcome_claimed: "RESOLUTION_PROPOSED",
      outcome_achieved: "A prototype government response was recorded for citizen review.",
      is_interim: false,
      citizen_next_step: "Review the response and select Yes, Partly, or No.",
      resolution_narrative:
        "This is a fictional demonstration response and not real government activity.",
      partial_or_unresolved_reason:
        item.tags.includes("partly-resolved") || item.tags.includes("not-resolved")
          ? "The citizen reports that part or all of the problem remains."
          : null,
      evidence_reference: "Demo inspection reference only",
      created_at: isoHoursBefore(item.lastActionHoursAgo ?? 24),
    });
    fail(error, `Unable to seed resolution for ${item.reference}`);
    events.push({
      id: eventId(caseIndex, 5),
      grievance_id: item.id,
      event_type: "RESOLUTION_SUBMITTED",
      actor_type: "officer",
      actor_id: officerId,
      organization_id: organizationId,
      title: "Government response provided",
      description: "The demo office recorded a fictional response for citizen review.",
      metadata: { demo_pack: true, resolution_id: resolutionId },
      citizen_visible: true,
      created_at: isoHoursBefore(item.lastActionHoursAgo ?? 24),
    });
    if (item.confirmationState !== "AWAITING_CONFIRMATION") {
      const confirmationEvent =
        item.confirmationState === "CONFIRMED_RESOLVED"
          ? "CITIZEN_CONFIRMED_RESOLVED"
          : item.confirmationState === "PARTIALLY_RESOLVED"
            ? "CITIZEN_CONFIRMED_PARTLY_RESOLVED"
            : "CITIZEN_REJECTED_RESOLUTION";
      const { error: feedbackError } = await admin.from("feedback").insert({
        id: demoId(3_500 + caseIndex),
        grievance_id: item.id,
        resolution_id: resolutionId,
        citizen_id: citizenId,
        confirmation: item.confirmationState,
        what_was_fixed:
          item.confirmationState === "PARTIALLY_RESOLVED"
            ? "One part of the fictional problem improved."
            : null,
        what_remains_unresolved:
          item.confirmationState === "CONFIRMED_RESOLVED"
            ? null
            : "The fictional problem remains in whole or in part.",
        requested_correction:
          item.confirmationState === "NOT_RESOLVED"
            ? "Review the service record and take corrective action."
            : null,
        comments: "Demo outcome confirmation.",
        created_at: isoHoursBefore(12),
      });
      fail(feedbackError, `Unable to seed feedback for ${item.reference}`);
      events.push({
        id: eventId(caseIndex, 6),
        grievance_id: item.id,
        event_type: confirmationEvent,
        actor_type: "citizen",
        actor_id: citizenId,
        organization_id: organizationId,
        title:
          item.confirmationState === "CONFIRMED_RESOLVED"
            ? "Citizen confirmed the issue is resolved"
            : item.confirmationState === "PARTIALLY_RESOLVED"
              ? "Citizen reported the issue partly resolved"
              : "Citizen reported the issue is not resolved",
        description: "A fictional citizen outcome was recorded for demonstration.",
        metadata: { demo_pack: true, resolution_id: resolutionId },
        citizen_visible: true,
        created_at: isoHoursBefore(12),
      });
    }
  }

  if (item.tags.includes("appealed")) {
    const appealId = demoId(4_000 + caseIndex);
    appealByCase.set(item.id, appealId);
    const decided = item.tags.includes("appeal-decided");
    const underReview = item.administrativeState === "APPEAL_UNDER_REVIEW";
    const { error } = await admin.from("appeals").insert({
      id: appealId,
      grievance_id: item.id,
      citizen_id: citizenId,
      appellate_organization_id: organizationIdByCode.get("DEMO-APPEAL"),
      reviewer_id: decided || underReview ? appellateId : null,
      reference_number: `APL-2026-D3B${(caseIndex + 1).toString(16).toUpperCase().padStart(17, "0")}`,
      grounds: "The fictional government response did not fully address the requested outcome.",
      requested_relief: "Review the fictional response and record a manual appellate decision.",
      state: decided ? "DECIDED" : underReview ? "UNDER_REVIEW" : "FILED",
      decision_summary: decided
        ? "The demo authority recorded a fictional corrective direction."
        : null,
      decision_reasons: decided
        ? "The prototype record showed that part of the requested outcome remained unaddressed."
        : null,
      filed_at: isoHoursBefore(10),
      decided_at: decided ? isoHoursBefore(2) : null,
      created_at: isoHoursBefore(10),
    });
    fail(error, `Unable to seed appeal for ${item.reference}`);
    const appealEvents = [
      {
        id: demoId(15_000 + caseIndex * 2),
        appeal_id: appealId,
        event_type: "APPEAL_CREATED",
        actor_type: "citizen",
        actor_id: citizenId,
        organization_id: organizationIdByCode.get("DEMO-APPEAL"),
        title: "Demo appeal filed",
        description: "A fictional appeal was filed.",
        metadata: { demo_pack: true },
        citizen_visible: true,
        created_at: isoHoursBefore(10),
      },
    ];
    if (decided)
      appealEvents.push({
        id: demoId(15_000 + caseIndex * 2 + 1),
        appeal_id: appealId,
        event_type: "APPEAL_DECIDED",
        actor_type: "officer",
        actor_id: appellateId,
        organization_id: organizationIdByCode.get("DEMO-APPEAL"),
        title: "Demo appeal decided",
        description: "The demo authority recorded a fictional manual decision.",
        metadata: { demo_pack: true },
        citizen_visible: true,
        created_at: isoHoursBefore(2),
      });
    const { error: eventError } = await admin.from("appeal_events").insert(appealEvents);
    fail(eventError, `Unable to seed appeal events for ${item.reference}`);
  }

  if (item.tags.includes("resolution-review"))
    notifications.push({
      id: demoId(12_000 + caseIndex * 3),
      user_id: citizenId,
      grievance_id: item.id,
      title: "Review government's resolution",
      body: "A fictional demo resolution is ready for review.",
      kind: "resolution_review",
      action_required: true,
      created_at: isoHoursBefore(3),
    });
  if (item.tags.includes("critical")) {
    notifications.push({
      id: demoId(12_000 + caseIndex * 3),
      user_id: officerId,
      grievance_id: item.id,
      title: "Critical demo case requires attention",
      body: "Deterministic priority reasons place this fictional case at CRITICAL.",
      kind: "priority",
      action_required: true,
      created_at: isoHoursBefore(1),
    });
    notifications.push({
      id: demoId(12_000 + caseIndex * 3 + 1),
      user_id: nodalId,
      grievance_id: item.id,
      title: "Critical demo escalation",
      body: "Supervisor attention is requested; legal ownership has not changed.",
      kind: "escalation",
      action_required: true,
      created_at: isoHoursBefore(1),
    });
  }
}

if (events.length) {
  const { error } = await admin.from("case_events").insert(events);
  fail(error, "Unable to seed demo case events");
}

for (const [caseIndex, item] of DEMO_CASES.entries()) {
  const officerId = assignmentByCase.get(item.id)!;
  const citizenId = citizenIds[item.citizen]!;
  const organizationId = organizationIdByCode.get(item.organizationCode)!;
  if (item.tags.includes("clarification-open") || item.tags.includes("clarification-complete")) {
    const completed = item.tags.includes("clarification-complete");
    const requestMessageId = demoId(9_000 + caseIndex * 2);
    const responseMessageId = completed ? demoId(9_000 + caseIndex * 2 + 1) : null;
    const messageRows = [
      {
        id: requestMessageId,
        grievance_id: item.id,
        sender_id: officerId,
        sender_type: "officer",
        body: "Please confirm the nearest landmark and the approximate time the fictional problem occurs.",
        citizen_visible: true,
        created_at: isoHoursBefore(48),
      },
    ];
    if (completed)
      messageRows.push({
        id: responseMessageId!,
        grievance_id: item.id,
        sender_id: citizenId,
        sender_type: "citizen",
        body: "Demo response: the landmark and timing have been provided.",
        citizen_visible: true,
        created_at: isoHoursBefore(8),
      });
    const { error: messageError } = await admin.from("messages").insert(messageRows);
    fail(messageError, `Unable to seed clarification messages for ${item.reference}`);
    const { error: clarificationError } = await admin.from("clarification_requests").insert({
      id: demoId(10_000 + caseIndex),
      grievance_id: item.id,
      requested_by: officerId,
      organization_id: organizationId,
      question: "Please confirm the nearest landmark and approximate timing.",
      request_message_id: requestMessageId,
      requested_at: isoHoursBefore(48),
      response_message_id: responseMessageId,
      responded_by: completed ? citizenId : null,
      response_text: completed ? "Demo response: landmark and timing supplied." : null,
      fulfilled_at: completed ? isoHoursBefore(8) : null,
      resume_administrative_state: "CITIZEN_RESPONSE_RECEIVED",
    });
    fail(clarificationError, `Unable to seed clarification for ${item.reference}`);
    if (!completed)
      notifications.push({
        id: demoId(12_000 + caseIndex * 3 + 2),
        user_id: citizenId,
        grievance_id: item.id,
        title: "Government needs clarification",
        body: "Answer the fictional clarification request.",
        kind: "clarification",
        action_required: true,
        created_at: isoHoursBefore(48),
      });
  }

  if (item.tags.includes("documents-partial") || item.tags.includes("documents-complete")) {
    const completed = item.tags.includes("documents-complete");
    const requestId = demoId(6_000 + caseIndex);
    const requestedLabels = completed
      ? ["Service statement", "Address proof"]
      : ["Pension order", "Bank statement", "PPO copy"];
    const suppliedCount = completed ? requestedLabels.length : 1;
    const { error: requestError } = await admin.from("document_requests").insert({
      id: requestId,
      grievance_id: item.id,
      requested_by: officerId,
      organization_id: organizationId,
      reason: completed
        ? "Demo checklist completed for officer review."
        : "Upload the remaining fictional pension documents one item at a time.",
      due_at: new Date(now.getTime() + 5 * 86_400_000).toISOString(),
      fulfilled_at: completed ? isoHoursBefore(12) : null,
      created_at: isoHoursBefore(72),
    });
    fail(requestError, `Unable to seed document request for ${item.reference}`);
    const itemRows = [];
    for (const [offset, label] of requestedLabels.entries()) {
      const documentId = offset < suppliedCount ? demoId(8_000 + caseIndex * 4 + offset) : null;
      if (documentId) {
        const storagePath = `${citizenId}/${item.id}/demo-pack/${documentId}.txt`;
        const body = new TextEncoder().encode(
          `${DEMO_DATA_LABEL}\nFictional document: ${label}\nNo real citizen information.`,
        );
        const { error: storageError } = await admin.storage
          .from("grievance-documents")
          .upload(storagePath, body, { contentType: "text/plain; charset=utf-8", upsert: true });
        fail(storageError, `Unable to upload demo document ${label}`);
        const { error: documentError } = await admin.from("documents").insert({
          id: documentId,
          grievance_id: item.id,
          uploaded_by: citizenId,
          file_name: `[DEMO] ${label}.txt`,
          storage_path: storagePath,
          mime_type: "text/plain",
          size_bytes: body.byteLength,
          doc_kind: "requested_document",
          citizen_visible: true,
          upload_idempotency_key: demoId(16_000 + caseIndex * 4 + offset),
          created_at: isoHoursBefore(24 - offset),
        });
        fail(documentError, `Unable to seed document ${label}`);
      }
      itemRows.push({
        id: demoId(7_000 + caseIndex * 4 + offset),
        request_id: requestId,
        label,
        description: `${DEMO_DATA_LABEL} Fictional checklist item.`,
        is_required: true,
        document_id: documentId,
      });
    }
    const { error: itemError } = await admin.from("document_request_items").insert(itemRows);
    fail(itemError, `Unable to seed checklist for ${item.reference}`);
    if (!completed)
      notifications.push({
        id: demoId(12_000 + caseIndex * 3 + 2),
        user_id: citizenId,
        grievance_id: item.id,
        title: "Upload requested documents",
        body: "One of three fictional required items has been supplied.",
        kind: "document_request",
        action_required: true,
        created_at: isoHoursBefore(72),
      });
  }
}

if (notifications.length) {
  const { error } = await admin.from("notifications").insert(notifications);
  fail(error, "Unable to seed demo notifications");
}

let memberOffset = 0;
for (const cluster of DEMO_CLUSTERS) {
  const members = DEMO_CASES.filter((item) => item.tags.includes(cluster.tag));
  const { error: clusterError } = await admin.from("issue_clusters").insert({
    id: cluster.id,
    title: cluster.title,
    summary: cluster.summary,
    organization_id: organizationIdByCode.get(cluster.organizationCode),
    category_id: categoryIdByCode.get(cluster.categoryCode),
    case_count: members.length,
    status: "active",
    created_at: now.toISOString(),
  });
  fail(clusterError, `Unable to seed cluster ${cluster.title}`);
  const { error: memberError } = await admin.from("issue_cluster_members").insert(
    members.map((item, index) => ({
      id: demoId(14_000 + memberOffset + index),
      cluster_id: cluster.id,
      grievance_id: item.id,
      similarity: 0.8 + (index % 4) * 0.03,
    })),
  );
  fail(memberError, `Unable to seed members for ${cluster.title}`);
  memberOffset += members.length;
}

const { data: assignmentRows, error: assignmentError } = await admin
  .from("grievances")
  .select("assigned_officer_id, profiles!grievances_assigned_officer_id_fkey(email)")
  .in(
    "id",
    DEMO_CASES.map((item) => item.id),
  );
fail(assignmentError, "Unable to verify demo workload distribution");
const workload = Object.fromEntries(
  (assignmentRows ?? []).reduce<Map<string, number>>((counts, row) => {
    const email =
      (row.profiles as unknown as { email: string | null } | null)?.email ?? "unassigned";
    counts.set(email, (counts.get(email) ?? 0) + 1);
    return counts;
  }, new Map()),
);

console.log(
  JSON.stringify(
    {
      label: DEMO_DATA_LABEL,
      snapshotAt: now.toISOString(),
      counts: {
        accounts: DEMO_ACCOUNTS.length,
        organizations: DEMO_ORGANIZATIONS.length,
        categories: DEMO_CATEGORIES.length,
        grievances: DEMO_CASES.length,
        appeals: appealByCase.size,
        resolutions:
          resolutionByCase.size + DEMO_CASES.filter((item) => item.tags.includes("interim")).length,
        finalResolutions: resolutionByCase.size,
        clusters: DEMO_CLUSTERS.length,
        notifications: notifications.length,
      },
      scenarios: demoScenarioCounts(),
      workload,
    },
    null,
    2,
  ),
);
