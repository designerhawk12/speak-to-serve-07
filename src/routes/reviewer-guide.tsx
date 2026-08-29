import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Copy,
  Gavel,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REVIEWER_ACCOUNTS,
  REVIEWER_DEMO_OTP,
  type ReviewerAccount,
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

const DEMO_PASSWORD = "12345678";

/** Display order for GRO accounts — Water first, Pension second, Bengaluru, Pune B, Pune A last. */
const GRO_DISPLAY_ORDER = [
  "gro.water.a@demo-data.cpgrams.in",
  "gro.water.b@demo-data.cpgrams.in",
  "gro.pension.a@demo-data.cpgrams.in",
  "gro.pension.b@demo-data.cpgrams.in",
  "gro.urban.bengaluru@demo-data.cpgrams.in",
  "gro.urban.pune.b@demo-data.cpgrams.in",
  "gro.urban.pune.a@demo-data.cpgrams.in",
];

function sortedAccounts(persona: ReviewerPersona): readonly ReviewerAccount[] {
  const accounts = REVIEWER_ACCOUNTS.filter((a) => a.persona === persona);
  if (persona !== "GRO") return accounts;
  return [...accounts].sort((a, b) => {
    const ai = GRO_DISPLAY_ORDER.indexOf(a.email);
    const bi = GRO_DISPLAY_ORDER.indexOf(b.email);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      aria-label={`Copy ${text}`}
      className="ml-1 inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <CheckCircle2 className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
      <CopyButton text={children} />
    </span>
  );
}

function PersonaIcon({ persona }: { persona: ReviewerPersona }) {
  if (persona === "Citizen")
    return <UserRound className="size-4 text-primary shrink-0" aria-hidden />;
  if (persona === "Appellate Authority")
    return <Gavel className="size-4 text-primary shrink-0" aria-hidden />;
  if (persona === "Nodal Officer")
    return <Users className="size-4 text-primary shrink-0" aria-hidden />;
  return <ShieldCheck className="size-4 text-primary shrink-0" aria-hidden />;
}

function AccountCard({ account }: { account: ReviewerAccount }) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          <PersonaIcon persona={account.persona} />
          <p className="break-all font-mono text-sm font-semibold text-primary leading-snug">
            {account.email}
            <CopyButton text={account.email} />
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{account.organization}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            Password: <Code>{DEMO_PASSWORD}</Code>
          </span>
          <span className="text-muted-foreground">Best for: {account.bestFor}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({
  id,
  title,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        id={id}
        type="button"
        className="flex w-full items-center justify-between text-left font-bold py-4 px-5 bg-muted/20 hover:bg-muted/40 transition-colors"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base">{title}</span>
        {open ? (
          <ChevronUp className="size-5 shrink-0" />
        ) : (
          <ChevronDown className="size-5 shrink-0" />
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function JourneyStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground mt-0.5">
        {number}
      </span>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  );
}

function ExpectedResult({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-success/30 bg-success-surface px-4 py-2 text-sm text-success mt-2">
      <span className="font-semibold">Expected: </span>
      {children}
    </div>
  );
}

const COMPARISON_ROWS: { improvement: string; who: string; why: string }[] = [
  {
    improvement: "Problem-first AI intake",
    who: "Citizen",
    why: "Reduces need to understand government taxonomy before describing the problem.",
  },
  {
    improvement: "Requested-outcome extraction",
    who: "Citizen + GRO",
    why: "Makes what the citizen actually wants the government to fix explicitly visible.",
  },
  {
    improvement: "Missing-information guidance",
    who: "Citizen",
    why: "Helps strengthen vague complaints before submission rather than simply rejecting them.",
  },
  {
    improvement: "AI-assisted taxonomy / destination suggestion",
    who: "Citizen",
    why: "Gives routing guidance from natural language while preserving citizen manual control.",
  },
  {
    improvement: "Action Required workspace",
    who: "Citizen",
    why: "Makes pending clarification, document, and resolution tasks clearly visible instead of buried in case history.",
  },
  {
    improvement: "AI Officer Summary",
    who: "GRO / Nodal",
    why: "Condenses case context for faster review.",
  },
  {
    improvement: "AI Resolution Intelligence",
    who: "GRO / Nodal",
    why: 'Compares what the citizen requested with what the government response claims to have done. Warns about vague disposal language such as “Forwarded to concerned authority.”',
  },
  {
    improvement: "Explicit YES / PARTLY / NO confirmation",
    who: "Citizen + Government",
    why: "Makes citizen satisfaction and the next required action clearer.",
  },
  {
    improvement: "Assigned-case ownership",
    who: "GRO",
    why: "Creates clear individual case responsibility — GROs work their queue, not every case in the organization.",
  },
  {
    improvement: "Wrong-route transfer visibility / deadline",
    who: "GRO / Nodal",
    why: "Makes routing correction more explicit and auditable with a 48-hour deadline.",
  },
  {
    improvement: "Systemic Issues",
    who: "Nodal",
    why: "Highlights recurring patterns across many grievances instead of treating every case only in isolation.",
  },
  {
    improvement: "Integrated appeal context",
    who: "Appellate Authority",
    why: "Original grievance, government response, and citizen disagreement are visible in one workspace.",
  },
];

function ReviewerGuide() {
  return (
    <PublicShell>
      {/* Demo banner */}
      <section className="border-b border-critical/30 bg-critical-surface">
        <div className="page-container py-4 text-critical">
          <p className="text-sm font-bold tracking-wide uppercase">
            Demonstration interface — not an official Government of India website
          </p>
          <p className="mt-1 text-sm">
            This prototype uses synthetic reviewer data and mock authentication. It has no access to
            live government systems and does not imply government endorsement.
          </p>
        </div>
      </section>

      <div className="page-container space-y-12 py-10 md:py-14">
        {/* Page header */}
        <PageHeader
          eyebrow="Build What Moves India"
          title="Reviewer Guide"
          description="Complete hackathon reviewer manual — accounts, journeys, prototype advantages, and an honest account of prototype limitations."
          actions={
            <Button asChild>
              <Link to="/auth/login">Start reviewer login</Link>
            </Button>
          }
        />

        {/* Quick start */}
        <section className="space-y-5" aria-labelledby="quick-start">
          <div className="space-y-1">
            <StatusChip label="Mock auth for review: YES" tone="warning" dot={false} />
            <h2 id="quick-start" className="text-2xl font-bold">
              Reviewer Quick Start
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              All accounts below are <strong>synthetic hackathon reviewer accounts</strong>. No real
              citizen PII or government data is involved.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/40 bg-accent/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="size-4 text-primary" aria-hidden />
                  Password — every reviewer account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold mb-1">Account password:</p>
                  <Code>{DEMO_PASSWORD}</Code>
                </div>
                <div>
                  <p className="font-semibold mb-1">Mock OTP (if using the OTP tab):</p>
                  <Code>{REVIEWER_DEMO_OTP}</Code>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reviewer authentication is intentionally simplified for demonstration. Sign in
                  with the email and the password above, or use the OTP tab and enter the mock OTP
                  code. Production authentication would use secure OTP / email delivery and would
                  not expose a shared credential.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">How to sign in</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed space-y-2">
                <p>
                  <strong>Password route (simplest):</strong> Open{" "}
                  <Link to="/auth/login" className="text-primary underline">
                    Citizen Login
                  </Link>{" "}
                  or{" "}
                  <Link to="/auth/officer-login" className="text-primary underline">
                    Government Officer Login
                  </Link>
                  . Enter the reviewer email, then enter password <Code>{DEMO_PASSWORD}</Code>.
                </p>
                <p>
                  <strong>OTP route:</strong> Select the OTP tab. Enter the reviewer email, then
                  enter the mock OTP <Code>{REVIEWER_DEMO_OTP}</Code>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Mock OTP is limited to reviewer mode only. It does not intercept real
                  Supabase/email-provider OTPs.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Account list */}
        <section className="space-y-6" aria-labelledby="accounts">
          <h2 id="accounts" className="text-2xl font-bold">
            Reviewer Account List
          </h2>
          {(["Citizen", "GRO", "Nodal Officer", "Appellate Authority"] as ReviewerPersona[]).map(
            (persona) => (
              <div key={persona} className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-1">
                  <PersonaIcon persona={persona} />
                  {persona}s
                </h3>
                {persona === "Appellate Authority" && (
                  <p className="text-sm text-muted-foreground">
                    There is one Appellate Authority reviewer account for all appeal demonstrations.
                  </p>
                )}
                {persona === "GRO" && (
                  <p className="text-sm text-muted-foreground">
                    New grievances are automatically distributed among eligible GROs for the
                    selected organization. After creating a complaint,{" "}
                    <strong>note the registration number</strong> and check the correct
                    organization&rsquo;s GRO accounts to locate the assigned officer.
                  </p>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  {sortedAccounts(persona).map((account) => (
                    <AccountCard key={account.email} account={account} />
                  ))}
                </div>
              </div>
            ),
          )}
        </section>

        {/* What this prototype improves */}
        <section className="space-y-8" aria-labelledby="advantages">
          <div>
            <h2 id="advantages" className="text-2xl font-bold">
              What This Prototype Improves
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              Existing CPGRAMS already supports grievance filing, tracking, clarification, feedback,
              appeals, mobile access, role-based government access, an AI chatbot, voice-based
              grievance lodging, and multilingual support. The improvements below are specific to
              what this prototype demonstrates.
            </p>
          </div>

          {/* Citizen */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <UserRound className="size-5 text-primary" aria-hidden />
              Citizen
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "Problem-first grievance creation",
                  body: "The citizen begins by describing the actual problem rather than first navigating the government organization and category hierarchy. AI then maps the description to existing taxonomy.",
                },
                {
                  title: "AI grievance understanding",
                  body: "The AI extracts: what happened, what the citizen wants resolved, location where detectable, suggested grievance type and government destination, and helpful missing information — all shown explicitly before submission.",
                },
                {
                  title: "Missing-information guidance",
                  body: "Instead of simply rejecting a vague grievance, the interface explains what information would strengthen the complaint. For example, a pension grievance with little detail may suggest identifiers or documents would help.",
                },
                {
                  title: "AI confidence and suitability guidance",
                  body: "AI can indicate uncertainty or whether the issue appears suitable for CPGRAMS (e.g. private seller dispute vs. public service failure). This is advisory — not a legally authoritative eligibility decision.",
                },
                {
                  title: "AI-assisted routing suggestion",
                  body: "AI gives a government destination suggestion while the citizen retains manual control. The current prototype provides AI-assisted routing suggestions, not fully autonomous routing.",
                },
                {
                  title: "Requested-outcome extraction",
                  body: 'The interface explicitly identifies “What do you actually want the government to resolve?” — making the desired outcome clearly visible for the officer handling the case.',
                },
                {
                  title: "Action Required workspace",
                  body: "Clarification requests, document requests, and resolution-review actions are surfaced clearly to the citizen rather than being buried inside case history.",
                },
                {
                  title: "Explicit citizen outcome confirmation",
                  body: "Citizens clearly respond YES, PARTLY, or NO to the government resolution. That confirmation drives the next understandable action — including appeal where applicable.",
                },
              ].map(({ title, body }) => (
                <Card key={title} className="border-border">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
                      {title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* GRO */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              GRO (Grievance Redressal Officer)
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "Assigned-case workspace",
                  body: "GROs work on grievances actually assigned to them — not every case in the organization. This creates clear individual case responsibility.",
                },
                {
                  title: "AI Officer Summary",
                  body: "An officer can generate a concise AI summary of the grievance and important case context for faster review. AI is labeled advisory throughout.",
                },
                {
                  title: "Requested outcome visibility",
                  body: "Officers immediately see what result the citizen was actually asking for, not just the raw complaint text.",
                },
                {
                  title: "AI Resolution Intelligence",
                  body: 'Before submitting a resolution, AI compares what the citizen requested vs. what the government response claims to have done — and warns about vague language such as “Forwarded to concerned authority” or “Necessary action taken.” This is one of the main showcase features.',
                },
                {
                  title: "Clarification workflow",
                  body: "Officers can explicitly request clarification and later see the citizen's response in the case workspace, separate from general case history.",
                },
                {
                  title: "Structured document requests",
                  body: "Officers can request required documents/evidence items and see exactly which requested items have or have not yet been supplied.",
                },
                {
                  title: "Progress updates",
                  body: "Officers can provide citizen-visible progress updates instead of jumping directly from filed to resolved.",
                },
                {
                  title: "Wrong-route transfer workflow",
                  body: "Officers can flag an incorrectly routed case, initiate a transfer with a 48-hour deadline, and the case history is preserved through the transfer to the new responsible office.",
                },
                {
                  title: "Citizen-confirmed closure",
                  body: "A government response alone does not close the case. An assigned officer can close only after the required citizen-confirmation state (YES). This is the prototype's workflow design — not a claim about official CPGRAMS policy.",
                },
              ].map(({ title, body }) => (
                <Card key={title} className="border-border">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
                      {title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Nodal Officer */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="size-5 text-primary" aria-hidden />
              Nodal Officer
            </h3>
            <Card className="border-border">
              <CardContent className="p-4 text-sm text-muted-foreground leading-relaxed">
                In this prototype, the Nodal Officer can perform normal GRO operational capabilities
                where authorized, AND additionally receives higher-level organizational oversight.
              </CardContent>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "GRO operational capabilities",
                  body: "Where authorized, Nodal can inspect and work with grievances similarly to GRO workflows — not only observe from a distance.",
                },
                {
                  title: "Organization / subtree oversight",
                  body: "Nodal sees a wider authorized organization scope rather than only one individual GRO queue. Cases across the subtree are visible for oversight.",
                },
                {
                  title: "Statistics and operational analytics",
                  body: "Dashboard showing confirmed resolutions, SLA compliance, appeal rates, citizen-confirmed outcomes, clarification activity, and workload distribution across officers.",
                },
                {
                  title: "Priority and SLA oversight",
                  body: "Priority distribution, approaching deadlines, breached deadlines, and escalation state are visible across the authorized subtree.",
                },
                {
                  title: "Systemic Issues — highlighted demo feature",
                  body: "Instead of viewing every grievance only as an isolated complaint, the Systemic Issues section helps identify repeated or related problems — for example, many water complaints from the same area, or recurring streetlight failures — indicating a wider service-delivery problem. Seeded demo clusters are shown; real nationwide analytics would require production data.",
                },
                {
                  title: "Multi-GRO workload visibility",
                  body: "Nodal can understand how work is distributed across officers, which cases are waiting for citizen action, and where escalation pressure is accumulating.",
                },
              ].map(({ title, body }) => (
                <Card key={title} className="border-border">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
                      {title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Appellate Authority */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Gavel className="size-5 text-primary" aria-hidden />
              Appellate Authority
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "Focused appeal workspace",
                  body: "Appellate Authority works on appealed grievances — ordinary grievances without an appeal are not appellate work items.",
                },
                {
                  title: "Full disagreement context",
                  body: "The appeal workspace presents: original citizen grievance, requested outcome, government / GRO resolution, citizen YES/PARTLY/NO response, appeal reason and disagreement, case history, and relevant evidence where available.",
                },
                {
                  title: "Purpose-built appellate decision",
                  body: "The Appellate Authority can record the appellate decision and reasoning using the existing workflow. AI does not make appellate decisions.",
                },
                {
                  title: "Single appellate reviewer account",
                  body: "The reviewer environment uses one Appellate Authority account for all appeal demonstrations: appellate@demo-data.cpgrams.in",
                },
              ].map(({ title, body }) => (
                <Card key={title} className="border-border">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
                      {title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Guidance Assistant */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Bot className="size-5 text-primary" aria-hidden />
              Guidance Assistant
            </h3>
            <Card className="border-border">
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  The Guidance Assistant is a lightweight navigation helper. Existing CPGRAMS
                  already has an AI chatbot, so this assistant is{" "}
                  <strong>not presented</strong> as a major advantage over the national platform.
                </p>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  {[
                    "Answers basic portal / process questions",
                    "Recommends relevant pages using a safe route allowlist",
                    "Explains roles, statuses, and filing steps",
                    "Does not make government decisions",
                    "Does not access arbitrary private case information",
                    "Uses deterministic fallback when the provider is unavailable",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <ArrowRight className="size-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rounded-md border border-warning/30 bg-warning-surface px-3 py-2 text-xs text-warning-foreground">
                  <strong>Demo AI limit:</strong> approximately 30 requests per minute. Availability
                  may also depend on upstream Gemini provider quota. Fallback behavior is expected
                  when the quota is exhausted.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Prototype limitations */}
        <section className="space-y-5" aria-labelledby="limitations">
          <h2 id="limitations" className="text-2xl font-bold">
            Where the Current CPGRAMS Platform Is Stronger / Prototype Limitations
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                title: "Demo taxonomy only",
                body: "The organization and category taxonomy is intentionally limited and synthetic — not the complete Government of India CPGRAMS taxonomy.",
              },
              {
                title: "Synthetic accounts and cases",
                body: "All reviewer citizens, GROs, Nodal Officers, and Appellate Authorities are demo identities with seeded fictional cases.",
              },
              {
                title: "Mock authentication",
                body: "A shared reviewer password and displayed mock OTP exist only to make hackathon evaluation easier. This would be unacceptable in production.",
              },
              {
                title: "AI is advisory",
                body: "Gemini can misunderstand a grievance, provide an imperfect suggestion, or hit provider quota / rate limits. Manual workflows must always remain available.",
              },
              {
                title: "Routing is not fully autonomous",
                body: "The current implementation provides AI-assisted routing suggestions. Not every AI suggestion is automatically committed to the grievance routing fields.",
              },
              {
                title: "Limited national integration",
                body: "This prototype is not connected to all ministries, states, departments, or official government infrastructure.",
              },
              {
                title: "No production-scale validation",
                body: "No Government of India security, privacy, accessibility, compliance, penetration-testing, or nationwide load testing has been performed.",
              },
              {
                title: "Existing CPGRAMS has real institutional scale",
                body: "The national platform has nationwide government integration, established operational users, official processes, production infrastructure, mobile / UMANG presence, real grievance volumes, and official identity / governance mechanisms.",
              },
              {
                title: "Chatbot is intentionally basic",
                body: "The Guidance Assistant is simple reviewer / citizen navigation, intentionally not presented as more advanced than CPGRAMS's existing chatbot.",
              },
              {
                title: "Seeded Systemic Issues are demo-scale",
                body: "Clustered systemic issues shown are pre-seeded demo data, not real-time nationwide analytics.",
              },
              {
                title: "No mobile / UMANG deployment",
                body: "This prototype has not been deployed through UMANG or verified on production mobile infrastructure.",
              },
              {
                title: "No formal government security / compliance certification",
                body: "The prototype has not undergone formal government security audit, privacy impact assessment, or compliance certification.",
              },
            ].map(({ title, body }) => (
              <Card key={title} className="border-warning/30 bg-warning-surface">
                <CardContent className="p-4 space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5 text-warning-foreground">
                    <CircleAlert className="size-4 shrink-0" aria-hidden />
                    {title}
                  </p>
                  <p className="text-xs leading-relaxed text-warning-foreground/80">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Registration number warning — immediately before journeys */}
        <div
          role="note"
          className="rounded-lg border-2 border-warning bg-warning-surface p-5 space-y-3"
          aria-label="Important: Keep your registration number handy"
        >
          <div className="flex items-center gap-2 font-bold text-warning-foreground text-base">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            KEEP THE REGISTRATION NUMBER HANDY DURING JOURNEYS
          </div>
          <div className="text-sm text-warning-foreground/90 leading-relaxed space-y-2">
            <p>
              During these journeys you will switch between Citizen, GRO, Nodal, and Appellate
              accounts. Each organization may have multiple eligible GRO accounts, and new grievances
              are automatically distributed among them.
            </p>
            <p>
              <strong>After creating a complaint:</strong> immediately copy or note the registration
              number shown on the submission page.
            </p>
            <p>
              <strong>When switching to the government side:</strong> log in to the GRO accounts for
              the organization / type selected during grievance creation and search using the
              registration number.
            </p>
            <ul className="space-y-0.5 mt-1">
              {[
                "Water complaint → check the Water GRO accounts",
                "Urban complaint → check the Urban GRO accounts",
                "Pension complaint → check the Pension GRO accounts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p>
              If an organization has multiple GRO accounts, log in to each relevant GRO account and
              search by registration number until you locate the assigned officer&rsquo;s queue. The
              officer&rsquo;s organization type is shown directly below the account email in this
              guide. <strong>Do not assume the first GRO account listed owns the grievance.</strong>
            </p>
          </div>
        </div>

        {/* Journeys */}
        <section className="space-y-4" aria-labelledby="journeys">
          <h2 id="journeys" className="text-2xl font-bold">
            Reviewer Journeys
          </h2>

          {/* Journey 1 */}
          <CollapsibleSection
            id="journey-1"
            title="Journey 1 — Test AI Intake and Complete a New Water Grievance"
            defaultOpen
          >
            <ol className="space-y-4 mt-2">
              <JourneyStep number={1}>
                Sign in as either Citizen reviewer account. Password: <Code>{DEMO_PASSWORD}</Code>
              </JourneyStep>

              <JourneyStep number={2}>
                <div className="space-y-3 w-full">
                  <p>
                    <strong>Test the AI using all three examples below.</strong> Paste each example
                    separately into the grievance description and proceed to the AI analysis step.
                    Observe: AI understanding, extracted requested outcome, location detection,
                    missing-information suggestions, suggested grievance type, government destination,
                    and confidence / suitability guidance. Do not submit all three.
                  </p>

                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        Test A — Detailed water issue
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground italic">
                        For almost two weeks, the water in our lane has been coming for barely 10–15
                        minutes in the morning and the pressure is extremely low. Several houses around
                        Lane 4, Kothrud are facing the same problem, although the next street seems to
                        get water normally. I called the local office twice and was told someone would
                        check, but nothing has changed yet. Please look into whatever is causing this
                        and restore the normal supply.
                      </p>
                      <ExpectedResult>
                        AI should understand a detailed public-service water complaint and suggest a
                        water-related government destination with reasonable confidence.
                      </ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        Test B — Very little detail (pension)
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground italic">
                        My pension hasn&rsquo;t come for the last three months. Earlier it used to
                        come regularly, but suddenly it stopped. I visited the office once and they
                        just told me to check again later. Please help me find out what happened.
                      </p>
                      <ExpectedResult>
                        AI should understand the pension problem while recognizing that additional
                        identifying information or supporting documents would strengthen the complaint.
                      </ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        Test C — Issue outside normal CPGRAMS scope
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground italic">
                        I ordered a laptop online a few days ago and when it arrived the screen was
                        damaged. I&rsquo;ve been trying to contact the seller but they keep refusing
                        to replace it. I already paid the full amount and don&rsquo;t know what else
                        to do now. Please help me get either a replacement or my money back.
                      </p>
                      <ExpectedResult>
                        AI should recognize that this appears to concern a private seller rather than
                        blindly treating every paragraph as a normal government-service grievance.
                      </ExpectedResult>
                    </CardContent>
                  </Card>
                </div>
              </JourneyStep>

              <JourneyStep number={3}>
                <div className="space-y-2 w-full">
                  <p>
                    <strong>Submit only Test A</strong> (the Detailed Water Issue). For manual
                    destination / type selection choose:
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                      Organization:{" "}
                      <strong>[DEMO] Civic Services Supervisory Group → [DEMO] Water Service Office</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                      Category: <strong>[DEMO] Water services</strong> (exact label may vary in
                      casing — select the water-related category)
                    </li>
                  </ul>
                </div>
              </JourneyStep>

              <JourneyStep number={4}>
                Submit the grievance.{" "}
                <strong>Immediately copy / save the generated registration number</strong> shown on
                the confirmation page.
              </JourneyStep>

              <JourneyStep number={5}>
                <div className="space-y-2 w-full">
                  <p>
                    <strong>Find the assigned Water GRO.</strong> Sign out from the citizen account.
                    Log in only to the Water GRO accounts (password: <Code>{DEMO_PASSWORD}</Code>):
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                      <Code>gro.water.a@demo-data.cpgrams.in</Code>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                      <Code>gro.water.b@demo-data.cpgrams.in</Code>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Open Cases, search using the saved registration number, and open the case when
                    found. Do not check Urban or Pension GRO accounts for a Water complaint.
                  </p>
                </div>
              </JourneyStep>

              <JourneyStep number={6}>
                <div className="w-full">
                  <p>
                    <strong>GRO action:</strong> Explore the case. Where available, run AI Summary
                    and inspect the original grievance, requested outcome, and routing / priority
                    information. Where AI Resolution Intelligence is available, test it before
                    submission (try entering “Forwarded to concerned authority.” and observe the
                    warning). Then submit a reasonable resolution using the existing GRO resolution
                    workflow.
                  </p>
                </div>
              </JourneyStep>

              <JourneyStep number={7}>
                <div className="w-full">
                  <p>
                    <strong>Citizen confirmation:</strong> Sign out from the GRO account. Log back
                    into the same citizen account that created the grievance. Locate the case using
                    the Action Required section or the saved registration number. Review the
                    resolution and select <strong>YES</strong> to confirm the issue is resolved.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Where the lifecycle exposes a final assigned-GRO Close action after YES
                    confirmation, log back into the assigned GRO account to observe and complete that
                    closure step.
                  </p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 2 */}
          <CollapsibleSection
            id="journey-2"
            title="Journey 2 — Clarification, Partial Outcome and Appeal"
          >
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm mb-4">
              Case: <Code>CPG-2026-D3A0000000000000000D</Code> &ensp;|&ensp; Citizen:{" "}
              <Code>citizen.1@demo-data.cpgrams.in</Code> &ensp;|&ensp; GRO:{" "}
              <Code>gro.urban.pune.b@demo-data.cpgrams.in</Code>
            </div>
            <ol className="space-y-4">
              <JourneyStep number={1}>
                Sign in as <Code>citizen.1@demo-data.cpgrams.in</Code> (password:{" "}
                <Code>{DEMO_PASSWORD}</Code>). The case should appear in the{" "}
                <strong>Action Required</strong> section. If not immediately visible, search for{" "}
                <Code>CPG-2026-D3A0000000000000000D</Code> and open it.
              </JourneyStep>

              <JourneyStep number={2}>
                Enter a useful clarification in the existing clarification form and submit it.
                <ExpectedResult>
                  The clarification is recorded and the case shows citizen response submitted.
                </ExpectedResult>
              </JourneyStep>

              <JourneyStep number={3}>
                Sign out. Log in as <Code>gro.urban.pune.b@demo-data.cpgrams.in</Code> (password:{" "}
                <Code>{DEMO_PASSWORD}</Code>). Open Cases and search{" "}
                <Code>CPG-2026-D3A0000000000000000D</Code>. Open the case.
              </JourneyStep>

              <JourneyStep number={4}>
                Click <strong>AI Summary</strong>. Scroll through the case and verify the newly
                submitted citizen clarification is visible in the case workspace.
              </JourneyStep>

              <JourneyStep number={5}>
                Submit a resolution using the existing GRO resolution workflow. Where available,
                demonstrate <strong>AI Resolution Intelligence</strong> before final submission (try
                entering &ldquo;Forwarded to concerned authority.&rdquo; and observe the warning).
              </JourneyStep>

              <JourneyStep number={6}>
                Sign out. Log in again as <Code>citizen.1@demo-data.cpgrams.in</Code>. Find the
                resolution in Action Required or by searching{" "}
                <Code>CPG-2026-D3A0000000000000000D</Code>. Review the resolution and select{" "}
                <strong>PARTLY</strong>. Enter a short reason explaining what remains unresolved,
                then proceed to the existing appeal action.
              </JourneyStep>

              <JourneyStep number={7}>
                <div className="w-full">
                  <p>
                    <strong>Appellate review:</strong> Sign in as{" "}
                    <Code>appellate@demo-data.cpgrams.in</Code> (password:{" "}
                    <Code>{DEMO_PASSWORD}</Code>). Open the appeal and review the available
                    appellate context: original grievance and requested outcome, GRO resolution,
                    citizen partial-disagreement and appeal reason, and the available appellate
                    decision workflow.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit a demo appellate decision if that action is already supported and safe in
                    the seeded reviewer environment.
                  </p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 3 */}
          <CollapsibleSection id="journey-3" title="Journey 3 — Citizen Rejects the Outcome">
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm mb-4">
              Case: <Code>CPG-2026-D3A0000000000000001E</Code> &ensp;|&ensp; Citizen:{" "}
              <Code>citizen.2@demo-data.cpgrams.in</Code> &ensp;|&ensp; Appellate:{" "}
              <Code>appellate@demo-data.cpgrams.in</Code>
            </div>
            <ol className="space-y-4">
              <JourneyStep number={1}>
                Sign in as <Code>citizen.2@demo-data.cpgrams.in</Code> (password:{" "}
                <Code>{DEMO_PASSWORD}</Code>). Open case{" "}
                <Code>CPG-2026-D3A0000000000000001E</Code>.
              </JourneyStep>

              <JourneyStep number={2}>
                Review the existing government resolution. Select <strong>NO</strong> and enter why
                the issue is still unresolved.
              </JourneyStep>

              <JourneyStep number={3}>
                Proceed with the existing Appeal action. Complete the appeal form and submit.
                <ExpectedResult>
                  Appeal is recorded and the appellate workspace becomes active for the appellate
                  account.
                </ExpectedResult>
              </JourneyStep>

              <JourneyStep number={4}>
                <div className="w-full">
                  <p>
                    Sign out. Log in as <Code>appellate@demo-data.cpgrams.in</Code> (password:{" "}
                    <Code>{DEMO_PASSWORD}</Code>). Open the newly filed appeal and inspect all
                    available appeal information:
                  </p>
                  <ul className="space-y-1 text-xs mt-2">
                    {[
                      "Original citizen grievance and requested outcome",
                      "GRO resolution",
                      "Citizen NO response and reason",
                      "Case timeline and evidence",
                      "Available appellate decision actions",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </JourneyStep>

              <JourneyStep number={5}>
                Explore the available appellate actions. The Appellate Authority can record a
                decision; AI does not decide the appeal.
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 4 */}
          <CollapsibleSection
            id="journey-4"
            title="Journey 4 — Explore the Specialist Government Workspaces"
          >
            <div className="space-y-6">
              {/* Part A */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="size-4 text-primary" aria-hidden />
                  Part A — Nodal Officer
                </h4>
                <p className="text-sm text-muted-foreground">
                  A GRO handles individual assigned grievances. The Nodal Officer can also work
                  operationally where authorized, but additionally sees the broader organizational
                  picture — workload, SLA / priority trends, and recurring systemic issues.
                </p>
                <ol className="space-y-3">
                  <JourneyStep number={1}>
                    Sign in as <Code>nodal@demo-data.cpgrams.in</Code> (password:{" "}
                    <Code>{DEMO_PASSWORD}</Code>).
                  </JourneyStep>
                  <JourneyStep number={2}>
                    Explore normal GRO-style grievance operational capabilities available to the
                    Nodal account and the wider organization / subtree case visibility.
                  </JourneyStep>
                  <JourneyStep number={3}>
                    Open the <strong>Statistics / Analytics</strong> dashboard. Note SLA compliance,
                    priority distribution, and workload information.
                  </JourneyStep>
                  <JourneyStep number={4}>
                    Review priority and SLA information — approaching deadlines, breached deadlines,
                    and escalation state across the authorized subtree.
                  </JourneyStep>
                  <JourneyStep number={5}>
                    Explore officer / workload information where present.
                  </JourneyStep>
                  <JourneyStep number={6}>
                    <div className="w-full">
                      <p>
                        <strong>Open Systemic Issues.</strong> Instead of viewing every grievance
                        only as an isolated complaint, Systemic Issues helps identify repeated or
                        related problems — for example, many water complaints from the same area, or
                        multiple recurring streetlight failures — indicating a wider service-delivery
                        problem.
                      </p>
                    </div>
                  </JourneyStep>
                  <JourneyStep number={7}>
                    Open a systemic issue and inspect the related grievance pattern / cluster.
                  </JourneyStep>
                  <JourneyStep number={8}>
                    Compare this wider oversight view with an individual GRO queue.
                  </JourneyStep>
                </ol>
              </div>

              {/* Part B */}
              <div className="space-y-3 border-t border-border pt-5">
                <h4 className="font-semibold flex items-center gap-2">
                  <Gavel className="size-4 text-primary" aria-hidden />
                  Part B — Appellate Authority
                </h4>
                <p className="text-sm text-muted-foreground">
                  Appellate Authority is not simply another GRO queue — it is limited to appeals
                  filed after citizen disagreement with an original response.
                </p>
                <ol className="space-y-3">
                  <JourneyStep number={1}>
                    Sign in as <Code>appellate@demo-data.cpgrams.in</Code> (password:{" "}
                    <Code>{DEMO_PASSWORD}</Code>).
                  </JourneyStep>
                  <JourneyStep number={2}>
                    Open the appeals queue. Prefer cases that already contain useful appellate data
                    (partly resolved and decided appeals are seeded).
                  </JourneyStep>
                  <JourneyStep number={3}>
                    Inspect the available appellate context: original grievance, requested outcome,
                    government response, citizen disagreement, timeline, and available decision
                    actions.
                  </JourneyStep>
                  <JourneyStep number={4}>
                    If a previously decided appeal exists, open it and verify the decision is
                    visible.
                  </JourneyStep>
                </ol>
              </div>

              {/* Part C */}
              <div className="space-y-3 border-t border-border pt-5">
                <h4 className="font-semibold flex items-center gap-2">
                  <Bot className="size-4 text-primary" aria-hidden />
                  Part C — Guidance Assistant
                </h4>
                <p className="text-sm text-muted-foreground">
                  Open the Guidance Assistant and try these suggested questions:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {[
                    '"How do I file a grievance?"',
                    '"Where can I see my grievances?"',
                    '"How do I respond to a clarification request?"',
                    '"How do I appeal?"',
                    '"What does a Nodal Officer do?"',
                    '"What does a GRO do?"',
                  ].map((q) => (
                    <li key={q} className="flex items-center gap-2">
                      <ArrowRight className="size-3.5 shrink-0 text-primary" aria-hidden />
                      {q}
                    </li>
                  ))}
                </ul>
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  The assistant should answer basic portal questions, recommend relevant pages, and
                  stay within allowed routes. AI / provider rate limits may temporarily cause
                  fallback behavior. Intended maximum rate: approximately 30 RPM — availability
                  depends on upstream Gemini quota.
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </section>

        {/* Comparison table */}
        <section className="space-y-5" aria-labelledby="comparison-table">
          <h2 id="comparison-table" className="text-2xl font-bold">
            Comparison — Genuine Demonstrated Improvements
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Only improvements actually demonstrated by this prototype. Existing CPGRAMS capabilities
            (appeals, tracking, chatbot, multilingual support) are not listed as advantages.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-semibold">Prototype improvement</th>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                    Who benefits
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">Why it improves the experience</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ improvement, who, why }, i) => (
                  <tr
                    key={improvement}
                    className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-3 py-2 font-medium align-top">{improvement}</td>
                    <td className="px-3 py-2 text-muted-foreground align-top whitespace-nowrap">
                      {who}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground align-top">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Where we lose */}
        <section className="space-y-4" aria-labelledby="where-we-lose">
          <h2 id="where-we-lose" className="text-2xl font-bold">
            Where This Prototype Is Weaker
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {[
              "Limited synthetic taxonomy — not the complete national CPGRAMS set",
              "Synthetic reviewer data — citizens, GROs, officers, and cases are all demo identities",
              "Mock OTP and shared reviewer password — unacceptable in production",
              "AI quota / rate-limit dependency — manual workflows must remain available",
              "AI occasionally needs manual fallback",
              "AI routing is advisory, not guaranteed autonomous routing",
              "No complete nationwide ministry / state hierarchy",
              "No real government production integration",
              "No mobile / UMANG deployment",
              "No nationwide production-scale testing",
              "No formal government security / compliance certification",
              "Guidance chatbot is intentionally less capable than a full production assistant",
              "Seeded Systemic Issues are demo-scale, not real-time nationwide analytics",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-surface px-3 py-2 text-warning-foreground/90"
              >
                <CircleAlert
                  className="size-4 shrink-0 mt-0.5 text-warning-foreground"
                  aria-hidden
                />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Working / mock */}
        <section className="space-y-5" aria-labelledby="honesty">
          <h2 id="honesty" className="text-2xl font-bold">
            What Works and What Is Mocked
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-success/30 bg-success-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-success">
                  <CheckCircle2 className="size-5" />
                  Working prototype
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-success">
                Reviewer authentication flow; private citizen case journey; role gates; assignment;
                clarification; document requests; progress; transfer; resolution; citizen
                YES/Partly/No confirmation; appeal filing and manual appellate decision; Gemini
                grievance-intake AI; Gemini resolution intelligence; allowlisted navigation guidance.
              </CardContent>
            </Card>
            <Card className="border-warning/30 bg-warning-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-warning-foreground">
                  <CircleAlert className="size-5" />
                  Mock or limited
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-warning-foreground">
                Synthetic organizations, taxonomy, citizens, officers, cases, and evidence; reviewer
                OTP; government integrations; nationwide taxonomy completeness; real SMS/email
                delivery where unconfigured; authoritative government adoption; production-scale
                compliance, threat-model, and security review.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Reviewer story */}
        <section className="space-y-5" aria-labelledby="story">
          <h2 id="story" className="text-2xl font-bold">
            The Reviewer Story
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Who faces the problem?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Citizens trying to raise and follow up public-service grievances — especially
                  people who do not know the responsible department/category or find institutional
                  workflows difficult to interpret.
                </p>
                <p>
                  Existing CPGRAMS already supports grievance lodging, tracking, clarification,
                  feedback, appeals, multilingual functionality, and advertised AI chatbot / voice
                  capabilities. This prototype does not claim otherwise.
                </p>
                <p>
                  The friction explored here is: understanding taxonomy, making the requested
                  outcome explicit, seeing responsibility and Action Required clearly, and assessing
                  whether a response actually addressed the citizen&rsquo;s outcome.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">What changed?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {[
                    "Problem-first filing before government taxonomy",
                    "Advisory AI issue / outcome understanding and existing-taxonomy suggestions",
                    "Citizen-controlled Continue or Change routing review",
                    "Assigned-GRO work ownership plus Nodal subtree oversight",
                    "Explicit clarification / document Action Required tasks",
                    "Government resolution kept separate from citizen confirmation",
                    "AI request-vs-response analysis for vague resolution drafts",
                    "Clear citizen disagreement and appeal handoff",
                    "End-to-end Citizen → GRO → resolution → confirmation → close journey",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Where production CPGRAMS wins */}
        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="comparison">
          <Card className="border-border">
            <CardHeader>
              <CardTitle id="comparison" className="text-lg">
                Where this prototype is strongest
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Problem-first intake, natural-language taxonomy guidance, requested-outcome extraction,
              completion guidance, visible ownership and actions, citizen confirmation, and
              request-vs-response AI analysis. AI remains advisory; the citizen and authorized
              officer retain authority.
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Where production CPGRAMS wins</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              The real national platform has nationwide institutional integration, ministries /
              departments / states, production identity and security, operational volumes, official
              processes and hierarchies, public dashboards, mature mobile / UMANG integration,
              existing AI chatbot / voice functionality, and real appeal / government machinery.
              This prototype does not replace those capabilities.
            </CardContent>
          </Card>
        </section>

        {/* Scale */}
        <section className="space-y-5" aria-labelledby="scale">
          <h2 id="scale" className="text-2xl font-bold">
            How It Could Scale Safely
          </h2>
          <Card className="border-border">
            <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-2">
              {[
                "Replace demo taxonomy with verified official taxonomy",
                "Use authorized government APIs — not scraping or private interfaces",
                "Preserve RLS, role authorization, and immutable case-event audit",
                "Keep LLM output advisory and validate taxonomy IDs server-side",
                "Use production identity / OTP, monitoring, and rate limits",
                "Apply privacy / redaction controls and never store chain-of-thought",
                "Keep human officers responsible for all administrative actions",
              ].map((item) => (
                <p key={item} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Tools */}
        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="tools">
          <Card className="border-border">
            <CardHeader>
              <CardTitle id="tools" className="flex items-center gap-2 text-lg">
                <Sparkles className="size-5 text-primary" />
                Codex during the build
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Codex was a meaningful development tool for architecture and implementation iteration,
              auth / workflow repairs, database and RLS review, testing, frontend work, AI-gateway
              integration, and runtime debugging.
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="size-5 text-primary" />
                Gemini at runtime
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Gemini is the prototype AI gateway&rsquo;s runtime LLM provider for validated
              advisory intake and resolution analysis. Gemini is not an OpenAI model, and neither
              tool makes binding government decisions.
            </CardContent>
          </Card>
        </section>

        {/* Thank you */}
        <section className="rounded-lg border border-border bg-surface-raised p-6 text-center">
          <h2 className="text-xl font-bold">Thank you</h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Thank you to Varun Mayya and the Build What Moves India team for creating the
            opportunity to rethink public-service experiences from a citizen-first perspective.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth/login">Begin a reviewer journey</Link>
          </Button>
        </section>
      </div>
    </PublicShell>
  );
}
