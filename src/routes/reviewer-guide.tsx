import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Gavel,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REVIEWER_ACCOUNTS,
  REVIEWER_CASE_REFERENCES,
  REVIEWER_DEMO_OTP,
  type ReviewerPersona,
} from "@/lib/cpgrams/reviewer-demo";

export const Route = createFileRoute("/reviewer-guide")({
  head: () => ({
    meta: [
      { title: "Reviewer Guide — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Synthetic reviewer accounts, guided journeys, prototype capabilities, and limitations.",
      },
    ],
  }),
  component: ReviewerGuide,
});

const personaDescriptions: Record<ReviewerPersona, { purpose: string; actions: string[] }> = {
  Citizen: {
    purpose:
      "Describe a problem, accept or change advisory AI routing, follow the case, complete requested actions, review the response, and appeal when appropriate.",
    actions: [
      "Problem-first filing and requested-outcome review",
      "Clarification and document responses",
      "Yes / Partly / No outcome confirmation",
      "Appeal after disagreement",
    ],
  },
  GRO: {
    purpose: "Act on grievances currently assigned to that GRO—not every case in an organization.",
    actions: [
      "Request clarification or documents",
      "Post progress and transfer wrongly routed work",
      "Draft a reasoned response and use AI Resolution Intelligence",
      "Close only after the citizen confirms resolved",
    ],
  },
  "Nodal Officer": {
    purpose:
      "Supervise an authorized organization subtree without becoming the normal legal owner or transfer destination.",
    actions: [
      "Monitor priority, SLA, routing, escalation, and workload",
      "Inspect cases throughout the authorized subtree",
      "Help correct routing where policy authorizes it",
    ],
  },
  "Appellate Authority": {
    purpose: "Review an appeal only after citizen disagreement with an original response.",
    actions: [
      "Compare original grievance, requested outcome, response, and disagreement",
      "Inspect authorized evidence and relevant timeline",
      "Record a manual appellate decision",
    ],
  },
};

const journeys = [
  {
    title: "1 — AI-first citizen filing",
    steps: [
      "Sign in as Citizen 1 and choose Lodge a grievance.",
      'Enter: “The streetlight outside House 74 in Kothrud, Pune has not worked for three months.”',
      "Review the understood issue, requested outcome, destination/category suggestion, and missing-information guidance.",
      "Continue with the suggestion or choose Change, then submit.",
      "Open the new case and note the assigned GRO shown by the live assignment engine.",
    ],
  },
  {
    title: "2 — Citizen → GRO → resolution → confirmation → close",
    steps: [
      `Use the seeded partial-document case ${REVIEWER_CASE_REFERENCES.partialDocuments}, or create a new case.`,
      "As its assigned GRO: request clarification, request documents, and post an interim update.",
      "As the owning citizen: answer and upload requested evidence one checklist item at a time.",
      'In the resolution composer, first analyze “Forwarded to concerned authority.” and inspect the AI warning.',
      "Improve the response with action and evidence, then submit it.",
      "As citizen, answer Yes. Return as assigned GRO and choose Close case; verify history remains available.",
    ],
  },
  {
    title: "3 — Unsatisfied citizen → appeal",
    steps: [
      `Sign in as Citizen 2 and open ${REVIEWER_CASE_REFERENCES.resolutionReview}.`,
      "Choose Partly or No, record what remains unresolved, and use the contextual appeal action.",
      "Sign in as the Appellate Authority and open the new appeal.",
      "Compare the original grievance, requested outcome, response, citizen disagreement, evidence, and timeline.",
      "Record the manual appellate decision and verify it appears for the citizen.",
    ],
  },
  {
    title: "4 — Nodal oversight",
    steps: [
      "Sign in as the Nodal Officer and open the office dashboard, queue, analytics, and systemic issues.",
      `Open the 48-hour routing case ${REVIEWER_CASE_REFERENCES.transferDeadline}.`,
      "Compare the subtree-wide view with an individual GRO queue and inspect priority/SLA reasons.",
      "Observe that escalation changes attention—not legal ownership.",
    ],
  },
  {
    title: "5 — Access control",
    steps: [
      "Open an assigned case as Urban GRO Pune A and note its reference.",
      "Sign in as Urban GRO Pune B: that case must not appear in the normal queue or case workspace.",
      "Sign in as the authorized Nodal Officer: the case may appear for subtree oversight.",
      "Sign in as Appellate Authority: an ordinary grievance without an appeal is not an appellate work item.",
    ],
  },
] as const;

function ReviewerGuide() {
  return (
    <PublicShell>
      <section className="border-b border-critical/30 bg-critical-surface">
        <div className="page-container py-5 text-critical">
          <p className="text-sm font-bold tracking-wide uppercase">
            Demonstration interface — not an official Government of India website
          </p>
          <p className="mt-1 text-sm">
            This prototype uses synthetic reviewer data and mock authentication behavior. It has no
            access to live government systems and does not imply government endorsement.
          </p>
        </div>
      </section>

      <div className="page-container space-y-14 py-10 md:py-14">
        <PageHeader
          eyebrow="Build What Moves India"
          title="Reviewer Guide"
          description="A short, repeatable path through the citizen, GRO, Nodal, and Appellate experiences—plus an honest account of what is working and what remains mocked."
          actions={
            <Button asChild>
              <Link to="/auth/login">Start reviewer login</Link>
            </Button>
          }
        />

        <section className="space-y-5" aria-labelledby="quick-start">
          <div className="space-y-2">
            <StatusChip label="Mock auth for review: YES" tone="warning" dot={false} />
            <h2 id="quick-start" className="text-2xl font-bold">
              Reviewer quick start
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Choose any synthetic account below. On the OTP tab, enter its email and use the
              public reviewer code <code className="rounded bg-muted px-1.5 py-0.5">{REVIEWER_DEMO_OTP}</code>.
              In a production deployment, authentication would use the configured identity and
              email/SMS provider; this public code is deliberately limited to reviewer mode.
            </p>
          </div>

          {(["Citizen", "GRO", "Nodal Officer", "Appellate Authority"] as ReviewerPersona[]).map(
            (persona) => (
              <div key={persona} className="space-y-3">
                <h3 className="text-lg font-semibold">{persona}</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {REVIEWER_ACCOUNTS.filter((account) => account.persona === persona).map((account) => (
                    <Card key={account.email} className="border-border">
                      <CardContent className="space-y-2 p-4">
                        <p className="break-all font-mono text-sm font-semibold text-primary">
                          {account.email}
                        </p>
                        <p className="text-sm">{account.organization}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Best for: {account.bestFor}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ),
          )}
        </section>

        <section className="space-y-5" aria-labelledby="roles">
          <h2 id="roles" className="text-2xl font-bold">
            What each role is for
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(personaDescriptions).map(([persona, description]) => (
              <Card key={persona} className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {persona === "Citizen" ? (
                      <UserRound className="size-5 text-primary" aria-hidden />
                    ) : persona === "Appellate Authority" ? (
                      <Gavel className="size-5 text-primary" aria-hidden />
                    ) : (
                      <ShieldCheck className="size-5 text-primary" aria-hidden />
                    )}
                    {persona}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description.purpose}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {description.actions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="journeys">
          <h2 id="journeys" className="text-2xl font-bold">
            Five reviewer journeys
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {journeys.map((journey) => (
              <Card key={journey.title} className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{journey.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm leading-relaxed">
                    {journey.steps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="story">
          <h2 id="story" className="text-2xl font-bold">
            The reviewer story
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader><CardTitle className="text-lg">Who faces the problem?</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>Citizens trying to raise and follow up public-service grievances—especially people who do not know the responsible department/category or find institutional workflows difficult to interpret.</p>
                <p>Existing CPGRAMS already supports grievance lodging, tracking, clarification, feedback, appeals, multilingual functionality, and advertised AI chatbot/voice capabilities. This prototype does not claim otherwise.</p>
                <p>The friction explored here is understanding taxonomy, making the requested outcome explicit, seeing responsibility and Action Required clearly, and assessing whether a response actually addressed that outcome.</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-lg">What changed?</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {[
                    "Problem-first filing before government taxonomy",
                    "Advisory AI issue/outcome understanding and existing-taxonomy suggestions",
                    "Citizen-controlled Continue or Change routing review",
                    "Assigned-GRO work ownership plus Nodal subtree oversight",
                    "Explicit clarification/document Action Required tasks",
                    "Government resolution kept separate from citizen confirmation",
                    "AI request-vs-response analysis for vague resolution drafts",
                    "Clear citizen disagreement and appeal handoff",
                  ].map((item) => <li key={item} className="flex gap-2"><ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="honesty">
          <h2 id="honesty" className="text-2xl font-bold">
            What works and what is mocked
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-success/30 bg-success-surface">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-success"><CheckCircle2 className="size-5" />Working prototype</CardTitle></CardHeader>
              <CardContent className="text-sm text-success">
                <p>Reviewer authentication flow; private citizen case journey; role gates; assignment; clarification; document requests; progress; transfer; resolution; citizen confirmation; appeal; Gemini intake AI; Gemini resolution intelligence; allowlisted navigation guidance.</p>
              </CardContent>
            </Card>
            <Card className="border-warning/30 bg-warning-surface">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-warning-foreground"><CircleAlert className="size-5" />Mock or limited</CardTitle></CardHeader>
              <CardContent className="text-sm text-warning-foreground">
                <p>Synthetic organizations, taxonomy, citizens, officers, cases, and evidence; reviewer OTP; government integrations; nationwide taxonomy completeness; real SMS/email delivery where unconfigured; authoritative adoption; and production-scale compliance/security review.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-labelledby="comparison">
          <Card className="border-border">
            <CardHeader><CardTitle id="comparison" className="text-lg">Where this prototype is strongest</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Problem-first intake, natural-language taxonomy guidance, requested-outcome extraction, completion guidance, visible ownership and actions, citizen confirmation, and request-vs-response AI analysis. AI remains advisory; the citizen and authorized officer retain authority.
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">Where production CPGRAMS wins</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              The real national platform has nationwide institutional integration, ministries/departments/states, production identity and security, operational volumes, official processes and hierarchies, public dashboards, mature mobile/UMANG integration, existing AI chatbot/voice functionality, and real appeal/government machinery. This prototype does not replace those capabilities.
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5" aria-labelledby="scale">
          <h2 id="scale" className="text-2xl font-bold">How it could scale safely</h2>
          <Card className="border-border">
            <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-2">
              {[
                "Replace demo taxonomy with verified official taxonomy",
                "Use authorized government APIs—not scraping or private interfaces",
                "Preserve RLS, role authorization, and immutable case-event audit",
                "Keep LLM output advisory and validate taxonomy IDs server-side",
                "Use production identity/OTP, monitoring, and rate limits",
                "Apply privacy/redaction controls and never store chain-of-thought",
                "Keep human officers responsible for administrative actions",
              ].map((item) => <p key={item} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{item}</p>)}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="tools">
          <Card className="border-border">
            <CardHeader><CardTitle id="tools" className="flex items-center gap-2 text-lg"><Sparkles className="size-5 text-primary" />Codex during the build</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">Codex was a meaningful development tool for architecture and implementation iteration, auth/workflow repairs, database and RLS review, testing, frontend work, AI-gateway integration, and runtime debugging.</CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bot className="size-5 text-primary" />Gemini at runtime</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">Gemini is the prototype AI gateway's runtime LLM provider for validated advisory intake and resolution analysis. Gemini is not an OpenAI model, and neither tool makes binding government decisions.</CardContent>
          </Card>
        </section>

        <section className="rounded-lg border border-border bg-surface-raised p-6 text-center">
          <h2 className="text-xl font-bold">Thank you</h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Thank you to Varun Mayya and the Build What Moves India team for creating the opportunity
            to rethink public-service experiences from a citizen-first perspective.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth/login">Begin a reviewer journey</Link>
          </Button>
        </section>
      </div>
    </PublicShell>
  );
}
