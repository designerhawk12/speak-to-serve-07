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

AUTH-01 through AUTH-07 repair verification on 2026-08-27: `npm run build`,
`npx tsc --noEmit`, and `npm run test` passed (69 tests, 185 assertions). Targeted
lint has no errors (two pre-existing Fast Refresh warnings in `session.tsx`). The
repository-wide lint backlog was not changed.

Status meanings: **REPRODUCED** has a source-level or automated-test reproduction;
**NOT REPRODUCED** has no failing reproduction in this baseline and still needs the
specified acceptance test; **NOT IMPLEMENTED** has no end-to-end implementation;
**WORKING** has an implementation and focused automated/linked evidence, but does
not replace manual browser acceptance where noted.

## Authentication

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| AUTH-01 | WORKING | The previous profile-error loading trap is removed: the centralized phase model now distinguishes initialization, profile loading, authorization, and profile unavailability; the latter renders retry/sign-out controls instead of a redirect/bounce. Real second-device acceptance remains required. | `session.tsx`, `RoleGuard.tsx`, `auth-workflows.ts`, `profiles` select RLS | Two fresh browser profiles sign in, refresh a protected route, and see either their workspace or a recoverable error — never a persistent checking-access screen. |
| AUTH-02 | WORKING | Signup now treats Supabase's session and no-session outcomes as valid, rather than requiring Confirm Email to be disabled. | `auth.signup.tsx`, `auth-url.ts`, signup trigger on `profiles` | Run signup once with Confirm Email on and once off; each must follow the intentionally supported journey without a stranded auth page. |
| AUTH-03 | WORKING | Confirmation/recovery callbacks now use central `/auth/callback`; final dashboard URL allow-list/template configuration is documented in `AUTH_SETUP.md` and must be performed by the project administrator. | `auth-url.ts`, `auth.callback.tsx`, Supabase Auth URL configuration/templates | Open a real confirmation link from a second device and verify it returns to the deployed CPGRAMS origin, not Lovable. |
| AUTH-04 | WORKING | Recovery now supplies the shared callback URL on every request; the default implicit flow establishes a session on the device that opens a valid link, and the callback also exchanges a PKCE code when present before exposing password update. Final email delivery/second-device acceptance requires dashboard configuration. | `auth.forgot-password.tsx`, `auth.callback.tsx`, `auth-otp.ts`, Supabase Auth recovery settings | Request reset on device A; complete code/recovery and login with new password on device B. |
| AUTH-05 | WORKING | Password forms validate locally and map credential/rate/network/confirmation errors to safe actionable messages. | `auth.login.tsx`, `auth.officer-login.tsx`, `auth-workflows.ts` | Mock invalid credentials, rate limit, and network failure; verify safe, distinct, non-enumerating messages. |
| AUTH-06 | WORKING | Reusable `PasswordField` supplies keyboard-accessible show/hide controls in login, signup, and recovery forms. | `PasswordField.tsx`, auth routes | Render each password form and verify keyboard-accessible show/hide controls preserve value and autocomplete. |
| AUTH-07 | WORKING | Full name, email, password, and mobile are required; optional gender/location are retained only as non-authorizing Auth metadata because no profile columns exist. The trigger continues to default role to citizen. | `auth.signup.tsx`, `auth-workflows.ts`, signup profile trigger, `profiles` | Sign up with/without each required field and inspect the resulting profile under RLS; role must remain citizen. |

## Routing, assignment, and transfer

| ID | Status | Likely root cause | Files/tables/policies involved | Test that should prove the fix |
| --- | --- | --- | --- | --- |
| ROUTE-01 | WORKING | The missing server-side assignment step was the cause. A guarded trigger now assigns a submitted/routed grievance when it has an organization and an eligible active GRO; if no GRO is eligible, it remains explicitly unassigned rather than leaking into another office. | `20260827145039_officer_assignment_and_queue_scaling.sql`, `grievances.assigned_officer_id`, `CASE_ASSIGNED` | Rollback-only linked test inserts categorized cases and verifies organization-correct assignment plus immutable assignment history. |
| ROUTE-02 | WORKING | Profiles already supported multiple GROs per organization, but there was no assignment configuration or fair selector. `officer_assignment_profiles` and the deterministic least-loaded/oldest-last-assigned selector now provide both; the guarded demo seed provisions two Pune GROs in one organization plus a Bengaluru GRO and the existing Pune GRO in another organization. | `officer_assignment_profiles`, assignment trigger, `configure-demo-auth.mjs` | Unit test distributes eight equivalent cases across four GROs as 2/2/2/2; linked test distributes eight Pune cases across the two eligible same-organization GROs as 4/4. |
| ROUTE-03 | WORKING | Free-text location previously had no officer-jurisdiction contract. Assignment configuration now supports optional state, district, and normalized location-term restrictions, evaluated only after exact organization eligibility. | `officer_assignment_profiles`, `grievances.state_name/district_name/location_text`, assignment trigger | Unit and rollback-only linked tests prove Pune is never assigned to the Bengaluru-restricted GRO and Bengaluru selects that GRO. |
| ROUTE-04 | WORKING | R2 review found that the privileged transfer function authorized the source but accepted any existing destination. Migration `20260827161634_restrict_officer_transfer_destinations.sql` moves the privileged implementation to `private`, keeps the public RPC security-invoker, and checks the existing hierarchy server-side: assigned GRO destinations must share the source hierarchy root; Nodal destinations must be in the profile's subtree; appellate and unrelated destinations fail. No grievance RLS policy changed. | R2 transfer migrations, `private.execute_officer_transfer`, `private.can_act_on_grievance`, organization tree, assignment trigger | Linked authenticated rollback test proves authorized GRO/Nodal success, unauthorized/nonexistent/citizen/unrelated/wrong-assignee rejection, unchanged failed cases, destination assignment, immutable named event history, and transaction rollback. |
| ROUTE-05 | WORKING | Transfer appends immutable source/destination history, changes the current organization, and immediately resolves a new eligible assignee where available. | transfer RPC, assignment trigger, `case_events`, `grievances`, `notifications` | Linked test verifies current destination ownership and both transfer/reassignment records without retaining mutations. |
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
| UX-02 | WORKING | The queue previously fetched the entire authorized collection and filtered it in React. `/office/cases` now queries the RLS-preserving `officer_case_queue` view with exact-count pages (default 25; maximum 100), stable priority/submission/id ordering, and query-level search, priority, state, authorized-organization, location, and assignee filters. | `officer_case_queue`, `getAuthorizedGrievancePage`, `useAuthorizedGrievancePageQuery`, `office.cases.index.tsx` | Unit tests prove bounded inclusive ranges; linked authenticated SQL proves a three-row bounded page; build/typecheck and focused lint prove the rendered controls compile. |
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
