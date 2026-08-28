# AI Contracts

## Grievance interpretation

The citizen intake flow is designed around the citizen's words, not a ministry-first taxonomy picker. Any future interpretation service, including a Codex or LangGraph implementation, must preserve this UI flow and return the following typed contract from `src/lib/cpgrams/ai-contracts.ts`:

```ts
{
  issue: string
  structured_summary: string
  requested_outcome: string | null
  detected_location: string | null
  detected_identifiers: string[]
  suggested_government_level: string | null
  suggested_organization_id: string | null
  suggested_organization: string | null
  suggested_category_id: string | null
  suggested_category: string | null
  suggested_subcategory_id: string | null
  suggested_subcategory: string | null
  missing_required: string[]
  missing_recommended: string[]
  optional_suggestions: string[]
  confidence: number
}
```

The current development adapter is deterministic and local. It recognises only a small set of seeded taxonomy cues and may be unavailable without blocking manual completion. It does not call an AI provider, make a routing decision, create a case event, or claim that a government action occurred.

## Implementation rules

- The original citizen grievance text is the authoritative record and must be persisted unchanged.
- `requested_outcome` is a first-class citizen statement and must remain distinct from government resolutions and outcome state.
- Government taxonomy remains database-backed. An interpretation can suggest a destination; the citizen can confirm it or explicitly request manual selection.
- A future service must not change field names, make a binding administrative decision, infer facts as government activity, or redesign the eight-step intake UI without an explicit product decision.
- Failures must leave the citizen able to continue manually. Do not silently turn a failed interpretation into an invented result.
- AI assistance is advisory only. RLS, server/database logic, and authorised officials remain responsible for access and administrative decisions.

## Eligibility guidance

The pre-submission gateway returns:

```ts
{
  kind: "eligibility_result"
  classification:
    | "ACTIONABLE_GRIEVANCE"
    | "POSSIBLE_RTI"
    | "POSSIBLE_SUB_JUDICE"
    | "GOVERNMENT_EMPLOYEE_SERVICE_MATTER"
    | "RELIGIOUS_OR_NON_SERVICE_MATTER"
    | "SUGGESTION"
    | "UNCERTAIN"
  confidence: number
  guidance: string
  can_continue: true
  advisory: true
  provider: string
  prompt_version: string
  fallback_used: boolean
}
```

This is guidance, not admissibility or routing authority. The UI always permits manual
continuation, and a destination remains unconfirmed until the citizen confirms it in the existing
taxonomy step.

## Citizen guidance assistant

```ts
{
  kind: "guidance_result"
  answer: string
  suggested_actions: string[]
  case_context_used: boolean
  disclaimer: string
  provider: string
  prompt_version: string
  fallback_used: boolean
}
```

Private context is optional and may be used only after server-side Auth verification, an
RLS-authorized query, and explicit citizen ownership verification. Anonymous requests never
receive private case data. The contract contains no model reasoning and grants no permission to
create government activity.
