# AI Architecture

## Security boundary

All model access is contained in `supabase/functions/ai-gateway/index.ts`. React knows only the
Edge Function name and sends no provider credential. `GEMINI_API_KEY`, when used, is a Supabase
Edge Function secret and must never be placed in a `VITE_*`, `NEXT_PUBLIC_*`, React component, or
browser request. The optional OpenAI provider remains server-only under the same rule.

The function supports public guidance/intake and authorized GRO/Nodal advisory tools. Its platform
JWT check is disabled deliberately in `supabase/config.toml`,
but the function implements this boundary:

- an optional bearer token is verified with Supabase Auth;
- guidance requests receive navigation/help only and cannot attach or retrieve a grievance;
- GRO/Nodal-only summary/comparison tasks require a caller-scoped RLS-authorized grievance read;
- a GRO must also be the current `assigned_officer_id`; a Nodal Officer remains limited by the
  existing RLS organizational subtree;
- the caller-scoped client reads private data; the service-role client is used only for rate-limit,
  audit access to `ai_runs`, and active public-reference taxonomy loading;
- public and authenticated calls are capped per minute using a salted request fingerprint. Raw
  addresses, tokens, and messages are not stored.

No database migration or RLS change is required. The existing `ai_runs` table is the audit sink.

## Request types

`grievance_intake` runs after the citizen describes the problem. It reads every active organization
and category directly from Supabase in explicit pages, then returns a validated multilingual
summary, extracted requested outcome, completion prompts, and only taxonomy IDs from that active
database set. The citizen still manually confirms the routing/category. It replaces neither the
original citizen wording nor the existing local data-driven fallback.

`officer_summary` is available only to a GRO or Nodal Officer for an RLS-authorized grievance. It
returns a read-only concise case summary, key facts, current citizen-required action, and open
questions. It never mutates a case or recommends a binding action.

`resolution_compare` is available only to an assigned GRO or an RLS-subtree-authorized Nodal
Officer. It compares the original complaint/requested outcome, category/current case context, and
the officer's unsaved response/evidence reference. The validated assessment distinguishes
addressed, partially addressed, likely unresolved, and insufficient-information responses; it
explicitly flags forwarding/processing/disposal boilerplate that does not establish the requested
outcome. It is multilingual and advisory, never blocks or submits the resolution, and is rejected
at runtime if it claims legal adequacy, entitlement, forced submission, or closure.

`translate` is presentation-only. It returns a validated translation only when a provider is
configured and the input does not contain detected direct identifiers; otherwise the UI shows the
authoritative original text.

`classify_intake` runs during final review and returns one advisory class:
`ACTIONABLE_GRIEVANCE`, `POSSIBLE_RTI`, `POSSIBLE_SUB_JUDICE`,
`GOVERNMENT_EMPLOYEE_SERVICE_MATTER`, `RELIGIOUS_OR_NON_SERVICE_MATTER`, `SUGGESTION`, or
`UNCERTAIN`. The response always has `advisory = true` and `can_continue = true`. It cannot reject
a grievance or confirm routing.

`guidance_chat` is a small FAQ/navigation assistant for the prototype, filing, Action Required,
clarifications/documents, roles, tracking, resolution review, and appeals. It does not query or
summarize private cases. It returns at most one route from the explicit actual-route allowlist in
`ai-core.ts`; an invented route or URL in any provider field is discarded. Private-case questions
receive generic direction to My grievances, sign-in, or privacy-safe public tracking.

## Provider, validation, and failure behavior

`StructuredProvider` isolates provider-specific behavior. Gemini is the configured production
provider when `AI_PROVIDER=gemini` and `GEMINI_API_KEY` exist; it uses Gemini's server-side
Interactions API with a JSON response format/schema. `AI_MODEL` remains configurable (the Gemini
fallback default is `gemini-2.5-flash`). The optional OpenAI Responses provider remains available
only when explicitly selected. Provider responses use strict JSON Schema and are parsed again with
strict Zod schemas. Unknown fields, including chain-of-thought, are rejected.

Each attempt has a bounded timeout (`AI_TIMEOUT_MS`, default 8000, maximum 20000) and at most two
retries (`AI_RETRY_LIMIT`, default 1). Only timeouts, 408, 429, and 5xx failures are retryable.
Provider requests set `store: false`. Prompt versions are constants in
`supabase/functions/_shared/ai-core.ts` and every audit row stores the applicable version.

Before provider transmission, common direct identifiers—email, Indian mobile numbers, 12-digit
identity-number patterns, and long account-number patterns—are redacted. The authoritative source
text is not modified. Audit rows store only input length, redaction count, result type, model label,
validation status, prompt version, fallback state, an authorization-safe grievance ID, a salted
fingerprint, and PII-redacted structured output. They never store the raw prompt, hidden reasoning,
access token, or document contents.

Prompts and runtime checks prohibit binding activity. The assistant cannot reject, close, transfer,
assign, resolve, dispose, or decide a grievance or appeal, or invent events, evidence, officer
statements, or government actions. A provider answer that claims such an action, gives a binding
resolution conclusion, or suggests an unapproved route is discarded and replaced with deterministic
guidance.

Every task has a deterministic/original-text fallback. Audit failure returns unavailable rather
than serving an unaudited result. Intake stays manually completable, officers can continue their
own review, and the chatbot retains useful filing/My grievances/Track/Appeal/FAQ navigation when
Gemini is unavailable.

## Server configuration

The function works in deterministic fallback mode without a provider key. To enable Gemini, set
these only as Supabase Edge Function secrets:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=<server secret>
AI_MODEL=<Gemini model identifier>
AI_TIMEOUT_MS=8000
AI_RETRY_LIMIT=1
AI_RATE_LIMIT_SALT=<long random server secret>
```

`OPENAI_API_KEY` is needed only when deliberately selecting the optional `AI_PROVIDER=openai` path.

Deploy `ai-gateway` with `verify_jwt=false` because anonymous public guidance is intentional. Never
copy `SUPABASE_SERVICE_ROLE_KEY` into application environment files; Supabase supplies it to the
Edge Function runtime.

## Acceptance checks

1. An anonymous visitor receives general guidance and no case data.
2. Chat requests cannot attach a grievance UUID or trigger a private case query; case questions
   return only generic sign-in/My grievances/public-tracking guidance.
3. Every suggested chatbot route is an actual allowlisted application route; invented URLs are
   rejected and replaced with deterministic navigation.
4. Intake suggestions use all active taxonomy rows and never auto-confirm routing.
5. An assigned GRO or RLS-subtree-authorized Nodal user can obtain an advisory summary and response
   comparison; an unrelated/unassigned GRO and every unauthenticated caller are denied before model
   use.
6. Provider failure returns deterministic/manual guidance or original text.
7. An `ai_runs` row exists with a prompt version, validated structured output, and no raw input or
   chain-of-thought.
