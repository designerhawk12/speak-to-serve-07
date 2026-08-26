# Database Schema

Source of truth: `supabase/migrations/20260825105942_d7f35e31-6933-4b5b-9a04-c5ece3d37d7b.sql`, followed by the subsequent migrations in `supabase/migrations/`, including `20260825181035_officer_case_workflows.sql`, `20260825184054_citizen_resolution_appeal_lifecycle.sql`, and `20260825201506_deterministic_priority_auto_escalation.sql`.

## Identity and organization

- `profiles`: application profile keyed to `auth.users`; stores the role, organization, name, and contact preferences. Authenticated users may update only their own name, phone, and preferred language; role and organization assignment are privileged provisioning data.
- `organizations`: government organization tree using `parent_id`; supports central, state, district, local body, and appellate levels.
- `grievance_categories`: category hierarchy with a default organization and SLA.

## Case records

- `grievances`: the primary case record. `original_text` is required and must remain preserved. It has independent `administrative_state`, `outcome_state`, and `citizen_confirmation_state` fields.
- `case_events`: immutable case timeline records. Authenticated users have select/insert access through case authorization; no authenticated update/delete policy exists.
- `documents`: metadata for private grievance files, with the object path stored in `storage_path`. A citizen can read only their own upload or a row marked `citizen_visible`; authorized staff retain their case-level access. The private Storage-object policy uses the identical rule before a signed URL can be created.
- `document_requests` and `document_request_items`: requests made to a citizen and the documents satisfying them.
- `messages`: citizen-visible or internal case communication.
- `resolutions`: officer-authored proposed or recorded resolutions. In addition to action and proposed outcome, it now records citizen next step, resolution narrative, partial/unresolved reason, evidence reference, and interim-update blocker/next-step/date fields where applicable.
- `feedback`: citizen confirmation of real-world outcome, including what was fixed, what remains unresolved, requested correction, and an optional supporting document. This remains distinct from government resolution records.

## Priority and attention escalation

- `grievance_priorities`: one protected row per grievance containing the deterministic `priority_score`, `priority_level`, human-readable `priority_reasons`, assignment/open/action timestamps, current attention escalation level, next threshold, and whether government-inactivity timing is paused for citizen action. Authenticated staff can only select rows for grievances already authorized by RLS; browser users receive no write grant.
- `private.priority_engine_config`: the single auditable threshold/weight configuration row. It is not exposed through the Data API.
- `private.calculate_grievance_priority`: pure deterministic calculation over case facts and configuration. It does not transfer, dispose, assign, or otherwise change legal ownership/lifecycle state.
- `private.evaluate_grievance_priority` and `private.evaluate_all_grievance_priorities`: internal persistence, immutable-event, and notification functions. `PRIORITY_CHANGED` and `ESCALATION_TRIGGERED` are internal case events.
- `public.officer_mark_grievance_opened`: authenticated GRO/nodal RPC with explicit case authorization. It records the first open idempotently and appends a non-citizen-visible `CASE_OPENED` event.
- Supabase Cron job `cpgrams-priority-evaluation` runs the private evaluator every 15 minutes. HIGH sends attention to the responsible officer; CRITICAL/SLA breach also notifies authorized Nodal supervision. No escalation changes the grievance organization or assigned officer.

## Appeals and notifications

- `appeals`: appeal record linked to a grievance and an appellate organization.
- `appeal_events`: append-only appeal timeline records.
- `notifications`: per-user notices, including read state.

## Advisory and systemic-analysis records

- `ai_runs`: records of AI-assisted processing. It is not permission to make a binding decision or invent case activity.
- `issue_clusters` and `issue_cluster_members`: staff-facing systemic issue grouping and membership.

## Access model documented by the migrations

- Citizens can read their own grievances, appeals, and authorized related records.
- GROs can access grievances assigned to their own organization.
- Nodal users can access grievances in their organization subtree.
- Appellate users can access cases/appeals assigned to their appellate organization.
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

Migration `20260825181035_officer_case_workflows.sql` adds authenticated-only, `security invoker` workflow functions. They run under the caller's existing RLS rights and atomically persist the related case records, immutable event, and citizen notification for document requests, clarification requests, interim updates, transfers, and submitted resolutions. They admit GRO and nodal roles only; they do not change the existing RLS policies.

Migration `20260825184054_citizen_resolution_appeal_lifecycle.sql` adds citizen-only, `security invoker` functions for resolution confirmation and appeal creation. They lock the citizen's own grievance, write the appropriate confirmation/outcome state, preserve structured disagreement, append immutable event records, and use the grievance's assigned appellate organization. They do not grant any new case access or alter RLS policies. Follow-up migration `20260826063043_fix_citizen_resolution_outcome_enum_cast.sql` explicitly types the confirmation `CASE` result as `public.outcome_state`; this fixes a live PostgreSQL text-to-enum runtime error without changing lifecycle rules or access scope.

Migrations `20260826072916_appeal_workflow_actions.sql`, `20260826080322_fix_office_appeal_reply_scope.sql`, and `20260826080712_fix_appeal_reply_recipients.sql` add manual appellate decision/reply transactions. An appeal reply request records `requested_organization_id` in append-only event metadata and targets the grievance's assigned responsible officer. A GRO must match that exact organization; a Nodal user must have existing tree scope over it. A reply appends immutable case/appeal events and notifies the exact Appellate requester stored as the request-event actor. These functions do not modify grievance ownership or lifecycle fields merely to request or provide a reply.
