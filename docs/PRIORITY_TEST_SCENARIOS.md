# Deterministic priority test scenarios

These are development/test fixtures for the existing deterministic priority and escalation engine. They are not production seed data, do not alter configured thresholds, and never change legal ownership.

The generator uses one evaluation snapshot. By setting `PRIORITY_TEST_SCENARIOS_AT`, a developer can reproduce exactly the same timestamps without waiting days. Its displayed priority rows are calculated from the repository's tested priority-rule contract; the existing scheduled Postgres evaluator will independently recalculate from the persisted case facts on its normal run.

## Safety and commands

The generator requires both explicit environment guards and rejects `NODE_ENV=production`:

```powershell
$env:PRIORITY_TEST_SCENARIOS_CONFIRM = "development"
$env:PRIORITY_TEST_SCENARIOS_TARGET = "development"
npm run demo:priority-scenarios -- --at=2026-08-28T12:00:00.000Z
```

It needs the existing server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Neither is sent to the browser. Do not run it against production.

Remove only these generated scenarios:

```powershell
$env:PRIORITY_TEST_SCENARIOS_CONFIRM = "development"
$env:PRIORITY_TEST_SCENARIOS_TARGET = "development"
npm run demo:priority-scenarios:remove
```

The generator creates only registration numbers prefixed `DEV-PRIORITY-P` and cleans up the associated fixture records. It does not touch the older priority-fixture script or any citizen-created case.

## Scenario matrix

| Scenario                | Persisted facts                                       | Expected deterministic result                                             |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| P1_NORMAL               | Freshly assigned and opened; recent government action | NORMAL, 0; no priority contributor                                        |
| P2_UNOPENED_24H         | Assigned 25 hours ago; never opened                   | ELEVATED, 20; assigned/not-opened reason                                  |
| P3_UNOPENED_48H         | Assigned 49 hours ago; never opened                   | HIGH, 45; stronger assigned/not-opened reason and high-priority attention |
| P4_INACTIVE_3D          | Opened; last meaningful action 73 hours ago           | ELEVATED, 20; government inactivity reason                                |
| P5_INACTIVE_7D          | Opened; last meaningful action 169 hours ago          | HIGH, 45; stronger government inactivity reason                           |
| P6_SLA_50               | 50% of response target elapsed                        | NORMAL, 10; factual 50% SLA reason                                        |
| P7_SLA_75               | 75% of response target elapsed                        | ELEVATED, 25; factual 75% SLA reason                                      |
| P8_SLA_90               | 90% of response target elapsed                        | HIGH, 45; factual 90% SLA reason                                          |
| P9_SLA_100              | Response target breached                              | CRITICAL, 70; SLA-breach reason                                           |
| P10_WAITING_CITIZEN_7D  | Required document outstanding for 7 days              | NORMAL, 0; government-inactivity escalation paused                        |
| P11_REMINDER_1          | One in-window citizen reminder                        | NORMAL, 5; one-reminder contribution                                      |
| P12_REMINDER_SPAM       | Eight in-window reminder events                       | NORMAL, 15; contribution remains capped at 15                             |
| P13_CRITICAL_ESCALATION | Breached SLA plus 3-day inactivity                    | CRITICAL, 90; GRO and authorized Nodal attention; ownership unchanged     |
| P14_RESOLVED_OLD        | Historical confirmed-resolved government response     | NORMAL, 0; original-case escalation stopped                               |

“Why this priority?” must show only the stored factual reasons: SLA progression, elapsed government inactivity, reminder contribution/cap, waiting-on-citizen pause, and other configured deterministic inputs. It does not invent activity or explanations.

## Automated checks

`tests/priority-test-scenarios.test.ts` asserts every P1–P14 scenario at a fixed timestamp, including monotonic 50/75/90/100 SLA progression, the citizen-wait pause, reminder cap, terminal suppression, and the CRITICAL GRO/Nodal audience contract.

`supabase/tests/priority_engine_integration.sql` remains the linked rollback-only authority for the database evaluator's CRITICAL event and responsible-officer/Nodal notifications. It uses controlled timestamps and leaves no data behind.
