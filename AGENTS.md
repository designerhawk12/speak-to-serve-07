<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# CPGRAMS Resolution Workspace — Agent Rules

Read `docs/IMPLEMENTATION_STATUS.md` before starting every new feature and update it when that feature is complete.

1. This repository contains **one website**. Public, citizen, officer, nodal, and appellate experiences are role-based sections of that website.
2. Use the existing connected Supabase project. Do not create a replacement project or database.
3. Before changing data structures, inspect the existing Supabase migrations. Never recreate an existing table.
4. Never weaken, bypass, or remove RLS merely to make a feature work.
5. Never expose a Supabase service-role/secret key to client-side code or `VITE_*` variables.
6. Preserve the existing design system: use `src/styles.css` tokens and the established CPGRAMS/UI components.
7. `administrative_state`, `outcome_state`, and `citizen_confirmation_state` are separate grievance lifecycles. Do not merge or infer one from another.
8. Every meaningful case transition must create a new immutable, append-only `case_events` record. Do not edit or delete events.
9. Preserve the original citizen grievance text verbatim; summaries, translations, and classification are additive only.
10. Citizens may only see their own private cases and associated records. Keep this enforced by Supabase RLS.
11. AI may assist but may not invent government activity, facts, documents, or officer statements, and may not make binding administrative decisions.
12. Do not refactor unrelated working code.
13. Read `docs/IMPLEMENTATION_STATUS.md` before every new feature.
14. Update `docs/IMPLEMENTATION_STATUS.md` when feature work completes.
