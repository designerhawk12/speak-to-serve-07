# AI Architecture

## Security boundary

All model access is contained in `supabase/functions/ai-gateway/index.ts`. React knows only the
Edge Function name and sends no provider credential. `OPENAI_API_KEY`, when used, is a Supabase
Edge Function secret and must never be placed in a `VITE_*` variable, React component, or browser
request.

The function supports public guidance and authenticated citizen case guidance. Its platform JWT
check is disabled deliberately in `supabase/config.toml`, but the function implements this boundary:

- an optional bearer token is verified with Supabase Auth;
- anonymous calls receive only general guidance;
- a requested case requires a verified user, `profiles.role = citizen`, an RLS-authorized query,
  and an explicit `grievances.citizen_id = auth user id` owner check;
- officers and other citizens cannot attach a grievance to a chatbot request;
- the caller-scoped client reads private data; the service-role client is used only for rate-limit
  and audit access to `ai_runs`;
- public and authenticated calls are capped per minute using a salted request fingerprint. Raw
  addresses, tokens, and messages are not stored.

No database migration or RLS change is required. The existing `ai_runs` table is the audit sink.

## Request types

`classify_intake` runs during final review and returns one advisory class:
`ACTIONABLE_GRIEVANCE`, `POSSIBLE_RTI`, `POSSIBLE_SUB_JUDICE`,
`GOVERNMENT_EMPLOYEE_SERVICE_MATTER`, `RELIGIOUS_OR_NON_SERVICE_MATTER`, `SUGGESTION`, or
`UNCERTAIN`. The response always has `advisory = true` and `can_continue = true`. It cannot reject
a grievance or confirm routing.

`guidance_chat` answers general questions about CPGRAMS, filing, statuses, and appeals. A signed-in
citizen can optionally select one of their own grievances. The provider receives only registration
number, title, lifecycle states, organization name, and dates. It does not receive the profile,
original narrative, requested outcome, messages, documents, evidence, or private event text.

## Provider, validation, and failure behavior

`StructuredProvider` isolates provider-specific behavior. The current provider uses OpenAI's
Responses API only when `AI_PROVIDER=openai` and `OPENAI_API_KEY` exist. `AI_MODEL` is configurable;
the default is `gpt-5-mini`. Provider responses use strict JSON Schema and are parsed again with
strict Zod schemas. Unknown fields, including chain-of-thought, are rejected.

Each attempt has a bounded timeout (`AI_TIMEOUT_MS`, default 8000, maximum 20000) and at most two
retries (`AI_RETRY_LIMIT`, default 1). Only timeouts, 408, 429, and 5xx failures are retryable.
Provider requests set `store: false`. Prompt versions are constants in
`supabase/functions/_shared/ai-core.ts` and every audit row stores the applicable version.

Before provider transmission, common direct identifiers—email, Indian mobile numbers, 12-digit
identity-number patterns, and long account-number patterns—are redacted. The authoritative source
text is not modified. Audit rows store only input length, redaction count, result type, model label,
validation status, prompt version, fallback state, an authorization-safe grievance ID, and a salted
fingerprint. They never store the raw prompt, hidden reasoning, access token, or document contents.

Prompts and runtime checks prohibit binding activity. The assistant cannot reject, close, transfer,
assign, resolve, dispose, or decide a grievance or appeal, or invent events, evidence, officer
statements, or government actions. A provider answer that claims such an action or unavailable case
context is discarded and replaced with deterministic guidance.

Eligibility and chat both have deterministic, audited fallbacks. Audit failure returns unavailable
rather than serving an unaudited result. Intake stays manually completable and the chatbot displays
a visible safe error.

## Server configuration

The function works in deterministic fallback mode without a provider key. To enable OpenAI, set
these only as Supabase Edge Function secrets:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<server secret>
AI_MODEL=gpt-5-mini
AI_TIMEOUT_MS=8000
AI_RETRY_LIMIT=1
AI_RATE_LIMIT_SALT=<long random server secret>
```

Deploy `ai-gateway` with `verify_jwt=false` because anonymous public guidance is intentional. Never
copy `SUPABASE_SERVICE_ROLE_KEY` into application environment files; Supabase supplies it to the
Edge Function runtime.

## Acceptance checks

1. An anonymous visitor receives general guidance and no case data.
2. An anonymous or unrelated user who supplies a grievance UUID receives a generic denial.
3. A signed-in citizen can select their own grievance and receives only the minimized status.
4. Final intake review classifies all documented examples without blocking submission.
5. Provider failure returns deterministic/manual guidance.
6. An `ai_runs` row exists with a prompt version and no raw input or chain-of-thought.
