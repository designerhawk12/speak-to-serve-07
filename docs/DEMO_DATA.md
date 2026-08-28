# CPGRAMS Prototype Demo Data

> [!IMPORTANT]
> Everything created by this pack is fictional prototype data. It is not Government of India data, does not represent real citizens or officers, and does not record real government activity.

The repeatable demo pack populates the existing Supabase schema and exercises the existing RLS, assignment, lifecycle, priority, notification, document, appeal, and analytics contracts. It does not add a table, migration, policy, trigger, or alternative business rule.

## Safety boundary

The seed/reset script refuses to run unless all of the following are true:

- `NODE_ENV` is not `production`.
- `DEMO_DATA_TARGET=development`.
- `REVIEWER_RESET_CONFIRM=development`.
- `REVIEWER_DEMO_PROJECT_REF` exactly matches both the `SUPABASE_URL` host and the `project_id` in `supabase/config.toml`.
- server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available.
- seeding also has a server-only `DEMO_DATA_PASSWORD`.

Do not place the service-role key or demo password in a `VITE_*` variable. They must never enter the browser bundle. Use a development Supabase project or an explicitly approved development/demo environment.

The pack owns only its fixed `d3000000-...` records, exact `@demo-data.cpgrams.in` Auth users, and exact `demo-pack` Storage paths. It also removes only the explicitly enumerated legacy `@demo.cpgrams.in` accounts and `90000000-...` / `91000000-...` fixture case IDs. A normal reseed removes and recreates reviewer case data while retaining/updating the scoped reviewer accounts and reference rows. Reset removes scoped reviewer/legacy accounts, case data, clusters, and known files while preserving organizations and grievance taxonomy. Unrelated users and records are never selected by a broad email pattern or unbounded delete.

## Commands

Add these server-only values to the local `.env` used for the development project:

```dotenv
SUPABASE_URL=https://your-development-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-development-service-role-key
DEMO_DATA_TARGET=development
REVIEWER_RESET_CONFIRM=development
REVIEWER_DEMO_PROJECT_REF=ptriuuhnesupbdmrmwka
DEMO_DATA_PASSWORD=choose-a-development-only-password
```

Preview the target refs, guard result, planned counts, and scenario manifest without connecting to Supabase:

```bash
npm run reviewer:data:check
```

Create or repeat the pack:

```bash
npm run reviewer:data:seed
```

Remove the pack, including its Auth users and private demo files:

```bash
npm run reviewer:data:reset
```

For a stable presentation snapshot, the script also accepts an ISO timestamp:

```bash
bun --env-file=.env scripts/seed-demo-data.ts --seed --target=development --at=2026-08-28T09:00:00.000Z
```

The last command is still development-gated. Reset is intentionally explicit and should not be run against a production environment.

## Demo accounts

Every account uses the password supplied through `DEMO_DATA_PASSWORD`; no password is stored in source, documentation, React code, or the profiles table.

| Persona             | Email                                                                      | Demonstrates                                                |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Citizen A/B         | `citizen.1@demo-data.cpgrams.in`, `citizen.2@demo-data.cpgrams.in`         | 16/15 private cases across lifecycle states                 |
| Urban GRO Pune A    | `gro.urban.pune.a@demo-data.cpgrams.in`                                    | Same-organization multi-GRO distribution, Pune jurisdiction |
| Urban GRO Pune B    | `gro.urban.pune.b@demo-data.cpgrams.in`                                    | Same-organization multi-GRO distribution, Pune jurisdiction |
| Urban GRO Bengaluru | `gro.urban.bengaluru@demo-data.cpgrams.in`                                 | Location-restricted Bengaluru assignment                    |
| Water GRO A/B       | `gro.water.a@demo-data.cpgrams.in`, `gro.water.b@demo-data.cpgrams.in`     | Two eligible GROs in one organization                       |
| Pension GRO A/B     | `gro.pension.a@demo-data.cpgrams.in`, `gro.pension.b@demo-data.cpgrams.in` | Two eligible GROs in one organization                       |
| Nodal supervisor    | `nodal@demo-data.cpgrams.in`                                               | Organization-subtree analytics, priority, and clusters      |
| Appellate authority | `appellate@demo-data.cpgrams.in`                                           | Filed, under-review, and manually decided appeals           |

The seed creates confirmed Supabase Auth users for demo use only and links `auth.users.id` to `profiles.id`. Roles always come from `profiles.role`; no frontend role selector or email-derived role is used.

## Expected inventory

The reviewed manifest produces the following inventory when the guarded remote seed is run:

| Record group                   |                       Count |
| ------------------------------ | --------------------------: |
| Auth/profile accounts          |                          11 |
| Demo organizations             |                           5 |
| Demo category/subcategory rows |                           6 |
| Grievances                     |                          31 |
| Resolution rows                | 14 (12 final and 2 interim) |
| Appeals                        |                           6 |
| Decided appeals                |                           2 |
| Stored systemic issue clusters |                           3 |
| Seeded notifications           |                           8 |

Organization distribution is 13 Urban Lighting, 8 Water Service, and 10 Pension Service grievances. Locations include two Pune wards, Bengaluru East Zone, two Nashik wards, New Delhi, and Pune pension cases. The two citizens own 16 and 15 cases respectively.

The seed does not hard-code assignees. It prints the workload produced by the live assignment trigger after each guarded seed. Fair assignment is based on current active assigned-case count, eligibility, and stable tie-breaking—not equal lifetime totals—so terminal historical rows can make total counts differ. Location eligibility remains stronger than balancing: Bengaluru rows are not assigned to Pune-restricted officers.

## Scenario catalogue

All registration numbers below are synthetic, high-entropy-shaped demo references.

| Feature                           | Example case/reference             | Expected presentation                                                                                       |
| --------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Manual-routing guidance           | `...00001`                         | Mixed civic description remains citizen-reviewable while using the existing advisory AI/manual routing flow |
| Fresh cases                       | `...00001`, `...00002`, `...00003` | Newly assigned work across urban, water, and pension queues                                                 |
| Unopened 24h/48h                  | `...00004`, `...00005`             | Deterministic unopened priority reasons; 48h case is stronger                                               |
| SLA risk 75%/90%                  | `...00006`, `...00007`             | Monotonic SLA-risk contribution and explanation                                                             |
| Critical/SLA breached             | `...00008`, `...00009`             | CRITICAL queue plus GRO and Nodal notifications; ownership unchanged                                        |
| Partial document request          | `...0000A`                         | Pension checklist is 1 of 3; two required items remain                                                      |
| Completed document request        | `...0000B`                         | Water checklist is 2 of 2 and processing has resumed                                                        |
| Clarification outstanding         | `...0000C`                         | Citizen Action Required and government inactivity pause                                                     |
| Clarification answered            | `...0000D`                         | Recorded citizen response and resumed processing                                                            |
| Interim updates                   | `...0000E`, `...0000F`             | Action, blocker, next step, and expected date                                                               |
| Resolution review                 | `...00010`, `...00011`             | Government response awaiting citizen Yes/Partly/No review                                                   |
| Citizen-confirmed, ready to close | `...00012`                         | Confirmation is recorded but administrative state remains non-closed for the assigned-GRO closure journey   |
| Closed historical cases           | `...00013`, `...00014`             | Terminal history retained; active inactivity escalation stopped                                             |
| Partly resolved                   | `...00015`, `...00016`             | Structured remaining issue and contextual appeal state                                                      |
| Not resolved                      | `...00017`, `...00018`             | Rejection event, requested correction, and appeal availability                                              |
| Filed/under-review appeals        | `...00015`, `...00017`-`...00019`  | Populated Appellate queue with original-case context                                                        |
| Decided appeals                   | `...0001A`, `...0001B`             | Manual appellate decisions and immutable events                                                             |
| Completed transfer                | `...0001C`                         | Human-readable owner change without raw-UUID-only copy                                                      |
| 48-hour transfer risk             | `...0001D`                         | Wrong-route detection time, due time, and remaining time                                                    |
| Citizen reminder                  | `...0001E`                         | Reminder event and factual priority contribution                                                            |
| Reminder cap                      | `...0001F`                         | Many historical reminders with capped priority contribution                                                 |

The complete references use the prefix `CPG-2026-D3A`; for example, the partial-document case is `CPG-2026-D3A0000000000000000A`.

## Geographic/systemic clusters

- `[DEMO] Repeated streetlight outages in Pune wards`: 13 linked urban-lighting cases.
- `[DEMO] Repeated low water supply in Nashik wards`: 8 linked water cases.
- `[DEMO] Pension payment delays across demo locations`: 10 linked pension cases.

These are current stored demo cluster rows. Their descriptions explicitly say they are prototype fixtures and not AI-generated findings or official systemic conclusions.

## UI coverage

- **Citizen Dashboard:** each citizen has multiple private cases; Action Required, active, resolution-review, appealed, closure-ready, and closed states are represented across both accounts.
- **GRO queue:** 31 cases exercise organization/location assignment, actionable priority ordering, waiting-on-citizen pauses, transfer risk, filters, and pagination-ready data.
- **Nodal analytics:** real seeded lifecycle states, priorities, reminders, transfers, appeals, response timing, and stored issue-cluster membership populate the existing RLS-scoped metrics.
- **Appellate queue:** six appeals span filed, under-review, and two decided states with linked resolution, citizen disagreement, and timeline context.
- **Documents:** private text fixtures contain only a `[DEMO DATA]` label and fictional item name. They demonstrate partial/completed checklist behavior without PII.
- **FAQ:** the existing public FAQ includes searchable filing, document-request/upload, email OTP, appeal, status, and eligibility prototype examples; FAQ content is code-owned and is not duplicated as database seed data.
- **Directory:** all five organization records and six taxonomy rows start with `[DEMO]` and must remain presented as prototype data, never an official directory.

### Public dashboard limitation

The seed contains the states needed to calculate realistic aggregate statistics, but the current public dashboard deliberately does not publish live aggregates because the repository has no approved privacy-safe anonymous aggregate contract. The seed command prints exact demo counts for a presenter, while authenticated Nodal analytics uses the stored data under RLS. Do not replace the public dashboard with static invented metrics or expose private tables to make it look populated; add a reviewed privacy-safe aggregate endpoint in a separate feature if the product later authorizes one.

## Repeatability and business-rule preservation

- Grievances are inserted without a hard-coded assignee so the existing organization/location eligibility and least-active-load trigger performs assignment.
- Priority rows are derived with the existing deterministic `calculatePriority` contract. Reasons are factual inputs from the fixture; no fabricated AI reason is used.
- Terminal cases keep historical priority/event records but do not continue active original-case escalation.
- Case and appeal events are inserted as immutable historical facts for the fictional scenario; the script never edits existing event history.
- Document fixtures use unique Storage paths, document rows, checklist relationships, and idempotency keys.
- Lifecycle lanes remain separate: administrative, citizen-confirmation, and outcome states are seeded independently.
- No production rule, schema, migration, trigger, RPC, grant, or RLS policy is changed by this pack.
