# BUILD CONTRACT — CPGRAMS Resolution Workspace

This contract is permanent. Any future change (human or agent) must comply with it.
If a request conflicts with this contract, raise the conflict instead of silently breaking it.

## 1. One website only

There is exactly ONE web application. Public, Citizen, Government Officer, Nodal/Supervisor and
Appellate Authority experiences are role-based sections of this same application. Never create a
second frontend, a separate admin app, or a parallel portal.

## 2. Supabase/Postgres is the single source of truth

All authoritative data lives in the connected Supabase/Postgres project. No second database, no
localStorage-as-database, no mock data layer promoted to production truth. Client-side state is a
cache of the database, never the record.

## 3. Citizen outcome status and administrative status are separate, always

"Government disposed the case" and "citizen confirms the problem was solved" are two distinct
fields with distinct lifecycles. Disposal never implies resolution. Never merge, derive, or
overwrite one from the other, and never display them as a single status.

## 4. Meaningful case changes create immutable events

Every material change (registration, routing, assignment, action recorded, information requested,
disposal, citizen outcome report, appeal filing, appeal decision) appends an immutable timeline
event. Events are append-only: never edited, never deleted. Corrections are new events.

## 5. AI never invents government actions

AI may summarise, classify, suggest routing, and surface similar or systemic cases. It must never
fabricate an action, a document, an officer statement, or a case fact. Any AI-derived text is
labelled as AI-generated and shows its basis.

## 6. AI advises but never decides

AI cannot close a grievance, reject a grievance, dispose a case, or decide an appeal. Those actions
require an identified human officer or Appellate Authority and are recorded against that person.

## 7. Logged-in citizens automatically see their own grievances

A signed-in citizen never has to type a registration number to find their own cases. Their
grievances, appeals and pending actions appear automatically in their workspace.

## 8. Citizens describe the problem before selecting government taxonomy

The intake flow asks for the problem in the citizen's own words first. Ministry, department,
category and sub-category selection comes later, is assisted, and stays mostly behind the
interface.

## 9. The appeal path must be visible and understandable

Appeal eligibility, how to appeal, what an appeal reviews, its current stage, and its outcome must
be explained in plain language and reachable from the case itself. Appeals are never hidden behind
jargon or buried navigation.

## 10. Original citizen grievance text is preserved

The citizen's original wording is stored verbatim and always displayable. Summaries, translations,
and rewrites are additional fields — they never replace the original text.

## 11. Future work extends the existing design system

New UI must use the tokens in `src/styles.css` and the components in `src/components/cpgrams/`.
Do not hardcode colours, do not introduce a competing component library, and do not restyle the
product wholesale. Green means citizen-confirmed success only; amber means action/warning; red
means critical/escalation.

## 12. Future agents must not refactor unrelated working code

Changes stay scoped to the request. No opportunistic rewrites of routing, data access, styling, or
components that the task did not require.
