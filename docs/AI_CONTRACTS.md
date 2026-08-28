# AI Contracts

## Grievance interpretation

The citizen intake flow is designed around the citizen's words, not a ministry-first taxonomy picker. The existing single gateway and any future compatible provider must preserve this UI flow and return the following typed contract from `src/lib/cpgrams/ai-contracts.ts`:

```ts
{
  original_language: string
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
  route_confidence: number
  route_explanation: string | null
  intake_type:
    | "ACTIONABLE_GRIEVANCE"
    | "POSSIBLE_RTI"
    | "POSSIBLE_SUB_JUDICE"
    | "GOVERNMENT_EMPLOYEE_SERVICE_MATTER"
    | "RELIGIOUS_OR_NON_SERVICE"
    | "SUGGESTION"
    | "UNCERTAIN"
  eligibility_guidance: string | null
}
```

The current intake path calls the server-side `grievance_intake` gateway after the citizen describes the problem. The gateway loads every active organization and category/subcategory directly from Supabase, including organization/category relationships, and sends the current database taxonomy to one structured provider call. The current 12-organization/10-category taxonomy is small enough for that bounded call. If a larger verified taxonomy later makes one call inefficient, the same workflow may use two ordinary sequential calls (organization, then that organization's categories) without adding an agent framework.

Provider output is accepted only after strict runtime validation. The server then re-resolves every suggested organization, category, subcategory, hierarchy label, and category-to-organization default from the active database rows. Unknown IDs and invented labels are discarded. The provider-free fallback ranks only the active taxonomy rows supplied by the database query; it does not contain an authoritative fixed category or organization. A fallback is visibly marked and opens the existing manual taxonomy selector rather than being treated as an accepted AI route.

## Implementation rules

- The original citizen grievance text is the authoritative record and must be persisted unchanged.
- The gateway detects `original_language` from the original complaint. Citizen-facing interpretation fields are requested in that language or the citizen's selected language. Supported intake language codes are English, Hindi, Gujarati, Marathi, Bengali, Telugu, Assamese, Odia, Tamil, Malayalam, Urdu, Sindhi, Bodo, Konkani, Nepali, Manipuri, Punjabi, Kannada, Dogri, Maithili, Kashmiri, Sanskrit, and Santhali; `und` represents genuinely unknown input.
- `requested_outcome` is a first-class citizen statement and must remain distinct from government resolutions and outcome state.
- Government taxonomy remains database-backed. A validated interpretation preselects the best existing route; the citizen normally continues with that selection and opens manual selection only by choosing Change or when the provider cannot determine a safe route.
- `route_confidence < 0.65` is a presentation warning, not a rejection rule. The best valid candidate may remain preselected while manual correction becomes prominent.
- Route acceptance has exactly three presentation outcomes: a valid route at/above the threshold is resolved; a valid route below the threshold remains visible with a review warning; provider fallback or missing/inactive route IDs opens manual selection. Recommended or optional missing information never changes a valid route into a fallback.
- Eligibility is evaluated before a normal taxonomy route is presented. `POSSIBLE_RTI`, `POSSIBLE_SUB_JUDICE`, `GOVERNMENT_EMPLOYEE_SERVICE_MATTER`, `RELIGIOUS_OR_NON_SERVICE`, and `SUGGESTION` results must not inherit an unrelated nearest service category. When no relevant active taxonomy route exists, route IDs remain null and the citizen receives advisory guidance plus manual continuation; the gateway never invents an RTI or suggestion category.
- Model-declared missing information is not automatically REQUIRED. The server clears model-required fields and treats them as recommendations; only deterministic product validation may require a field.
- A future provider must not change field names, make a binding administrative decision, infer facts as government activity, or redesign the eight-step intake UI without an explicit product decision.
- Failures must leave the citizen able to continue manually. Do not silently turn a failed interpretation into an invented result.
- AI assistance is advisory only. RLS, server/database logic, and authorised officials remain responsible for access and administrative decisions.
- Citizen complaint text is data, not instructions. Prompt-injection wording cannot authorize an arbitrary taxonomy entry, submission, assignment, transfer, status change, resolution, or appeal decision.

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
  suggested_route:
    | "/"
    | "/about"
    | "/faq"
    | "/track"
    | "/auth/login"
    | "/auth/signup"
    | "/citizen"
    | "/citizen/grievances/new"
    | "/citizen/notifications"
    | "/appeal-status"
    | null
  suggested_action_label: string | null
  disclaimer: string
  provider: string
  prompt_version: string
  fallback_used: boolean
}
```

This is deliberately a navigation/help layer. It does not query or summarize private cases, accept
a grievance UUID, or perform arbitrary database/tool calls. Case-status questions direct an
authenticated citizen to `/citizen`; an unauthenticated visitor receives generic sign-in/public
tracking guidance without case facts. Provider routes are discarded unless they exactly match the
allowlist above, and URLs embedded in model prose are rejected. Missing-provider/failure behavior
uses deterministic filing, My grievances, Track, Appeal, and FAQ navigation. The contract contains
no model reasoning and grants no permission to create government activity.

## Final advisory gateway tasks

The single server-side `ai-gateway` also exposes these validated, non-binding task contracts:

- `AI_GRIEVANCE_INTAKE` (`grievance_intake`): multilingual issue/summary understanding,
  requested-outcome extraction, detected location/identifiers, missing-information checks, and
  suggestions limited to active database taxonomy IDs. The citizen continues with a validated
  suggestion or explicitly selects Change; provider failure opens the manual selector.
- `AI_OFFICER_SUMMARY` (`officer_summary`): an authenticated GRO/Nodal-only summary of an
  RLS-authorized case. It is read-only and uses no hidden case data.
- `AI_RESOLUTION_COMPARE` (`resolution_compare`): an authenticated, action-authorized GRO or
  RLS-subtree-authorized Nodal comparison of a proposed response against the recorded citizen
  request. Input includes the original complaint, requested outcome, category/current case context,
  unsaved resolution fields, and the officer's existing evidence/reference metadata. Its validated
  result is:

  ```ts
  {
    assessment:
      | "ADDRESSES_REQUEST"
      | "PARTIALLY_ADDRESSES_REQUEST"
      | "LIKELY_UNRESOLVED"
      | "INSUFFICIENT_INFORMATION"
    citizen_requested: string
    government_says_it_did: string
    addressed_points: string[]
    unresolved_points: string[]
    generic_response_warning: boolean
    evidence_gap: string | null
    explanation: string
    suggested_improvement: string
    confidence: number
  }
  ```

  Forwarded/processed/disposed boilerplate does not establish that the citizen's requested outcome
  occurred; concrete completed action and a verifiable reference are materially stronger. The
  model may compare across citizen/government languages, but original text remains authoritative.
  The advisory cannot approve, block, submit, close, transfer, determine entitlement, claim legal
  correctness, or decide the response or an appeal.

- `AI_TRANSLATE` (`translate`): presentation-only translation. The original stored text remains
  authoritative and is shown whenever provider translation is unavailable.

Every response is runtime validated, marked advisory, audited without chain-of-thought, and has a
deterministic/original-text fallback. Gemini is the server-only configured provider under
`AI_PROVIDER=gemini`; `GEMINI_API_KEY` is never available to the browser. The gateway does not create a grievance, alter a lifecycle
state, assign or transfer a case, confirm an outcome, or decide an appeal.
