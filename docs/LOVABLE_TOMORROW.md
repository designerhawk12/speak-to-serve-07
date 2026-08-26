# Lovable handoff — tomorrow

This is one existing CPGRAMS website. Continue from the current codebase and connected Supabase project. The priority for the next session is UI/UX and missing presentation surfaces, not replacement architecture.

## What Codex completed today

- Verified the existing repository guidance and implementation status.
- Ran the production build, TypeScript typecheck, and complete test suite.
- Confirmed no simple build-blocking issue required a code change.
- Confirmed the authentication, route, database, priority, case, appeal, and deterministic interpretation contracts documented below remain the active contracts.

Validation today: `npm run build` passed; `npx tsc --noEmit` passed; `npm run test` passed with 55 tests and 140 assertions.

## What must not be changed

Lovable must not:

- recreate Supabase or replace the connected project;
- replace Supabase Auth;
- remove, weaken, or bypass RLS;
- rename database tables, columns, enums, RPCs, or route contracts;
- redesign the separate administrative, outcome, and citizen-confirmation state logic;
- replace the deterministic priority/escalation engine;
- add alternative mock data or silently fall back to fixtures on query failure;
- change ownership, organization scope, or legal case-transition behavior to make UI work;
- expose service-role, Resend, or other server secrets in browser code;
- remove immutable case-event behavior or overwrite the original citizen text;
- refactor unrelated working code.

Preserve all existing API, Supabase, React Query, route, data-adapter, and AI contracts. Focus primarily on UI/UX and missing presentation surfaces.

## Current routes

Public: `/`, `/about`, `/faq`, `/contact`, `/track`, `/appeal-status`, and the public officer directory routes under `/officers/*`.

Authentication: `/auth/login`, `/auth/officer-login`, `/auth/signup`, `/auth/forgot-password`.

Citizen: `/citizen`, `/citizen/grievances/new`, `/citizen/grievances/$id`, `/citizen/grievances/$id/resolution`, `/citizen/grievances/$id/appeal`, `/citizen/grievances/$id/submitted`, `/citizen/appeals/$id`, `/citizen/notifications`, `/citizen/profile`.

Office: `/office`, `/office/cases`, `/office/cases/$id`, `/office/analytics`, `/office/systemic-issues`, `/office/appeals`, `/office/appeals/$id`.

Administrative placeholder: `/admin` for `platform_admin`.

Route authorization is centralized in `src/lib/cpgrams/auth-routing.ts`. Nested routes are independently guarded; do not assume every `/office/*` route is available to every office role.

## Current design system

Use the existing CPGRAMS visual language in `src/styles.css`: government band, page containers, surface/border/text tokens, focus rings, status colors, and responsive spacing. Reuse the established shadcn-style components under `src/components/ui` and CPGRAMS components under `src/components/cpgrams` (shells, `PageHeader`, `Card`, `StatusChip`, `Timeline`, `DataTable`, loading/empty/error states, and document controls). Do not introduce a second component library or a new visual theme.

## Current auth flow

The browser uses one publishable-key Supabase client. `AuthProvider` restores the session, subscribes to `onAuthStateChange`, loads `profiles` by the authenticated user ID, and routes using the database `profiles.role`.

Login supports:

- email/password;
- Supabase email OTP via `signInWithOtp({ options: { shouldCreateUser: false } })`;
- eight-digit OTP verification via `verifyOtp({ type: "email" })`;
- resend countdown and safe errors.

Recovery uses `resetPasswordForEmail` → eight-digit `verifyOtp({ type: "recovery" })` → `updateUser({ password })`. Resend is delivery infrastructure configured through Supabase Auth; the browser never calls Resend directly. OTP values are not application-generated or persisted.

## Current database contract

Use the generated Supabase types and `src/lib/cpgrams/data-access.ts`/`queries.ts`. Browser reads and writes use the publishable client and remain subject to RLS. Existing tables include profiles, organizations, grievance categories, grievances, case events, documents, document requests/items, messages, resolutions, feedback, appeals/events, notifications, AI runs, and issue clusters.

Keep these grievance lanes separate:

- `administrative_state`
- `outcome_state`
- `citizen_confirmation_state`

Meaningful transitions append immutable `case_events`. Citizens see only their own private cases and authorized associated records. The private `grievance-documents` bucket is accessed through authorized records and short-lived signed URLs. Do not add passwords to profiles or create OTP tables.

The persisted priority contract is the deterministic `grievance_priorities` engine with score, level, reasons, escalation, and citizen-wait pause fields. UI may display it but must not recalculate or overwrite it.

## Current working golden scenarios

- `CPG-2026-PENSION1` (Pension): document upload is the citizen Action Required state.
- `CPG-2026-STREETLT` (Streetlight): government resolution review is the citizen Action Required state.

These scenarios must render from Supabase queries, not sample fixtures.

## Current mocked AI features

There is no LangGraph or production AI. `src/lib/cpgrams/ai-contracts.ts` defines the stable interpretation contract and the current deterministic adapter suggests taxonomy/routing from local rules. The officer “AI: Convert to checklist” control is a disabled future hook. Appeal-summary types are a future advisory hook. Do not invent government facts, activity, evidence, priority decisions, or binding outcomes.

## High-value UI work for Lovable tomorrow

- Polish citizen and office dashboard hierarchy, responsive layouts, and empty/loading/error states without changing query behavior.
- Improve case workspace readability: original text, requested outcome, current routing, timeline, action-required cards, SLA/priority explanations, and evidence grouping.
- Improve the new-grievance wizard’s review/final-review presentation while preserving its persisted draft and interpretation contract.
- Improve officer document-request, interim-update, transfer, and resolution composer usability while preserving the existing RPC/event contracts.
- Improve appellate appeal-file presentation and manual decision/reply surfaces.
- Add accessible labels, focus states, mobile layout refinements, and clear success/error feedback where presentation is incomplete.
- Use real query data and existing adapters; do not introduce fixture fallbacks.

## Known issues

- Real Resend delivery and Supabase email-template configuration require dashboard verification; login and recovery templates must render `{{ .Token }}`.
- Authenticated browser acceptance of OTP, uploads/downloads, and some appeal flows remains a manual check.
- Repository-wide lint still reports the existing formatting backlog; changed auth files pass focused lint.
- `.env` is already tracked and contains development secrets; rotate and remove it from Git tracking/history in a separately controlled security task.
- Platform administration and some profile/decision presentation surfaces remain placeholders.
- Do not treat these issues as permission to alter schema, RLS, auth architecture, or business-state logic.
