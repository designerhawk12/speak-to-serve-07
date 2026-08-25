# Citizen Resolution Hub

Continue this as a single unified web application called “CPGRAMS Resolution Workspace”. This is a redesign of India's public grievance portal. The product principle is: citizens should describe their problem in normal language, government taxonomy should remain mostly behind the interface, cases should explain what is actually happening, and “government disposed the case” must remain separate from “citizen confirms the problem was solved”. IMPORTANT ARCHITECTURE RULES: - Build ONE website only. - Public, Citizen, Government Officer, Nodal/Supervisor and Appellate Authority experiences are role-based sections of the same application. - Use React + TypeScript and the existing Lovable stack. - Use a reusable component/design system. - Supabase/PostgreSQL will be the authoritative backend. - Do not implement real AI yet; create clean interfaces/placeholders for later AI integration. - Do not invent a second frontend or second database. Create the foundational architecture and visual system. PUBLIC ROUTES: / /about /faq /contact /track /appeal-status /officers/central /officers/states /officers/appeals AUTH ROUTES: /auth/login /auth/signup /auth/forgot-password /auth/officer-login CITIZEN ROUTES: /citizen /citizen/grievances/new /citizen/grievances/:id /citizen/grievances/:id/resolution /citizen/grievances/:id/appeal /citizen/appeals/:id /citizen/notifications /citizen/profile GOVERNMENT ROUTES: /office /office/cases /office/cases/:id /office/appeals /office/appeals/:id /office/analytics /office/systemic-issues Create role-aware route guards/shells but do not fake production permissions yet. DESIGN: Create a modern, trustworthy government-service design system. Use government blue as primary, neutral surfaces, green only for confirmed success, amber for action/warning, red for critical/escalation. Avoid flashy startup gradients. Use generous whitespace and strong information hierarchy. Mobile-first for citizens. Officer screens may be denser on desktop. Everything must remain responsive. Create reusable components for: - application header - public navigation - citizen navigation - government workspace navigation - status chip - status explanation card - SLA indicator - grievance card - timeline - timeline event - Action Required card - requested-outcome card - file/document card - AI suggestion card - KPI card - filter bar - data table - loading state - empty state - error state - confirmation dialog Create placeholder pages for every route so navigation works. HOME PAGE: Primary CTA: “Describe your problem / Lodge a grievance” Citizen Login Government Officer Login Track grievance How it works Public dashboards Nodal officer directories Do not call the government login “Employer Login”. Create these documentation files in the repository: docs/BUILD_CONTRACT.md docs/IMPLEMENTATION_STATUS.md BUILD_CONTRACT.md must permanently record: 1. one website only 2. Supabase/Postgres source of truth 3. citizen/admin outcome statuses are separate 4. meaningful case changes create immutable events 5. AI never invents government actions 6. AI advises but does not close/reject grievances or decide appeals 7. logged-in citizens automatically see their own grievances 8. citizens describe problems before selecting government taxonomy 9. appeal must be visible and understandable 10. preserve original citizen grievance text 11. future work must extend the existing design system rather than redesign it 12. future agents must not refactor unrelated working code IMPLEMENTATION_STATUS.md should describe what this prompt implemented and what remains. Do not build advanced feature logic yet. Finish with a working navigable responsive foundation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ef5a312-2e44-4ce0-aa72-2223110e1599).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
