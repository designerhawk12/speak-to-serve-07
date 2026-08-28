# Taxonomy Status

Last audited: 2026-08-28 against the connected Supabase project.

| Reference data                    | Active rows |                      Hierarchy detail |
| --------------------------------- | ----------: | ------------------------------------: |
| Organizations                     |          12 |  9 nested under a parent organization |
| Grievance categories              |          10 | 5 root categories and 5 subcategories |
| Category-to-organization defaults |          10 | Uses 5 distinct default organizations |

## Status

`TAXONOMY_DATA_INCOMPLETE = YES`

The active records currently combine the earlier prototype seed with the scoped `[DEMO]` data pack. They are not a verified nationwide Government of India taxonomy and must not be described as one.

## Loading and AI contract

- Intake queries all active organizations and categories in explicit 500-row pages; it has no frontend four/six-row cap.
- The AI gateway independently loads every active reference row from Supabase in explicit pages before an `AI_GRIEVANCE_INTAKE` request. It does not receive a fixed demo taxonomy array from the browser.
- With the current 12 active organizations and 10 active categories/subcategories, intake uses one bounded structured provider call. The contract permits two ordinary sequential calls (organization, then related categories) if a future verified import becomes too large; no agent framework is required.
- Provider output can choose only IDs present in that active taxonomy. The gateway re-resolves organization, category, subcategory, hierarchy labels, and category-to-organization defaults from the database before returning a suggestion; invented or unrelated IDs are discarded.
- The offline fallback ranks the taxonomy rows supplied by the database query. It has no hard-coded organization name or category code.
- AI suggestions remain advisory. A validated suggestion is preselected for one-click continuation; the citizen can choose Change, and provider fallback opens the manual selector automatically.

When a larger verified taxonomy is imported through the existing reviewed import path, no classifier architecture change is required: the existing paged query and gateway taxonomy load will automatically include the new active rows.
