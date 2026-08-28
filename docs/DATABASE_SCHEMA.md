# Database Schema

Source of truth: `supabase/migrations/20260825105942_d7f35e31-6933-4b5b-9a04-c5ece3d37d7b.sql`, followed by the subsequent migrations in `supabase/migrations/`, including `20260825181035_officer_case_workflows.sql`, `20260825184054_citizen_resolution_appeal_lifecycle.sql`, `20260825201506_deterministic_priority_auto_escalation.sql`, `20260827145039_officer_assignment_and_queue_scaling.sql`, `20260827153122_preserve_authorized_transfer_assignment.sql`, `20260827161634_restrict_officer_transfer_destinations.sql`, `20260827163618_complete_atomic_transfer_and_wrong_route_deadline.sql`, `20260827191500_case_specific_clarifications_and_citizen_reminders.sql`, and `20260828130000_multilingual_foundation.sql`.

## Identity and organization

- `profiles`: application profile keyed to `auth.users`; stores the role, organization, name, and contact preferences. Authenticated users may update only their own name, phone, and preferred language; role and organization assignment are privileged provisioning data.
- `officer_assignment_profiles`: privileged, one-to-one assignment configuration for GRO profiles. It stores active status, optional state/district/location-term jurisdiction, and the last assignment time used for stable fair distribution. RLS is enabled and no browser role has table access; provisioning uses trusted administration only.
- `organizations`: government organization tree using `parent_id`; supports central, state, district, local body, and appellate levels. `is_active` prevents new routing/transfer into an unavailable organization without deleting historical references.
- `grievance_categories`: category hierarchy with a default organization and SLA.

## Case records

- `grievances`: the primary case record. `original_text` is required and must remain preserved. `original_language` is a best-effort BCP 47 tag captured only at filing time; `und` means unknown and is deliberately not retroactively guessed. It has independent `administrative_state`, `outcome_state`, and `citizen_confirmation_state` fields. `organization_id` is the current legal office and `assigned_officer_id` is the current individual GRO assignment; these are not interchangeable. `government_response_completed_at` freezes the original government-processing SLA when a formal response is provided; citizen review and appeal remain separate phases. `wrong_route_detected_at`, `transfer_due_at`, and `wrong_route_resolved_at` form an auditable 48-hour routing requirement without changing the administrative-state enum.
- `case_events`: immutable case timeline records. Authenticated users have select/insert access through case authorization; no authenticated update/delete policy exists.
- `documents`: metadata for private grievance files, with the object path stored in `storage_path`. A citizen can read only their own upload or a row marked `citizen_visible`; authorized staff retain their case-level access. The private Storage-object policy uses the identical rule before a signed URL can be created. `upload_idempotency_key` is nullable for legacy rows and unique per uploader/grievance when present, so one retryable citizen upload action creates at most one metadata row.
- `document_requests` and `document_request_items`: requests made to a citizen and the documents satisfying them. A non-null item `document_id` is unique across checklist items, and a request becomes fulfilled only after every required item has a document.
- `clarification_requests`: a grievance-keyed clarification lifecycle. It records the government question/request, requesting officer/organization, linked request/response messages, optional citizen response document, response text, and fulfillment time. A partial unique index permits at most one unresolved clarification per grievance. Authenticated participants have RLS-scoped read access; writes occur through the explicitly authorized transactional RPCs.
- `messages`: citizen-visible or internal case communication.
- `resolutions`: officer-authored proposed or recorded resolutions. In addition to action and enum-based proposed outcome, it records the officer's plain-language `outcome_achieved`, citizen next step, resolution narrative, partial/unresolved reason, evidence reference, and interim-update blocker/next-step/date fields where applicable.
- `feedback`: citizen confirmation of real-world outcome, including what was fixed, what remains unresolved, requested correction, and an optional supporting document. `resolution_id` ties each confirmation to the specific final government resolution it reviews, so a later government response can be reviewed without overwriting or blocking historical citizen feedback. This remains distinct from government resolution records.

## Priority and attention escalation

- `grievance_priorities`: one protected row per grievance containing the deterministic `priority_score`, `priority_level`, human-readable `priority_reasons`, assignment/open/action timestamps, current attention escalation level, next threshold, and whether government-inactivity timing is paused for citizen action. Authenticated staff can only select rows for grievances already authorized by RLS; browser users receive no write grant.
- `private.priority_engine_config`: the single auditable threshold/weight configuration row, including the 72-hour reminder cooldown, 14-day reminder window, per-reminder points, and total reminder contribution cap. It is not exposed through the Data API.
- `private.calculate_grievance_priority`: pure deterministic calculation over case facts and configuration. It does not transfer, dispose, assign, or otherwise change legal ownership/lifecycle state.
- `private.evaluate_grievance_priority` and `private.evaluate_all_grievance_priorities`: internal persistence, immutable-event, and notification functions. Active cases retain the existing deterministic engine. Once the original government-processing phase reaches resolution/disposal/appeal/closure, the wrapper normalizes active priority to NORMAL/0, clears future escalation, and retains immutable priority history. `PRIORITY_CHANGED` and `ESCALATION_TRIGGERED` are internal case events.
- `public.officer_mark_grievance_opened`: authenticated GRO/nodal RPC with explicit case authorization. It records the first open idempotently and appends a non-citizen-visible `CASE_OPENED` event.
- Supabase Cron job `cpgrams-priority-evaluation` runs the private evaluator every 15 minutes. HIGH sends attention to the responsible officer; CRITICAL/SLA breach also notifies authorized Nodal supervision. No escalation changes the grievance organization or assigned officer.

## Appeals and notifications

- `appeals`: appeal record linked to a grievance and an appellate organization.
- `appeal_events`: append-only appeal timeline records.
- `notifications`: per-user notices, including read state.

## Limited public tracking boundary

Migration `20260828120000_public_tracking_safe_lookup.sql` provides limited anonymous tracking
fallbacks without making any case table public. `private.public_tracking_lookup_attempts` is RLS
enabled and has no browser grants; the two narrowly scoped public RPCs use it only to enforce a
five-minute, 12-per-minute client-fingerprint limit. `public.public_track_grievance` and
`public.public_track_appeal` are intentionally anonymous-callable `SECURITY DEFINER` functions
with `search_path = ''`, strict reference-format validation, schema-qualified object references,
and an identical generic `{ "found": false }` response for missing, malformed, and throttled
references. Their JSON contracts are whitelists, not table projections: grievance tracking returns
only reference, generalized category, generic administrative stage, optional organization name,
submitted/last-updated dates, generic public milestones, and generic resolution/appeal
availability; appeal tracking returns only appeal reference, generic stage, optional appellate
organization, filed/last-updated dates, and generic appeal milestones. They never expose profile
identity/contact/location, private narrative or outcome, documents, messages, clarification,
evidence, officer data, raw event content/metadata, appeal grounds, requested relief, or decision
content. Future registration/reference defaults have a 20-hex-character random suffix; no legacy
reference is rewritten. This RPC boundary is the only allowed public lookup path; signed-in
citizens use the normal RLS-protected `/citizen` workspace.

## Advisory and systemic-analysis records

- `ai_runs`: records of AI-assisted processing. It is not permission to make a binding decision or invent case activity.
- `issue_clusters` and `issue_cluster_members`: staff-facing systemic issue grouping and membership.

## Access model documented by the migrations

- Citizens can read their own grievances, appeals, and authorized related records.
- GROs can read grievances in their own organization under the existing organization policy. Normal case action is assignment-aware: the individual GRO must match `assigned_officer_id`. A same-organization GRO may therefore have read context without action controls.
- Nodal users can access grievances in their organization subtree.
- Appellate users cannot read an ordinary grievance merely because it names their appellate organization. Once an appeal exists for that appellate organization, they can read the original grievance as required appeal context.
- Platform administrators retain technical/profile administration access but do not receive blanket grievance or appeal read/update access. Appellate grievance access is read-only context; original grievance updates remain GRO/nodal operations.
- `private` schema helper functions support RLS decisions and replaced earlier public helper functions in the second migration.
- `organizations` and `grievance_categories` are public reference data; case data is protected by RLS.

## Storage

The migrations define object policies for a `grievance-documents` bucket. Objects are readable only when the requester may view the corresponding grievance, and uploads/deletions are limited to the user's folder. The bucket creation is external to the migrations and must be verified in the connected Supabase project before relying on it.

## Change rules

- Inspect both existing migrations before any schema change.
- Use a new migration for database changes; do not recreate tables.
- Keep RLS enabled and add role- and ownership-specific policies.
- Do not grant authenticated users update privileges for `profiles.role` or `profiles.organization_id`; both authorize access.
- Treat the three grievance status fields as separate lifecycles.
- Add an immutable `case_events` record for every material case transition.

## Officer workflow functions

Migration `20260827145039_officer_assignment_and_queue_scaling.sql` adds automatic GRO assignment without changing legal organization ownership. Eligible officers must be active GRO profiles in the exact current organization and must satisfy every configured state/district/location restriction. The selector then chooses the lowest active assigned-case count, followed by the oldest/null `last_assigned_at`, followed by officer UUID. An organization-scoped transaction advisory lock serializes competing assignments. Assignment appends `CASE_ASSIGNED`; no eligible officer results in a visible unassigned case rather than cross-organization assignment.

The same migration makes Appellate grievance visibility depend on an existing appeal, introduces assignment-aware grievance updates, and exposes `officer_case_queue` as a `security_invoker` view so underlying grievance and priority RLS remains authoritative during database-side filtering/counting/pagination. Migration `20260827153122_preserve_authorized_transfer_assignment.sql` preserves transfer as a narrowly scoped audited transaction; migration `20260827161634_restrict_officer_transfer_destinations.sql` closes its destination-authorization gap. The public RPC is `security invoker` and delegates to a private, empty-search-path privileged function. That function locks and authorizes the assignment-aware source, then permits an assigned GRO destination only within the same top-level organization hierarchy and a Nodal destination only within that Nodal profile's subtree. Appellate offices, unrelated roots/subtrees, and nonexistent destinations are rejected before the append-only event or ownership update. Successful events contain both organization names for citizen comprehension, move the organization, and let the unchanged assignment trigger select the destination GRO.

Migration `20260827163618_complete_atomic_transfer_and_wrong_route_deadline.sql` completes this domain operation. Destinations must also be active, differ from the current organization, and receive a grievance whose administrative state is still transferable. A successful transaction preserves the grievance/citizen/original record and all related data, records the source organization/officer and destination organization by both ID and human-readable name, runs the existing destination assignment trigger, updates `grievance_priorities.last_meaningful_government_action_at`, notifies the citizen and new GRO, and satisfies any pending wrong-route deadline. `officer_flag_wrong_route` is a separate authenticated, assignment-aware operation that records the exact 48-hour deadline and immutable `WRONG_ROUTE_FLAGGED` event without moving ownership. The public functions remain security-invoker wrappers; their schema-qualified privileged implementations remain in `private` with an empty search path and narrowly granted execution. No grievance RLS policy changed.

Migration `20260825181035_officer_case_workflows.sql` adds authenticated-only, `security invoker` workflow functions. They run under the caller's existing RLS rights and atomically persist the related case records, immutable event, and citizen notification for document requests, clarification requests, interim updates, transfers, and submitted resolutions. They admit GRO and nodal roles only; they do not change the existing RLS policies.

Migration `20260827191500_case_specific_clarifications_and_citizen_reminders.sql` supersedes the message/state-only clarification inference. `officer_request_clarification` now requires assignment-aware GRO or Nodal action authority, locks the source grievance, creates the case-specific request/message/event/notification, and runs the unchanged deterministic priority evaluator. `citizen_respond_to_clarification` requires the owning citizen, locks the request and grievance, optionally validates a same-grievance citizen document, fulfills the exact request, appends `CITIZEN_RESPONDED`, clears the citizen action notification, resumes the government-processing state when no other required citizen action remains, and notifies the assigned GRO. `private.grievance_waiting_on_citizen` now tests unresolved clarification rows for the supplied grievance ID instead of inferring from a broad state/message timestamp combination.

The same migration adds `citizen_reminder_status` and `citizen_send_reminder`. Both require the owning citizen. The send operation locks the grievance, rejects inactive/waiting/cooldown attempts, stores the short citizen message, appends immutable `CITIZEN_REMINDER_SENT`, notifies the assigned GRO, and evaluates priority in the same transaction. Row locking plus the configurable cooldown prevents double-click duplicates; reminder priority remains capped by the existing deterministic engine. No grievance RLS policy was weakened or broadened.

Migration `20260827200000_citizen_document_upload_idempotency.sql` makes citizen uploads idempotent without changing Storage visibility or table policies. The browser first creates an immutable private object under a stable user/grievance/request-item key, then calls the authenticated `security invoker` wrapper `citizen_finalize_document_upload`. Its empty-search-path private implementation locks the citizen-owned grievance, verifies the exact existing Storage object path, returns a prior document for the same key, or atomically inserts one document row, one optional requested-item link, request completion only when all required items are supplied, and one immutable `DOCUMENT_UPLOADED` event. It accepts only citizen-owned cases and citizen-safe document kinds; no service-role key or broad RLS policy is used.

Migration `20260825184054_citizen_resolution_appeal_lifecycle.sql` adds citizen-only, `security invoker` functions for resolution confirmation and appeal creation. They lock the citizen's own grievance, write the appropriate confirmation/outcome state, preserve structured disagreement, append immutable event records, and use the grievance's assigned appellate organization. They do not grant any new case access or alter RLS policies. Follow-up migration `20260826063043_fix_citizen_resolution_outcome_enum_cast.sql` explicitly types the confirmation `CASE` result as `public.outcome_state`; this fixes a live PostgreSQL text-to-enum runtime error without changing lifecycle rules or access scope.

Migration `20260827210000_repair_resolution_lifecycle_terminal_state.sql` records government-response completion and the plain-language achieved outcome without merging lifecycle lanes. Officer submission remains assignment-aware and sets exactly `RESOLUTION_PROVIDED` / `RESOLUTION_PROPOSED` / `AWAITING_CONFIRMATION`, appends `RESOLUTION_SUBMITTED`, and creates the citizen action “Review government's resolution.” Citizen confirmation is serialized by a grievance row lock; an identical retry is a no-op, YES emits `CITIZEN_CONFIRMED_RESOLVED`, PARTLY emits `CITIZEN_CONFIRMED_PARTLY_RESOLVED`, and NO emits `CITIZEN_REJECTED_RESOLUTION`. Matching resolution-review notifications close on confirmation. RLS policies and case visibility were not changed.

Migration `20260827220000_backfill_confirmed_resolution_completion.sql` fills only missing government-response completion timestamps on legacy rows that already contain a final citizen confirmation. It prefers the latest stored non-interim resolution/event timestamp and does not rewrite the administrative, outcome, confirmation, ownership, or history fields.

Migrations `20260826072916_appeal_workflow_actions.sql`, `20260826080322_fix_office_appeal_reply_scope.sql`, and `20260826080712_fix_appeal_reply_recipients.sql` add manual appellate decision/reply transactions. An appeal reply request records `requested_organization_id` in append-only event metadata and targets the grievance's assigned responsible officer. A GRO must match that exact organization; a Nodal user must have existing tree scope over it. A reply appends immutable case/appeal events and notifies the exact Appellate requester stored as the request-event actor. These functions do not modify grievance ownership or lifecycle fields merely to request or provide a reply.
