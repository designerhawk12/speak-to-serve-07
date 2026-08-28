# CPGRAMS Resolution Workspace — Reviewer Guide

> [!IMPORTANT]
> **Demonstration interface — not an official Government of India website.**
>
> This prototype uses synthetic reviewer data and mock authentication behavior. It has no access to live government systems, contains no real citizen PII, and does not imply Government of India endorsement or adoption.

## Reviewer quick start

1. Open the public application and choose **Reviewer Guide / Demo Guide**.
2. Open **Citizen Login** or **Government Officer Login**, then select the email OTP tab.
3. Enter one of the synthetic accounts below.
4. In reviewer mode, use the displayed mock OTP: **`24682468`**.
5. Follow one of the five journeys in this guide.

`MOCK_AUTH_FOR_REVIEW = YES`

The mock code is deliberately public and synthetic. Both the browser presentation and the server validation path must have reviewer mode explicitly enabled. It does not expose, read, or intercept a real Supabase/email-provider OTP. A production deployment must disable reviewer mode and use its configured identity/email/SMS provider.

### Reviewer deployment configuration

- The browser gate is active for the exact verified demo project ref `ptriuuhnesupbdmrmwka`, or for an isolated artifact built with `npm run build:reviewer`. The checked-in `.env.reviewer` contains only the non-secret flag `VITE_REVIEWER_DEMO_MODE=true`. A future production deployment must use another project and/or set `VITE_REVIEWER_DEMO_MODE=false`.
- Deploy the `reviewer-auth` Edge Function with `verify_jwt=false`; the function still refuses all requests unless its server-only `REVIEWER_DEMO_MODE=enabled` gate is present.
- Configure Edge Function values `REVIEWER_DEMO_MODE=enabled`, `REVIEWER_DEMO_OTP=24682468`, and server-only `REVIEWER_DEMO_PASSWORD=<the same password used by the reviewer seed>`.
- Never put `REVIEWER_DEMO_PASSWORD`, the service-role key, or any provider secret in `VITE_*`.
- A normal build enables reviewer presentation only when its configured Supabase project is the exact checked demo project; it is not a global production-auth switch.

## Synthetic accounts

Exactly two synthetic citizens are created. Government accounts are provisioned through the guarded admin seed; there is no public officer registration.

| Role | Email | Organization / best use |
| --- | --- | --- |
| Citizen | `citizen.1@demo-data.cpgrams.in` | Resolution review, appeals, reminders, transfer history, manual routing |
| Citizen | `citizen.2@demo-data.cpgrams.in` | Partial documents, clarification, closure-ready resolution, SLA cases |
| GRO | `gro.urban.pune.a@demo-data.cpgrams.in` | `[DEMO] Urban Lighting Office`, Pune assignment |
| GRO | `gro.urban.pune.b@demo-data.cpgrams.in` | Same office; workload and access-control comparison |
| GRO | `gro.urban.bengaluru@demo-data.cpgrams.in` | Bengaluru-restricted assignment |
| GRO | `gro.water.a@demo-data.cpgrams.in` | Water clarification, routing, transfer deadline |
| GRO | `gro.water.b@demo-data.cpgrams.in` | Water workload distribution and completed documents |
| GRO | `gro.pension.a@demo-data.cpgrams.in` | Pension evidence, resolution, and priority |
| GRO | `gro.pension.b@demo-data.cpgrams.in` | Pension load distribution and reminder cap |
| Nodal Officer | `nodal@demo-data.cpgrams.in` | `[DEMO] Civic Services Supervisory Group` subtree oversight |
| Appellate Authority | `appellate@demo-data.cpgrams.in` | `[DEMO] Appellate Review Cell` filed/decided appeals |

No account password is embedded in the client, documentation, or `profiles`. Reviewer-mode login uses the displayed mock OTP; the server-only demo-account password remains a deployment secret.

## What each role is for

### Citizen

Purpose: describe a problem, accept or change advisory AI routing, track a grievance, answer clarification/document requests, review a government response, confirm **Yes / Partly / No**, and appeal when appropriate.

### GRO

Purpose: act only on grievances currently assigned to that GRO.

Main actions: review the case, request clarification/documents, post progress, transfer a wrongly routed case to an authorized organization, attach evidence, submit a reasoned response, run AI Resolution Intelligence, and close only after the citizen confirms resolved.

### Nodal Officer

Purpose: supervise grievances in an authorized organization subtree.

Main actions: monitor routing, priority, SLA/escalation, and GRO workload; inspect authorized subtree cases; help correct routing where allowed. A Nodal Officer is not a normal transfer destination and does not automatically become the case owner.

### Appellate Authority

Purpose: manually review an appeal after citizen disagreement with the original response.

The workspace shows the original grievance, requested outcome, government response, citizen disagreement, authorized evidence, timeline, and manual appellate decision. Ordinary pre-appeal grievances are not appellate work items.

## Seeded reviewer cases

All titles start with `[REVIEW DEMO]`; all references and people are synthetic.

| Demonstrates | Registration reference |
| --- | --- |
| Low-confidence/manual-routing-friendly streetlight intake | `CPG-2026-D3A00000000000000001` |
| Partial document checklist (1 of 3; two remain) | `CPG-2026-D3A0000000000000000A` |
| Clarification required / Citizen Action Required | `CPG-2026-D3A0000000000000000C` |
| Resolution awaiting citizen review | `CPG-2026-D3A00000000000000010` |
| Citizen-confirmed resolved / assigned-GRO closure ready | `CPG-2026-D3A00000000000000012` |
| Partly resolved with appeal context | `CPG-2026-D3A00000000000000015` |
| Not resolved with appeal context | `CPG-2026-D3A00000000000000017` |
| Decided appeal | `CPG-2026-D3A0000000000000001A` |
| Wrong-routing / 48-hour deadline | `CPG-2026-D3A0000000000000001D` |

The pack also contains fresh, unopened 24h/48h, SLA-risk, critical, clarification-answered, complete-document, interim-update, successful-transfer, reminder, reminder-cap, systemic-cluster, and historical terminal scenarios.

## Journey 1 — AI-first citizen filing

1. Sign in as Citizen 1 and choose **Lodge a grievance**.
2. Enter: “The streetlight outside House 74 in Kothrud, Pune has not worked for three months.”
3. Review the understood problem, requested outcome, suggested existing taxonomy/destination, and missing-information guidance.
4. Use **Continue** when acceptable or **Change** to make a manual selection.
5. Submit and note the GRO selected by the real assignment engine in the case workspace/seed report.

AI guidance is advisory. Original citizen text remains authoritative and the citizen controls the reviewed selection.

## Journey 2 — Citizen → GRO → resolution → confirmation → close

1. Use the seeded partial-document case or create a new case.
2. As its assigned GRO, request clarification and three documents, then post a citizen-visible update.
3. As the owning citizen, answer and upload one requested item at a time; remaining required items must stay visible.
4. As assigned GRO, draft a response and run AI Resolution Intelligence first with: “Forwarded to concerned authority.”
5. Observe the vague/generic warning; improve the response with actual action/outcome/evidence, then submit it.
6. As citizen, review the response and answer **Yes**.
7. Return as the assigned GRO. **Close case** becomes available only now. Close it and verify the terminal case/event remains in history but leaves active queues.

## Journey 3 — Unsatisfied citizen → appeal

1. Use a seeded resolution-review case.
2. As the owning citizen, choose **Partly** or **No** and record what remains unresolved.
3. Use the contextual appeal action and submit.
4. Sign in as the Appellate Authority and compare original grievance, requested outcome, government response, citizen disagreement, evidence, and timeline.
5. Record the manual decision and verify the citizen sees it.

## Journey 4 — Nodal oversight

1. Sign in as the Nodal Officer.
2. Inspect authorized subtree cases, priority/SLA reasons, GRO assignments, analytics, and stored systemic-issue fixtures.
3. Open `CPG-2026-D3A0000000000000001D` to inspect the 48-hour wrong-route requirement.
4. Compare this subtree-wide oversight with an individual GRO's assigned queue.

Escalation changes attention/notification, not legal ownership.

## Journey 5 — access control

1. Open a case assigned to Urban GRO Pune A and note its reference.
2. Sign in as Urban GRO Pune B. It must not appear in GRO B's normal queue or case detail.
3. Sign in as the authorized Nodal Officer. The same case may appear for subtree oversight.
4. Sign in as Appellate Authority before an appeal exists. The ordinary grievance must not be an appellate work item.

## Who is facing the problem?

Citizens trying to raise and follow up public-service grievances—especially people who do not know the responsible department/category or find government workflows difficult to interpret.

Existing CPGRAMS already supports grievance lodging, tracking, clarification, feedback, appeals, multilingual functionality, and advertised AI chatbot/voice functionality. This prototype does **not** claim those capabilities are absent. It explores narrower friction: understanding government taxonomy, making the desired outcome explicit, interpreting status/ownership, seeing Action Required clearly, correcting routing transparently, and checking whether a government response actually addressed the citizen's request.

## What did this prototype change?

1. Problem-first filing before taxonomy selection.
2. Advisory AI grievance understanding and requested-outcome extraction.
3. Suggestions mapped only to existing demo taxonomy/destination IDs.
4. Recommended missing-information guidance without arbitrary AI blocking.
5. Citizen-controlled **Continue / Change** review.
6. Assigned-GRO work ownership plus authorized Nodal subtree oversight.
7. Clear case-specific clarification/document Action Required tasks.
8. Separate government response, real-world outcome, and citizen confirmation lifecycles.
9. Advisory request-vs-response AI analysis that flags vague resolution drafts.
10. Explicit appeal handoff after citizen disagreement.
11. A small navigation/help chatbot restricted to an application route allowlist.

## Where this prototype is stronger

- Less need to understand ministry/category trees before describing a problem.
- The requested outcome is explicit and editable.
- AI assists intake and response quality but is never authoritative.
- Current owner, state, and citizen action are more visible.
- The citizen retains routing review and outcome-confirmation control.
- Citizen/GRO/Nodal/Appellate handoffs can be demonstrated end to end.

## Where production CPGRAMS wins

The real national production platform has nationwide institutional integration; real ministries, departments, states, identities, officer hierarchies, grievance volumes, official processes, security/compliance/infrastructure, public operational dashboards, mature mobile/UMANG integration, existing AI chatbot/voice capability, and real appeal/government machinery.

This prototype does not replace those capabilities.

## Working prototype vs mock/limited

### Working prototype

- Reviewer authentication flow and real Supabase sessions
- Citizen grievance journey and role-based access
- Organization/location assignment and GRO action authority
- Clarification, document requests, partial checklist completion, updates, transfer
- Government resolution, citizen Yes/Partly/No, assigned-GRO final closure
- Appeal filing and manual appellate decision
- Gemini grievance-intake AI and Gemini resolution intelligence
- Allowlisted navigation/help chatbot with deterministic fallback

### Mock or limited

- Synthetic organizations, taxonomy, citizens, officers, cases, documents, and statistics
- Public reviewer OTP behavior
- Government integrations and nationwide taxonomy completeness
- Real SMS/email delivery where not separately configured
- Government authoritative adoption
- Production-scale compliance, threat-model, and security review

## How this could scale safely

- Replace demo taxonomy with verified official taxonomy.
- Connect only authorized government APIs; do not scrape or depend on private APIs.
- Preserve RLS, role authorization, and immutable case events.
- Keep the LLM advisory and validate every suggested taxonomy ID server-side.
- Use production identity/OTP providers, monitoring, rate limits, and abuse protection.
- Preserve human-officer authority for all administrative actions.
- Add reviewed privacy/redaction and retention controls.
- Do not store chain-of-thought.

## Codex and Gemini — distinct contributions

**Codex** was used as a meaningful development tool for architecture and implementation iteration, authentication/workflow repairs, database and RLS review, testing, frontend implementation, AI-gateway integration, and runtime debugging.

**Gemini** is the runtime LLM provider behind the prototype AI gateway's validated advisory intake and resolution-analysis tasks. Gemini is not an OpenAI model. Neither Codex nor Gemini is represented as a government decision-maker.

## Thank you

Thank you to Varun Mayya and the Build What Moves India team for creating the opportunity to rethink public-service experiences from a citizen-first perspective.
