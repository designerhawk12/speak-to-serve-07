# Bug repair baseline

Baseline recorded: 2026-08-27. This is an evidence log, not a claim that the listed
features work in a real browser. The in-app browser could not open the local Vite
application (`ERR_BLOCKED_BY_CLIENT`), so cross-device, authenticated, storage, and
cron behaviour still need targeted human or linked-project verification.

## Verification baseline

- `npm run build`: passed.
- `npx tsc --noEmit`: passed.
- `npm run test`: passed — 62 tests, 166 assertions.
- `npm run lint`: failed — 8,542 problems (8,531 errors, 11 warnings), predominantly
  pre-existing CRLF/Prettier formatting violations across the repository.

Status meanings: **REPRODUCED** has a source-level or automated-test reproduction;
**NOT REPRODUCED** has no failing reproduction in this baseline and still needs the
specified acceptance test; **NOT IMPLEMENTED** has no end-to-end implementation;
**WORKING** has an implementation and focused automated/linked evidence, but does
not replace manual browser acceptance where noted.

## Authentication

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| AUTH-01 | REPRODUCED | `AuthProvider.refreshProfile` leaves an authenticated user with `profileState = error`/no user; `RoleGuard` then renders an indefinite loading state rather than an actionable recovery path. Cross-device profile/session timing can expose this. | `src/lib/cpgrams/session.tsx`, `RoleGuard.tsx`, `profiles` select RLS | Two fresh browser profiles sign in, refresh a protected route, and see either their workspace or a recoverable error — never a persistent checking-access screen. |
| AUTH-02 | REPRODUCED | Signup only establishes a session when Supabase Auth Confirm Email is disabled; the UI deliberately reports a missing session otherwise. | `auth.signup.tsx`, `auth-config.ts`, Supabase Auth Confirm Email and signup trigger on `profiles` | Run signup once with Confirm Email on and once off; each must follow the intentionally supported journey without a stranded auth page. |
| AUTH-03 | NOT REPRODUCED | Confirmation redirect is controlled by Supabase Auth redirect allow-list/template configuration, not a repository route alone. | `auth.signup.tsx`, `/auth/login`, Supabase Auth URL configuration/templates | Open a real confirmation link from a second device and verify it returns to the deployed CPGRAMS origin, not Lovable. |
| AUTH-04 | NOT REPRODUCED | Recovery requires Supabase email delivery, valid redirect/OTP template configuration, and a second-device session; no cross-device run was possible here. | `auth.forgot-password.tsx`, `auth-otp.ts`, Supabase Auth recovery settings | Request reset on device A; complete code/recovery and login with new password on device B. |
| AUTH-05 | REPRODUCED | Password login collapses every authentication failure into one generic message, so password mismatch versus other safe recoverable cases is not explained. | `auth.login.tsx`, `auth.officer-login.tsx`, `auth-otp.ts` | Mock invalid credentials, rate limit, and network failure; verify safe, distinct, non-enumerating messages. |
| AUTH-06 | NOT IMPLEMENTED | Password inputs are permanently `type=password`; no visibility toggle exists. | `auth.login.tsx`, `auth.officer-login.tsx`, `auth.signup.tsx`, `auth.forgot-password.tsx` | Render each password form and verify keyboard-accessible show/hide controls preserve value and autocomplete. |
| AUTH-07 | WORKING | Full name is required at signup and stored as allowed user metadata; phone is intentionally optional. No missing required field is established from the current contract. | `auth.signup.tsx`, `auth-workflows.ts`, signup profile trigger, `profiles` | Sign up with/without a name and inspect the resulting profile under RLS; name must be required and role must remain citizen. |

## Routing, assignment, and transfer

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| ROUTE-01 | REPRODUCED | Submission persists the selected organization but never assigns an officer; an unmatched/manual taxonomy choice can remain unassigned and therefore absent from a GRO-only queue. | `data-access.ts:submitNewGrievance`, `grievances.organization_id/assigned_officer_id`, grievance RLS | Submit categorized and manual cases; verify intended organization visibility and an explicit unassigned/assignment state. |
| ROUTE-02 | NOT IMPLEMENTED | Seed/provisioning contains no workload-distribution policy or multiple-GRO assignment mechanism. | seed migrations, `profiles`, `grievances.assigned_officer_id` | Provision multiple GROs and confirm deterministic, auditable distribution with no client-side role inference. |
| ROUTE-03 | NOT IMPLEMENTED | Location is stored as free text only; no location-to-organization/officer assignment rule exists. | `grievances.location_text`, `organizations`, submission flow | Submit cases for distinct supported locations and verify server-side destination/assignment decisions. |
| ROUTE-04 | REPRODUCED | `officer_transfer_grievance` is `SECURITY INVOKER` and updates `grievances.organization_id`; a GRO update policy scoped to the current organization can reject the destination under `WITH CHECK`. | `20260825181035_officer_case_workflows.sql`, core grievance RLS policies | Linked authenticated GRO transfer to an in-scope destination and out-of-scope denial, with exact RLS error captured. |
| ROUTE-05 | WORKING | Transfer SQL appends `CASE_TRANSFERRED`, changes organization, clears assignee, and notifies citizen; presentation needs manual confirmation but the immutable contract exists. | transfer RPC, `case_events`, `grievances`, `notifications` | Execute authorized transfer and verify old/new organization, null assignee, event metadata, and timeline rendering. |
| ROUTE-06 | NOT IMPLEMENTED | No wrong-routing deadline field, evaluator rule, event, or notification is present. | `grievances`, priority migration, transfer RPC | Create a knowingly misrouted case and verify a 48-hour attention event/notification without ownership transfer. |

## Clarification and citizen action

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| CASE-01 | REPRODUCED | Officers can create clarification messages, but the citizen workspace has no reply mutation/form. | `OfficerCaseActions.tsx`, `citizen.grievances.$id.tsx`, `messages` RLS | Citizen submits a clarification response; message, event, notification state, and visible timeline update. |
| CASE-02 | REPRODUCED | Clarification RPC sets `administrative_state = CLARIFICATION_REQUIRED`; no citizen-reply transition clears/advances that state. | clarification RPC, `grievances.administrative_state`, `messages` | Request clarification then submit citizen response; assert state/action card changes deterministically. |
| CASE-03 | REPRODUCED | The priority evaluator can detect a post-request citizen message, but the UI cannot create that message, leaving the practical pause unresolved. | priority migration `grievance_waiting_on_citizen`, `messages`, citizen case route | After citizen reply, next evaluator run removes only inactivity pause and recalculates without changing SLA rules. |
| CASE-04 | NOT IMPLEMENTED | No citizen reminder UI, data-access mutation, or `CITIZEN_REMINDER_SENT` event producer exists. | citizen routes, `case_events`, priority evaluator | Citizen sends one reminder; verify rate limit, event, notification, and visible acknowledgement. |
| CASE-05 | NOT IMPLEMENTED | The backend has a 14-day capped reminder calculation, but the missing reminder producer means the end-to-end contribution cannot occur. | priority migration/config, `priority-engine.ts` | Send reminders through UI and confirm capped persisted score/reason after scheduled evaluation. |

## Documents

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| DOC-01 | NOT REPRODUCED | Evidence classification helpers separate citizen/requested/government/resolution/appeal sections; browser rendering against multi-kind real data is still unverified. | `citizen-resolution.ts`, case route, `documents`/Storage RLS | Seed one row per kind plus one legacy government-evidence row; assert each appears once in its intended section. |
| DOC-02 | WORKING | Request items retain individual `document_id` values and the existing upload flow supports incomplete checklists; browser mutation acceptance remains required. | `document_requests`, `document_request_items`, `uploadCitizenDocument` | Upload one of several required items, refresh, then upload the remainder; verify progress and `fulfilled_at` only after completion. |

## Resolution lifecycle

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| RES-01 | NOT REPRODUCED | Route-boundary and enum-cast regressions have automated and linked rollback-only coverage, but no local browser could exercise the rendered button. | resolution route, `citizen_confirm_resolution`, `feedback`, `case_events` | Human browser: YES/PARTLY/NO submission, visible success/error, refresh, and direct row/event checks. |
| RES-02 | REPRODUCED | Shared outcome metadata contains the citizen-perspective label “You confirmed it's solved”; it can be reused in officer context without an actor-aware presentation adapter. | `src/lib/cpgrams/types.ts`, office status consumers | Render the same outcome for citizen and GRO; citizen sees “You…”, officer sees “Citizen…”. |
| RES-03 | WORKING | Evaluator explicitly zeros completed/disposed/appeal-decided or citizen-confirmed-resolved cases, so original timer escalation is not expected to continue. | priority migration `evaluate_grievance_priority`, `grievance_priorities` | Evaluate a confirmed-resolved case after SLA due date; assert score 0, NORMAL, no active next escalation. |
| RES-04 | WORKING | Same evaluator reset prevents completed cases remaining active/escalated; live cron UI presentation still requires acceptance. | priority migration, `grievance_priorities`, notifications | Evaluate a previously CRITICAL case after confirmation and verify persisted reset without deleting historical events. |
| RES-05 | NOT REPRODUCED | Action-state helpers keep document, clarification, resolution review, and appeal availability separate; concurrent real-state browser validation remains absent. | `citizen-case.ts`, `citizen-resolution.ts`, citizen dashboard/notifications | Exercise each lifecycle combination and compare dashboard group, case action card, and notification action flag. |

## SLA and escalation

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| SLA-01 | WORKING | Configurable 24/48-hour unopened rules exist in SQL and pure-rule tests. | priority migration/config, `priority-engine.ts` | Linked evaluator at 25h and 49h verifies persisted escalation/event/notification. |
| SLA-02 | WORKING | Configurable 3/7-day inactivity rules exist and exclude citizen-wait time. | priority migration/config, `priority-engine.ts` | Linked evaluator at 4d and 8d after meaningful action. |
| SLA-03 | WORKING | 50/75/90/100-percent progression is implemented in SQL and pure tests. | priority migration/config, `grievance_priorities` | Linked fixtures at each threshold verify level/reasons. |
| SLA-04 | WORKING | SQL pause checks outstanding required documents, unanswered clarification, and pending confirmation. | `grievance_waiting_on_citizen`, `grievance_priorities` | Compare otherwise identical stalled cases with and without citizen action pending. |
| SLA-05 | WORKING | Evaluator stores human-readable `priority_reasons`; UI renders persisted reasons. | `grievance_priorities.priority_reasons`, `PriorityIndicator` | Verify reasons for every contributing rule equal the stored evaluator output. |
| SLA-06 | WORKING | CRITICAL evaluation creates responsible-officer and Nodal notifications in linked integration coverage. | priority migration, `notifications`, `case_events` | Linked CRITICAL evaluation asserts both exact recipient rows and one escalation event. |
| SLA-07 | WORKING | SQL and pure tests cap reminder points at 15; end-to-end reminder creation remains absent (CASE-04). | priority migration/config, `priority-engine.ts` | Insert approved reminder events and assert cap; repeat through future citizen reminder UI. |

## Intake and reference data

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| INTAKE-01 | NOT REPRODUCED | The deterministic review step and destination confirmation have tests; actual taxonomy-query/browser failure was not available locally. | `citizen.grievances.new.tsx`, draft/interpretation modules | Browser complete an interpreted route and a manual route through step 5 into completion review. |
| INTAKE-02 | NOT REPRODUCED | Intake query is intended to load categories from Supabase; no linked count/query failure was run in this baseline. | `getIntakeTaxonomy`, `grievance_categories` reference-data access | Compare UI/query category count to authorized database count, including children. |
| INTAKE-03 | NOT REPRODUCED | Intake query is intended to load organizations from Supabase; no linked count/query failure was run in this baseline. | `getIntakeTaxonomy`, `organizations` reference-data access | Compare UI/query organization-tree count to database count. |
| INTAKE-04 | REPRODUCED | Current deterministic adapter recognises only a small seeded cue set; broad classification is deliberately not implemented. | `deterministic-interpretation.ts`, AI contract | Unmatched complaint remains manually completable and matched/non-matched outcomes are explicitly labelled deterministic. |

## Public pages

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| PUBLIC-01 | NOT IMPLEMENTED | `/track` only displays a prototype message and never queries a registration number. | `src/routes/track.tsx`, future public-safe lookup contract/RLS | Public lookup returns only explicitly approved safe fields for a valid and invalid reference. |
| PUBLIC-02 | NOT IMPLEMENTED | `/appeal-status` only displays a prototype message and never queries an appeal reference. | `src/routes/appeal-status.tsx`, future public-safe lookup contract/RLS | Public lookup returns only explicitly approved safe appeal fields for valid/invalid reference. |

## Usability and scale

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| UX-01 | REPRODUCED | Shared citizen wording is not parameterized by viewer role (also RES-02); timeline presentation similarly needs viewer-aware actor labels. | `types.ts`, timeline/data adapters, citizen/office routes | Render one event/outcome under citizen, GRO, Nodal, and Appellate views and assert role-appropriate labels. |
| UX-02 | REPRODUCED | Authorized queue fetches and renders the whole RLS-scoped collection; filters are client-side and no pagination exists. | `getAuthorizedGrievances`, `office.cases.index.tsx`, `DataTable` | Seed a large authorized queue; verify server/seek pagination, filters, stable priority ordering, and accessible page controls. |
| UX-03 | REPRODUCED | Systemic issue page renders an unbounded card list with no query filters, drill-down, or pagination. | `getIssueClusters`, `office.systemic-issues.tsx`, `issue_clusters` | Seed many visible clusters and verify bounded/scalable filtering and navigation. |

## Internationalization

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| I18N-01 | NOT IMPLEMENTED | `profiles.preferred_language` exists but no global language selector or translation system is wired. | `profiles.preferred_language`, profile route, UI strings | Select a language, persist profile preference, refresh, and verify translated chrome. |
| I18N-02 | NOT REPRODUCED | Database fields are text and UI uses normal string rendering, but no Unicode end-to-end submission/query/upload acceptance exists. | grievance/message/resolution text columns, data adapters | Submit and retrieve Hindi, Urdu, Tamil, and mixed-script content without corruption. |
| I18N-03 | NOT IMPLEMENTED | No translation storage, workflow, or viewer-language rendering exists for officer/citizen responses. | messages/resolutions/events, future advisory translation contract | Store original plus clearly labelled translation and verify no original text is overwritten. |

## Lower-priority public/account surfaces

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| LOW-01 | NOT REPRODUCED | FAQ has implemented static content; completeness has no approved content specification. | `src/routes/faq.tsx` | Product/content review against an approved FAQ inventory. |
| LOW-02 | NOT IMPLEMENTED | Contact page is informational only; it has no support request delivery path. | `src/routes/contact.tsx` | Submit a non-sensitive contact request to an approved backend and verify acknowledgement/error handling. |
| LOW-03 | NOT IMPLEMENTED | No sitemap route or generated `sitemap.xml` is present. | route/build configuration | Build and request sitemap; assert all intended public routes and no private routes. |
| LOW-04 | NOT IMPLEMENTED | No complete disclaimer, privacy, accessibility, or policy route set is present. | public routes/footer | Content/legal review and route/link accessibility test. |
| LOW-05 | NOT IMPLEMENTED | No authenticated account-deactivation UI or approved server-side lifecycle exists. | Auth/profile routes, Supabase Auth, `profiles` | Deactivate an account through an approved reversible lifecycle; verify session revocation and retained case audit rules. |

## Baseline risk summary

The highest-risk confirmed causes are the profile-error loading trap (AUTH-01), lack of
citizen clarification/reply and reminder pathways (CASE-01 through CASE-05), unsecured-by-design
assignment coverage and likely transfer RLS `WITH CHECK` failure (ROUTE-01/04), and the absence of
public-safe tracking contracts (PUBLIC-01/02). The role-language and large-queue defects are
presentation defects but will become operationally significant with real workload volume.
