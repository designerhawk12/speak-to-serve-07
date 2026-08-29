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
  Users,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REVIEWER_ACCOUNTS,
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
      className="ml-2 inline-flex items-center rounded border border-border bg-surface-sunken p-1 text-muted-foreground hover:bg-muted/50 transition-colors shrink-0 align-middle"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <CheckCircle2 className="size-4 text-success" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
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
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <PersonaIcon persona={account.persona} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-semibold text-primary break-all flex items-center">
              {account.email}
              <CopyButton text={account.email} />
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{account.persona}</p>
          <p className="text-sm font-medium leading-tight">{account.organization}</p>
        </div>
        <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm flex items-center gap-1">
            <span className="text-muted-foreground">Password:</span> <Code>{DEMO_PASSWORD}</Code>
          </div>
          <span className="text-xs text-muted-foreground">Best for: {account.bestFor}</span>
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
    <div className="border border-border rounded-lg overflow-hidden bg-background">
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
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function JourneyStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground mt-0.5">
        {number}
      </span>
      <div className="text-sm leading-relaxed space-y-3 w-full">{children}</div>
    </li>
  );
}

function ExpectedResult({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-success/30 bg-success-surface px-4 py-3 text-sm text-success mt-3">
      <span className="font-semibold block mb-1">Expected: </span>
      {children}
    </div>
  );
}

const COMPARISON_ROWS: { improvement: string; who: string; why: string }[] = [
  {
    improvement: "Problem-first AI intake",
    who: "Citizen",
    why: "Reduces need to understand bureaucracy before describing the problem.",
  },
  {
    improvement: "Requested-outcome extraction",
    who: "Citizen + GRO",
    why: "Makes the expected result explicit.",
  },
  {
    improvement: "Missing-information guidance",
    who: "Citizen",
    why: "Helps improve vague complaints before submission.",
  },
  {
    improvement: "AI-assisted taxonomy/destination suggestion",
    who: "Citizen",
    why: "Provides routing guidance from natural language while preserving manual control.",
  },
  {
    improvement: "Action Required workflow",
    who: "Citizen",
    why: "Makes pending clarification/document/resolution tasks clearer.",
  },
  {
    improvement: "AI Officer Summary",
    who: "GRO/Nodal",
    why: "Condenses case context for faster review.",
  },
  {
    improvement: "AI Resolution Intelligence",
    who: "GRO/Nodal",
    why: 'Compares requested outcome with proposed government response and warns about vague disposal language.',
  },
  {
    improvement: "Explicit YES/PARTLY/NO confirmation",
    who: "Citizen + Government",
    why: "Makes citizen satisfaction and next action clearer.",
  },
  {
    improvement: "Assigned-case ownership",
    who: "GRO",
    why: "Creates clearer individual case responsibility.",
  },
  {
    improvement: "Wrong-route transfer visibility/deadline",
    who: "GRO/Nodal",
    why: "Makes routing correction more explicit and auditable.",
  },
  {
    improvement: "Systemic Issues",
    who: "Nodal",
    why: "Highlights recurring patterns across multiple grievances instead of treating each case only in isolation.",
  },
  {
    improvement: "Integrated appeal context",
    who: "Appellate",
    why: "Makes grievance → response → citizen disagreement easier to review in one workspace.",
  }
];

export function ReviewerGuide() {
  return (
    <PublicShell>
      <div className="bg-destructive/10 border-b-2 border-destructive py-3 text-center sticky top-16 z-30">
        <p className="text-destructive font-black tracking-widest text-sm uppercase flex items-center justify-center gap-2">
          <AlertTriangle className="size-4" aria-hidden />
          Demonstration Interface — Not an official Government of India website
        </p>
      </div>

      <div className="page-container max-w-4xl py-12 space-y-16">
        {/* Critical journey instructions / registration-number warning */}
        <section aria-labelledby="critical-instructions">
          <div className="rounded-xl border-2 border-warning bg-warning-surface p-6 shadow-sm">
            <div className="flex items-center gap-3 font-black text-warning-foreground text-xl border-b border-warning/20 pb-4 mb-4">
              <AlertTriangle className="size-7 shrink-0" aria-hidden />
              <h2 id="critical-instructions">KEEP THE REGISTRATION NUMBER HANDY DURING EVERY JOURNEY</h2>
            </div>
            
            <div className="text-base text-warning-foreground/90 leading-relaxed space-y-4">
              <p>
                During these journeys you will switch between Citizen, GRO, Nodal and Appellate accounts.
              </p>
              <p className="font-bold text-warning-foreground text-lg bg-warning/10 p-3 rounded-md border border-warning/20">
                Whenever you create a new grievance, COPY AND SAVE THE REGISTRATION NUMBER immediately.
              </p>
              <p>
                Each issue type may have multiple GRO accounts. New grievances are distributed between eligible officers for the selected organization.
              </p>
              <p>
                When switching to the government side, use the selected organization/type to determine which GRO accounts to check.
              </p>
              <ul className="space-y-2 mt-2 bg-background/50 p-4 rounded-md border border-warning/10">
                <li className="flex items-center gap-2 font-medium">
                  <ArrowRight className="size-4 shrink-0 text-warning" aria-hidden />
                  Water complaint → check Water GRO accounts only.
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <ArrowRight className="size-4 shrink-0 text-warning" aria-hidden />
                  Urban complaint → check Urban GRO accounts only.
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <ArrowRight className="size-4 shrink-0 text-warning" aria-hidden />
                  Pension complaint → check Pension GRO accounts only.
                </li>
              </ul>
              <p>
                If an organization has multiple GRO accounts, login to the relevant GRO accounts and use the saved registration number until you find the officer who received the grievance.
              </p>
              
              <div className="bg-background rounded-lg p-5 mt-6 border-2 border-warning">
                <div className="space-y-3 font-bold text-foreground">
                  <div className="flex items-center gap-3">
                    <span className="bg-warning text-warning-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                    OPEN CASES
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-warning text-warning-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                    SEARCH USING THE SAVED REGISTRATION NUMBER
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-warning text-warning-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                    OPEN THE MATCHING CASE
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-warning text-warning-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                    VERIFY THAT THE CASE IS ASSIGNED TO THIS OFFICER BEFORE CONTINUING
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 font-bold text-warning-foreground">
                <CircleAlert className="size-5 shrink-0 mt-0.5" />
                <p>Do not assume the first GRO account listed owns the grievance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviewer account list */}
        <section className="space-y-6" aria-labelledby="accounts">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 id="accounts" className="text-3xl font-black tracking-tight text-foreground">
                Reviewer Accounts
              </h2>
              <p className="mt-2 text-muted-foreground text-sm max-w-2xl">
                Reviewer authentication is intentionally simplified for demonstration. Production authentication would use secure OTP/email delivery and would not expose a shared reviewer credential. Mock OTP: <Code>24682468</Code>
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <UserRound className="size-5 text-primary" aria-hidden />
                1. CITIZENS
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedAccounts("Citizen").map((a) => (
                  <AccountCard key={a.email} account={a} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldCheck className="size-5 text-primary" aria-hidden />
                2. GROs
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedAccounts("GRO").map((a) => (
                  <AccountCard key={a.email} account={a} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Users className="size-5 text-primary" aria-hidden />
                3. NODAL OFFICERS
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedAccounts("Nodal Officer").map((a) => (
                  <AccountCard key={a.email} account={a} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Gavel className="size-5 text-primary" aria-hidden />
                4. APPELLATE AUTHORITY
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <AccountCard 
                  account={{
                    email: "appellate@demo-data.cpgrams.in",
                    persona: "Appellate Authority",
                    organization: "Civic Services Supervisory Group › Appellate Review Cell",
                    bestFor: "Appellate Authority journeys"
                  }} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Approved Taxonomy Reference */}
        <section className="space-y-6" aria-labelledby="demo-taxonomy">
          <div className="rounded-xl border-2 border-primary/40 bg-accent/30 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-6 text-primary shrink-0 mt-0.5" aria-hidden />
              <div>
                <h2 id="demo-taxonomy" className="text-xl font-bold uppercase tracking-wide text-primary">
                  FOR REVIEW PURPOSES, PLEASE USE ONLY THE DEMO ORGANIZATIONS AND CATEGORIES LISTED BELOW.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The prototype contains a limited synthetic taxonomy for hackathon testing. To ensure the seeded GRO assignment, Nodal oversight, appellate workflow, and reviewer journeys work consistently, reviewers should select only the listed demo options. Do not instruct reviewers to experiment with unrelated organization/category entries during the guided journeys.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <CheckCircle2 className="size-3.5" />
                  USE FOR REVIEW
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
              {/* WATER */}
              <Card className="border-border bg-background">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">
                    Water Issue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Organization</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Civic Services Supervisory Group
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Water Service Office</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Category</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Water services
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Water supply interruption</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* PENSION */}
              <Card className="border-border bg-background">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">
                    Pension Issue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Organization</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Civic Services Supervisory Group
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Pension Service Office</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Category</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Pension services
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Pension payment delay</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* URBAN */}
              <Card className="border-border bg-background">
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">
                    Streetlight / Urban Issue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Organization</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Civic Services Supervisory Group
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Urban Lighting Office</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Category</span>
                    <p className="mt-1 font-medium leading-snug">
                      [DEMO] Urban services
                      <br />
                      <span className="text-muted-foreground">› [DEMO] Streetlight problems</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* APPELLATE */}
              <Card className="border-warning/30 bg-warning-surface">
                <CardHeader className="pb-2 border-b border-warning/20">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-warning-foreground">
                    Appellate
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-warning-foreground/70 uppercase">Organization</span>
                    <p className="mt-1 font-medium leading-snug text-warning-foreground">
                      [DEMO] Civic Services Supervisory Group
                      <br />
                      <span className="opacity-80">› [DEMO] Appellate Review Cell</span>
                    </p>
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-warning-foreground/90">
                    <CircleAlert className="size-3.5 inline-block mr-1 mb-0.5" />
                    This Appellate Review Cell is <strong>NOT</strong> a normal grievance destination the citizen should select for a newly filed water/pension/streetlight grievance. It exists for the appeal workflow.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Journeys */}
        <section className="space-y-6" aria-labelledby="journeys">
          <h2 id="journeys" className="text-3xl font-black tracking-tight text-foreground border-b border-border pb-4">
            Reviewer Journeys
          </h2>

          {/* Journey 1 */}
          <CollapsibleSection
            id="journey-1"
            title="JOURNEY 1 — TEST AI INTAKE AND COMPLETE A NEW WATER GRIEVANCE"
            defaultOpen
          >
            <ol className="space-y-8 mt-4">
              <JourneyStep number={1}>
                <p>Login using either citizen reviewer account.</p>
                <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-primary" aria-hidden />
                    <Code>citizen.1@demo-data.cpgrams.in</Code>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-primary" aria-hidden />
                    <Code>citizen.2@demo-data.cpgrams.in</Code>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    Password: <Code>{DEMO_PASSWORD}</Code>
                  </div>
                </div>
              </JourneyStep>

              <JourneyStep number={2}>
                <div className="space-y-6">
                  <p>
                    <strong>Test the AI using all three examples below.</strong> Paste each example
                    separately into the grievance description and proceed to the AI analysis step.
                    Observe: AI understanding, extracted requested outcome, location detection,
                    missing-information suggestions, suggested grievance type, government destination,
                    and confidence / CPGRAMS suitability guidance where displayed. Do not submit all three.
                  </p>

                  <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <strong className="text-primary">AI Suggestion vs Manual Selection:</strong> The AI may display a suggested grievance type, suggested government destination, confidence score, and missing information. <strong>This is advisory.</strong> For the guided reviewer journeys, reviewers should manually choose the approved demo organization/category from this guide so that the subsequent seeded GRO workflow works predictably. Do not claim that AI automatically applies the selected route.
                  </div>

                  <Card className="border-border shadow-sm border-2">
                    <CardHeader className="bg-muted/40 border-b border-border py-3">
                      <CardTitle className="text-sm font-black tracking-widest uppercase text-primary">
                        TEST A — DETAILED WATER ISSUE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="bg-background rounded border border-border p-4 text-sm leading-relaxed relative group">
                        For almost two weeks, the water in our lane has been coming for barely 10–15
                        minutes in the morning and the pressure is extremely low. Several houses around
                        Lane 4, Kothrud are facing the same problem, although the next street seems to
                        get water normally. I called the local office twice and was told someone would
                        check, but nothing has changed yet. Please look into whatever is causing this
                        and restore the normal supply.
                        <div className="absolute top-2 right-2">
                          <CopyButton text="For almost two weeks, the water in our lane has been coming for barely 10–15 minutes in the morning and the pressure is extremely low. Several houses around Lane 4, Kothrud are facing the same problem, although the next street seems to get water normally. I called the local office twice and was told someone would check, but nothing has changed yet. Please look into whatever is causing this and restore the normal supply." />
                        </div>
                      </div>
                      <ExpectedResult>
                        AI should understand a detailed public-service water complaint and suggest a water-related government destination with reasonable confidence.
                      </ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-sm border-2">
                    <CardHeader className="bg-muted/40 border-b border-border py-3">
                      <CardTitle className="text-sm font-black tracking-widest uppercase text-primary">
                        TEST B — VERY LITTLE DETAIL — PENSION
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="bg-background rounded border border-border p-4 text-sm leading-relaxed relative group">
                        My pension hasn't come for the last three months. Earlier it used to come regularly, but suddenly it stopped. I visited the office once and they just told me to check again later. Please help me find out what happened.
                        <div className="absolute top-2 right-2">
                          <CopyButton text="My pension hasn't come for the last three months. Earlier it used to come regularly, but suddenly it stopped. I visited the office once and they just told me to check again later. Please help me find out what happened." />
                        </div>
                      </div>
                      <ExpectedResult>
                        AI should understand the pension problem while recognizing that additional identifying information or supporting documents would make it stronger.
                      </ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-sm border-2">
                    <CardHeader className="bg-muted/40 border-b border-border py-3">
                      <CardTitle className="text-sm font-black tracking-widest uppercase text-primary">
                        TEST C — ISSUE OUTSIDE NORMAL CPGRAMS SCOPE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="bg-background rounded border border-border p-4 text-sm leading-relaxed relative group">
                        I ordered a laptop online a few days ago and when it arrived the screen was damaged. I've been trying to contact the seller but they keep refusing to replace it. I already paid the full amount and don't know what else to do now. Please help me get either a replacement or my money back.
                        <div className="absolute top-2 right-2">
                          <CopyButton text="I ordered a laptop online a few days ago and when it arrived the screen was damaged. I've been trying to contact the seller but they keep refusing to replace it. I already paid the full amount and don't know what else to do now. Please help me get either a replacement or my money back." />
                        </div>
                      </div>
                      <ExpectedResult>
                        AI should recognize that this appears to concern a private seller rather than blindly treating every paragraph as a normal government-service grievance.
                      </ExpectedResult>
                    </CardContent>
                  </Card>
                </div>
              </JourneyStep>

              <JourneyStep number={3}>
                <div className="space-y-4">
                  <p>
                    <strong>SUBMIT ONLY TEST A</strong> (the Detailed Water Issue). <strong>Do not tell the reviewer to select a different organization based on the AI suggestion if the AI wording differs.</strong> The AI suggestion is being demonstrated as advisory. For the actual reviewer submission, you must explicitly instruct the reviewer to manually select:
                  </p>
                  <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3 text-sm">
                    <div>
                      <strong className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Organization:</strong>
                      [DEMO] Civic Services Supervisory Group <br/>
                      <span className="text-muted-foreground">› [DEMO] Water Service Office</span>
                    </div>
                    <div>
                      <strong className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Category:</strong>
                      [DEMO] Water services <br/>
                      <span className="text-muted-foreground">› [DEMO] Water supply interruption</span>
                    </div>
                  </div>
                </div>
              </JourneyStep>

              <JourneyStep number={4}>
                <div className="space-y-2">
                  <p>Submit the grievance.</p>
                  <p className="font-bold text-destructive bg-destructive/10 p-3 rounded border border-destructive/20 inline-block">
                    STOP — COPY AND SAVE THE GENERATED REGISTRATION NUMBER BEFORE CONTINUING.
                  </p>
                </div>
              </JourneyStep>

              <JourneyStep number={5}>
                <div className="space-y-4">
                  <p>
                    <strong>FIND THE ASSIGNED WATER GRO.</strong> Logout from citizen. Login only to WATER GRO accounts. Because complaints may be distributed among multiple eligible GROs, search each relevant Water GRO account using the registration number until the grievance appears. Do not instruct reviewers to check Urban/Pension accounts for a Water complaint.
                  </p>
                  
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" aria-hidden />
                      <Code>gro.water.a@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" aria-hidden />
                      <Code>gro.water.b@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>

                  <div className="bg-background rounded-lg p-5 border-2 border-primary/20 space-y-3 font-bold text-foreground">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                      OPEN CASES
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                      SEARCH USING THE SAVED REGISTRATION NUMBER
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                      OPEN THE MATCHING CASE
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">If the case is not found, logout and try the next Water GRO account.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={6}>
                <div className="space-y-4">
                  <p>
                    <strong>GRO ACTION:</strong> Explore the case. Where available:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>run AI Summary</li>
                    <li>inspect original grievance</li>
                    <li>inspect requested outcome</li>
                    <li>inspect routing/priority information</li>
                  </ul>
                  <p>
                    Then submit a reasonable resolution using the normal existing resolution workflow. If AI Resolution Intelligence is available, the reviewer may test it before submission.
                  </p>
                </div>
              </JourneyStep>

              <JourneyStep number={7}>
                <div className="space-y-4">
                  <p>
                    <strong>CITIZEN CONFIRMATION:</strong> Logout from GRO. Login back into the SAME citizen account that created the grievance.
                  </p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <Code>citizen.1@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <Code>citizen.2@demo-data.cpgrams.in</Code>
                    </div>
                  </div>
                  <p>Locate the case using: Action Required, if shown OR the saved registration number.</p>
                  <p>Review the resolution. Select <strong className="text-primary bg-primary/10 px-2 py-1 rounded">YES</strong> to confirm the issue is resolved.</p>
                  <p className="text-xs text-muted-foreground">
                    Where the current lifecycle exposes a final assigned-GRO Close action after YES confirmation, the reviewer may log back into the assigned GRO and observe/complete that step.
                  </p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 2 */}
          <CollapsibleSection
            id="journey-2"
            title="JOURNEY 2 — CLARIFICATION, PARTIAL OUTCOME AND APPEAL"
          >
            <ol className="space-y-8 mt-4">
              <JourneyStep number={1}>
                <div className="space-y-3">
                  <p>Login as citizen:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <Code>citizen.1@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>The case should already appear in Action Required. If it is not immediately visible, search: <Code>CPG-2026-D3A0000000000000000D</Code>. Open it.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={2}>
                <p>
                  <strong className="text-primary">SUBMIT CLARIFICATION:</strong> Enter a useful clarification in the existing clarification form and submit it.
                </p>
              </JourneyStep>

              <JourneyStep number={3}>
                <div className="space-y-4">
                  <p>Logout. Login as GRO:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" aria-hidden />
                      <Code>gro.urban.pune.b@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-5 border-2 border-primary/20 space-y-3 font-bold text-foreground">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                      OPEN CASES
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                      SEARCH: <Code>CPG-2026-D3A0000000000000000D</Code>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                      OPEN THE MATCHING CASE
                    </div>
                  </div>
                </div>
              </JourneyStep>

              <JourneyStep number={4}>
                <p>Click AI Summary. Then scroll through the case and verify the newly submitted citizen clarification is visible.</p>
              </JourneyStep>

              <JourneyStep number={5}>
                <p>
                  <strong className="text-primary">SUBMIT RESOLUTION:</strong> Submit a resolution using the existing GRO resolution workflow. Where available, demonstrate AI Resolution Intelligence before final submission.
                </p>
              </JourneyStep>

              <JourneyStep number={6}>
                <div className="space-y-4">
                  <p>Logout. Login again as citizen:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <Code>citizen.1@demo-data.cpgrams.in</Code>
                    </div>
                  </div>
                  <p>Find the resolution in Action Required OR search registration number. Open: <Code>CPG-2026-D3A0000000000000000D</Code></p>
                  <p>Review the resolution. Select <strong className="text-primary bg-primary/10 px-2 py-1 rounded">PARTLY</strong>. Enter a short reason explaining what remains unresolved. Proceed to the existing appeal action.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={7}>
                <div className="space-y-4">
                  <p><strong>APPELLATE:</strong> Login to the single Appellate Authority reviewer account:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <Gavel className="size-4 text-primary" aria-hidden />
                      <Code>appellate@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>Open the appeal. Review the available appellate context and demonstrate: original grievance, GRO response, citizen partial-disagreement, existing appeal actions, and appellate decision workflow.</p>
                  <p>Submit/make a demo appellate decision only if that action is already supported and safe in the seeded reviewer environment.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 3 */}
          <CollapsibleSection
            id="journey-3"
            title="JOURNEY 3 — CITIZEN REJECTS THE OUTCOME"
          >
            <ol className="space-y-8 mt-4">
              <JourneyStep number={1}>
                <div className="space-y-4">
                  <p>Login as citizen:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <Code>citizen.2@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>Open case: <Code>CPG-2026-D3A0000000000000001E</Code></p>
                  <p>Review the existing government resolution. Select <strong className="text-primary bg-primary/10 px-2 py-1 rounded">NO</strong>. Enter why the issue is still unresolved. Proceed with the existing Appeal action.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={2}>
                <div className="space-y-4">
                  <p>Use the single Appellate Authority reviewer account:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <Gavel className="size-4 text-primary" aria-hidden />
                      <Code>appellate@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>Login to that appellate account. Open the newly filed appeal. Inspect all available appeal information. Explore the available appellate actions/options.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          {/* Journey 4 */}
          <CollapsibleSection
            id="journey-4"
            title="JOURNEY 4 — EXPLORE THE SPECIALIST GOVERNMENT WORKSPACES"
          >
            <ol className="space-y-8 mt-4">
              <JourneyStep number={1}>
                <div className="space-y-4">
                  <p><strong>PART A — NODAL OFFICER</strong></p>
                  <p>Login to the seeded Nodal account:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" aria-hidden />
                      <Code>nodal.supervisory@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>Explore the following features:</p>
                  <ul className="list-decimal list-inside space-y-2 ml-2">
                    <li>Normal GRO-style grievance operational capabilities available to the Nodal account.</li>
                    <li>Wider organization/subtree case visibility.</li>
                    <li>Statistics/dashboard.</li>
                    <li>SLA and priority information.</li>
                    <li>Officer/workload information where present.</li>
                    <li><strong className="text-primary">SYSTEMIC ISSUES</strong> section.</li>
                    <li>Open a systemic issue and inspect the related grievance pattern/cluster.</li>
                    <li>Compare this wider oversight with an individual GRO queue.</li>
                  </ul>
                  <div className="bg-muted/30 border-l-4 border-primary p-3 italic text-sm">
                    A GRO handles individual assigned grievances. The Nodal Officer can also work operationally where authorized, but additionally sees the broader organizational picture — workload, SLA/priority trends and recurring systemic issues.
                  </div>
                </div>
              </JourneyStep>

              <JourneyStep number={2}>
                <div className="space-y-4">
                  <p><strong>PART B — APPELLATE AUTHORITY</strong></p>
                  <p>Login to the single seeded Appellate Authority account:</p>
                  <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2">
                      <Gavel className="size-4 text-primary" aria-hidden />
                      <Code>appellate@demo-data.cpgrams.in</Code>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Password: <Code>{DEMO_PASSWORD}</Code>
                    </div>
                  </div>
                  <p>Inspect: appeals queue, original grievance, requested outcome, government response, citizen disagreement, timeline/context, available decision actions, and previously decided appeal if one exists.</p>
                  <p>Appellate Authority is not simply another GRO queue.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={3}>
                <div className="space-y-4">
                  <p><strong>PART C — GUIDANCE ASSISTANT</strong></p>
                  <p>Open the Guidance Assistant. Suggested test questions:</p>
                  <ul className="space-y-2">
                    <li><Code>"How do I file a grievance?"</Code></li>
                    <li><Code>"Where can I see my grievances?"</Code></li>
                    <li><Code>"How do I respond to a clarification request?"</Code></li>
                    <li><Code>"How do I appeal?"</Code></li>
                    <li><Code>"What does a Nodal Officer do?"</Code></li>
                    <li><Code>"What does a GRO do?"</Code></li>
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">
                    This assistant intentionally performs basic information/navigation guidance. It should answer basic portal questions, recommend relevant pages, stay within allowed routes, and avoid autonomous government actions.
                  </p>
                  <div className="rounded-md border border-warning/30 bg-warning-surface px-4 py-3 text-sm text-warning-foreground mt-3">
                    <strong>Demo AI limit:</strong> approximately 30 requests per minute. Availability may also depend on upstream Gemini provider quota. Fallback behavior is expected when the quota is exhausted.
                  </div>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>
        </section>

        {/* What this prototype improves */}
        <section className="space-y-6" aria-labelledby="advantages">
          <div className="border-b border-border pb-4">
            <h2 id="advantages" className="text-3xl font-black tracking-tight text-foreground uppercase">
              What This Prototype Improves
            </h2>
          </div>

          <div className="space-y-8">
            {/* Citizen */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-primary uppercase">
                <UserRound className="size-5" aria-hidden />
                Citizen
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Problem-first grievance creation",
                    body: "The citizen can begin by simply describing the actual problem instead of first understanding the complete government organization/category hierarchy.",
                  },
                  {
                    title: "AI grievance understanding",
                    body: "The AI extracts: what happened, what the citizen wants resolved, location where detectable, suggested grievance type, suggested government destination, and helpful missing information.",
                  },
                  {
                    title: "Missing-information guidance",
                    body: "Instead of simply rejecting a vague grievance, the interface can explain what information would make the complaint stronger (e.g., Pension grievance missing identifiers).",
                  },
                  {
                    title: "AI confidence / suitability guidance",
                    body: "Where implemented, AI can indicate uncertainty or whether CPGRAMS appears suitable for the issue. AI does not make a legally authoritative eligibility decision.",
                  },
                  {
                    title: "Advisory routing",
                    body: "AI gives a government destination/type suggestion while the citizen remains in control. This is an AI-assisted routing suggestion, not fully autonomous routing.",
                  },
                  {
                    title: "Requested-outcome extraction",
                    body: "The interface explicitly identifies: “What do you actually want the government to resolve?” This makes the desired outcome much clearer for the officer.",
                  },
                  {
                    title: "Action Required workspace",
                    body: "Clarification requests, document requests and resolution-review actions are surfaced clearly to the citizen rather than being buried inside case history.",
                  },
                  {
                    title: "Explicit citizen outcome confirmation",
                    body: "Citizen can clearly respond YES / PARTLY / NO to the government resolution. That result then drives the next understandable action, including appeal where applicable.",
                  },
                ].map(({ title, body }) => (
                  <Card key={title} className="border-border shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <p className="font-bold flex items-start gap-2">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden />
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground ml-7">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* GRO */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-primary uppercase">
                <ShieldCheck className="size-5" aria-hidden />
                GRO
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Assigned-case workspace",
                    body: "GROs work on grievances actually assigned to them rather than every officer seeing every case.",
                  },
                  {
                    title: "AI Officer Summary",
                    body: "Officer can generate a concise AI summary of the grievance and important case context. AI is clearly labeled as advisory.",
                  },
                  {
                    title: "Requested outcome visibility",
                    body: "Officer can immediately see what result the citizen was actually asking for.",
                  },
                  {
                    title: "AI Resolution Intelligence",
                    body: "Before submitting a resolution, AI compares what the citizen requested vs. what the government response actually claims to have done, warning about vague responses such as “Necessary action taken” or “Forwarded to concerned authority.”",
                  },
                  {
                    title: "Clarification workflow",
                    body: "Officer can explicitly request clarification and later see the citizen's response in the case workspace.",
                  },
                  {
                    title: "Structured document requests",
                    body: "Officer can request required documents/items and see which requested items have or have not been supplied.",
                  },
                  {
                    title: "Progress updates",
                    body: "Officer can provide citizen-visible progress instead of jumping directly from filed → resolved.",
                  },
                  {
                    title: "Wrong-route transfer workflow",
                    body: "Where implemented, demonstrates destination restriction, transfer reason, preserved case history, new responsible office, and wrong-route deadline.",
                  },
                  {
                    title: "Citizen-confirmed closure",
                    body: "Where currently implemented, a government response alone does not automatically mean the citizen agreed. An assigned officer can finally close a case after the required citizen-confirmation state. This is prototype workflow design.",
                  },
                ].map(({ title, body }) => (
                  <Card key={title} className="border-border shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <p className="font-bold flex items-start gap-2">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden />
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground ml-7">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Nodal Officer */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-primary uppercase">
                <Users className="size-5" aria-hidden />
                Nodal Officer
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "GRO operational capabilities",
                    body: "Where authorized, Nodal can inspect/work with grievances similarly to GRO operational workflows.",
                  },
                  {
                    title: "Organization/subtree oversight",
                    body: "Nodal can see a wider authorized organization scope rather than only one individual GRO queue.",
                  },
                  {
                    title: "Statistics / operational analytics",
                    body: "Show the actual implemented statistics visible in the Nodal account.",
                  },
                  {
                    title: "Priority and SLA oversight",
                    body: "Show approaching deadlines, breached deadlines, priority distribution, and workload patterns where implemented.",
                  },
                  {
                    title: "Systemic Issues",
                    body: "Instead of viewing every grievance only as an isolated complaint, this section helps the Nodal Officer identify repeated or related problems (e.g. many water complaints from the same area) indicating a wider service-delivery problem. Only seeded/demo clusters exist.",
                  },
                  {
                    title: "Multi-GRO workload visibility",
                    body: "Where implemented, Nodal can understand how work is distributed across officers.",
                  },
                ].map(({ title, body }) => (
                  <Card key={title} className="border-border shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <p className="font-bold flex items-start gap-2">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden />
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground ml-7">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Appellate Authority */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-primary uppercase">
                <Gavel className="size-5" aria-hidden />
                Appellate Authority
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Focused appeal workspace",
                    body: "Appellate Authority works on appealed grievances rather than the ordinary GRO queue.",
                  },
                  {
                    title: "Full disagreement context",
                    body: "The appeal workspace clearly exposes: original citizen grievance, requested outcome, government/GRO resolution, citizen's YES/PARTLY/NO response, appeal reason/disagreement, case history, and relevant evidence where available.",
                  },
                  {
                    title: "Purpose-built appellate decision",
                    body: "The Appellate Authority can record the appellate decision and reasoning using the existing workflow.",
                  },
                  {
                    title: "Single appellate reviewer account",
                    body: "The reviewer environment uses one Appellate Authority account for all appeal demonstrations: appellate@demo-data.cpgrams.in. AI does not decide appeals.",
                  },
                ].map(({ title, body }) => (
                  <Card key={title} className="border-border shadow-sm">
                    <CardContent className="p-5 space-y-2">
                      <p className="font-bold flex items-start gap-2">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden />
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground ml-7">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Guidance Assistant Details */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold text-primary uppercase">
                <Bot className="size-5" aria-hidden />
                Guidance Assistant
              </h3>
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This prototype's assistant is a lightweight guidance and basic information provider. It is NOT presented as a major advantage over existing CPGRAMS because current CPGRAMS already has an AI chatbot.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Explains roles/process and answers basic portal questions</li>
                    <li>Recommends relevant pages and uses safe route allowlisting</li>
                    <li>Does not make government decisions</li>
                    <li>Does not access arbitrary private case information</li>
                  </ul>
                  <div className="rounded-md border border-warning/30 bg-warning-surface px-4 py-2 text-sm text-warning-foreground inline-block">
                    <strong>Demo AI limit:</strong> approximately 30 requests per minute; availability may also depend on provider quota.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="space-y-6" aria-labelledby="comparison">
          <h2 id="comparison" className="text-2xl font-bold">
            Comparison Table
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">
                    Prototype improvement
                  </th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">
                    Who benefits
                  </th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">
                    Why it improves the experience
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="bg-background">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {row.improvement}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                      {row.who}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {row.why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prototype limitations */}
        <section className="space-y-6" aria-labelledby="limitations">
          <div className="border-b border-border pb-4">
            <h2 id="limitations" className="text-3xl font-black tracking-tight text-foreground uppercase">
              Where the Current CPGRAMS Platform Is Stronger / Prototype Limitations
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Demo taxonomy only",
                body: "The organization/category taxonomy in this prototype is intentionally limited and synthetic. It is not the complete Government of India CPGRAMS taxonomy.",
              },
              {
                title: "Synthetic accounts and cases",
                body: "Reviewer citizens, GROs, Nodal Officers and Appellate Authorities are demo identities.",
              },
              {
                title: "Mock authentication",
                body: "Shared reviewer password and displayed mock OTP exist only to make hackathon evaluation easier. They would be unacceptable production authentication.",
              },
              {
                title: "AI is advisory",
                body: "Gemini can misunderstand a grievance, provide an imperfect suggestion or hit provider quota/rate limits. Manual workflows must remain available.",
              },
              {
                title: "Routing is not fully autonomous",
                body: "The current implementation provides AI suggestions. Do not claim every AI suggestion is automatically committed to the grievance routing fields.",
              },
              {
                title: "Limited national integration",
                body: "This prototype is not connected to all ministries, states, departments or official government infrastructure.",
              },
              {
                title: "No production-scale validation",
                body: "It has not undergone Government of India security, privacy, accessibility, compliance, penetration-testing or nationwide load testing.",
              },
              {
                title: "Existing CPGRAMS has real institutional scale",
                body: "The real platform has nationwide government integration, established operational users, official government processes, production infrastructure, mobile/UMANG presence, real grievance volumes, and official identity/governance mechanisms.",
              },
              {
                title: "Chatbot is intentionally basic",
                body: "The Guidance Assistant is not presented as more advanced than CPGRAMS's existing chatbot. Its role here is simple reviewer/citizen guidance and navigation.",
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
                <CardContent className="p-5 space-y-2">
                  <p className="font-bold flex items-start gap-2 text-warning-foreground">
                    <CircleAlert className="size-5 shrink-0 mt-0.5" aria-hidden />
                    {title}
                  </p>
                  <p className="text-sm leading-relaxed text-warning-foreground/80 ml-7">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
