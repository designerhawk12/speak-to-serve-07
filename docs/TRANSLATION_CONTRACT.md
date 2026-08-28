# Translation presentation contract

Translations are presentation assistance, never an authoritative case record or an administrative
decision. The original grievance, clarification, message, and resolution text remains exactly as
filed or authored. The browser may call a configured server-only Supabase Edge Function through
`VITE_TRANSLATION_EDGE_FUNCTION`; provider credentials and provider-specific API calls must remain
inside that server function and must never be exposed in browser configuration.

The server endpoint contract is:

```ts
{
  text: string
  source_language: string
  target_language: string
  content_type: "grievance" | "clarification" | "message" | "resolution"
}
```

It must return only:

```ts
{ translated_text: string, provider?: string }
```

The server must authenticate the caller and verify that the caller is authorised to view the source
record before sending any private text to a provider. It may cache a successful translation using a
source-content hash, target language, provider, and provider version, but must not overwrite source
columns. The browser holds a short in-memory cache only for successful responses. If no endpoint is
configured, the endpoint fails, the caller is unauthorised, or the response is invalid, the UI shows
the original text and never fabricates a translation. A translated display always provides a View
original text toggle.
