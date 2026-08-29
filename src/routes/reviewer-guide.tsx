import { createFileRoute } from "@tanstack/react-router";
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
  Info
} from "lucide-react";
import { useState } from "react";
import { PublicShell } from "@/components/cpgrams";
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
      { name: "description", content: "Synthetic reviewer accounts, guided journeys, prototype capabilities, and limitations." },
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
      className="ml-2 inline-flex items-center rounded border border-border bg-surface-sunken p-1 text-muted-foreground hover:bg-muted transition-colors shrink-0 align-middle"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
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
  if (persona === "Citizen") return <UserRound className="size-4 text-primary shrink-0" aria-hidden />;
  if (persona === "Appellate Authority") return <Gavel className="size-4 text-primary shrink-0" aria-hidden />;
  if (persona === "Nodal Officer") return <Users className="size-4 text-primary shrink-0" aria-hidden />;
  return <ShieldCheck className="size-4 text-primary shrink-0" aria-hidden />;
}

function AccountCard({ account }: { account: ReviewerAccount }) {
  return (
    <Card className="border-border shadow-none bg-background">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <PersonaIcon persona={account.persona} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground break-all flex items-center">
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
        {open ? <ChevronUp className="size-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-5 shrink-0 text-muted-foreground" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function JourneyStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground mt-0.5">
        {number}
      </span>
      <div className="text-sm leading-relaxed space-y-3 w-full text-foreground/90">{children}</div>
    </li>
  );
}

function ExpectedResult({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-foreground mt-3">
      <span className="font-semibold block mb-1 text-primary">Expected Result: </span>
      {children}
    </div>
  );
}

const COMPARISON_ROWS: { improvement: string; who: string; why: string }[] = [
  { improvement: "Problem-first AI intake", who: "Citizen", why: "Reduces need to understand bureaucracy before describing the problem." },
  { improvement: "Requested-outcome extraction", who: "Citizen + GRO", why: "Makes the expected result explicit." },
  { improvement: "Missing-information guidance", who: "Citizen", why: "Helps improve vague complaints before submission." },
  { improvement: "AI-assisted taxonomy/destination suggestion", who: "Citizen", why: "Provides routing guidance from natural language while preserving manual control." },
  { improvement: "Action Required workflow", who: "Citizen", why: "Makes pending clarification/document/resolution tasks clearer." },
  { improvement: "AI Officer Summary", who: "GRO/Nodal", why: "Condenses case context for faster review." },
  { improvement: "AI Resolution Intelligence", who: "GRO/Nodal", why: "Compares requested outcome with proposed government response and warns about vague disposal language." },
  { improvement: "Explicit YES/PARTLY/NO confirmation", who: "Citizen + Government", why: "Makes citizen satisfaction and next action clearer." },
  { improvement: "Assigned-case ownership", who: "GRO", why: "Creates clearer individual case responsibility." },
  { improvement: "Wrong-route transfer visibility/deadline", who: "GRO/Nodal", why: "Makes routing correction more explicit and auditable." },
  { improvement: "Systemic Issues", who: "Nodal", why: "Highlights recurring patterns across multiple grievances instead of treating each case only in isolation." },
  { improvement: "Integrated appeal context", who: "Appellate", why: "Makes grievance → response → citizen disagreement easier to review in one workspace." }
];

export function ReviewerGuide() {
  return (
    <PublicShell>
      <div className="bg-muted border-b border-border py-3 text-center sticky top-16 z-30">
        <p className="text-foreground font-semibold text-sm flex items-center justify-center gap-2">
          <Info className="size-4 text-muted-foreground" aria-hidden />
          DEMONSTRATION INTERFACE — NOT AN OFFICIAL GOVERNMENT OF INDIA WEBSITE
        </p>
      </div>

      <div className="page-container max-w-4xl py-12 space-y-16">
        
        {/* Critical journey instructions / registration-number warning */}
        <section aria-labelledby="critical-instructions">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-3 font-bold text-foreground text-lg border-b border-border pb-3 mb-4">
              <Info className="size-6 shrink-0 text-primary" aria-hidden />
              <h2 id="critical-instructions">KEEP THE REGISTRATION NUMBER HANDY DURING EVERY JOURNEY</h2>
            </div>
            
            <div className="text-sm text-foreground/90 leading-relaxed space-y-3">
              <p>During these journeys you will switch between Citizen, GRO, Nodal and Appellate accounts.</p>
              
              <div className="font-semibold text-foreground text-base bg-muted/30 p-3 rounded-md border border-border">
                Whenever you create a new grievance, COPY AND SAVE THE REGISTRATION NUMBER immediately.
              </div>

              <p>Each issue type may have multiple GRO accounts. New grievances are distributed between eligible officers for the selected organization. When switching to the government side, use the selected organization/type to determine which GRO accounts to check.</p>
              
              <ul className="space-y-1 bg-muted/20 p-3 rounded-md border border-border">
                <li className="flex items-center gap-2">
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> Water complaint → check Water GRO accounts only.
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> Urban complaint → check Urban GRO accounts only.
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> Pension complaint → check Pension GRO accounts only.
                </li>
              </ul>
              
              <p>If an organization has multiple GRO accounts, login to the relevant GRO accounts and use the saved registration number until you find the officer who received the grievance.</p>
              
              <div className="bg-background rounded-lg p-4 mt-4 border border-border">
                <div className="space-y-3 font-bold text-primary">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    OPEN CASES
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    SEARCH USING THE SAVED REGISTRATION NUMBER
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    OPEN THE MATCHING CASE
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                    VERIFY THAT THE CASE IS ASSIGNED TO THIS OFFICER BEFORE CONTINUING
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 font-medium text-foreground">
                <CircleAlert className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p>Do not assume the first GRO account listed owns the grievance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Journeys */}
        <section className="space-y-4" aria-labelledby="journeys">
          <h2 id="journeys" className="text-2xl font-bold text-foreground border-b border-border pb-3">
            Reviewer Journeys
          </h2>

          <CollapsibleSection id="journey-1" title="JOURNEY 1 — TEST AI INTAKE AND COMPLETE A NEW WATER GRIEVANCE" defaultOpen>
            <ol className="space-y-8 mt-2">
              <JourneyStep number={1}>
                <p>Login using either citizen reviewer account.</p>
                <div className="flex flex-col gap-2 bg-background p-3 rounded-md border border-border">
                  <div className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /><Code>citizen.1@demo-data.cpgrams.in</Code></div>
                  <div className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /><Code>citizen.2@demo-data.cpgrams.in</Code></div>
                  <div className="text-sm text-muted-foreground">Password: <Code>{DEMO_PASSWORD}</Code></div>
                </div>
              </JourneyStep>

              <JourneyStep number={2}>
                <div className="space-y-4">
                  <p>Paste each example separately into the grievance description and proceed to the AI analysis step to observe AI understanding. Do not submit all three.</p>

                  <Card className="border-border shadow-none bg-background">
                    <CardHeader className="py-3 px-4 border-b border-border">
                      <CardTitle className="text-sm font-bold text-foreground">TEST A — DETAILED WATER ISSUE</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm leading-relaxed text-foreground/90 relative pr-10">
                        For almost two weeks, the water in our lane has been coming for barely 10–15 minutes in the morning and the pressure is extremely low. Several houses around Lane 4, Kothrud are facing the same problem, although the next street seems to get water normally. I called the local office twice and was told someone would check, but nothing has changed yet. Please look into whatever is causing this and restore the normal supply.
                        <div className="absolute top-0 right-0"><CopyButton text="For almost two weeks, the water in our lane has been coming for barely 10–15 minutes in the morning and the pressure is extremely low. Several houses around Lane 4, Kothrud are facing the same problem, although the next street seems to get water normally. I called the local office twice and was told someone would check, but nothing has changed yet. Please look into whatever is causing this and restore the normal supply." /></div>
                      </div>
                      <ExpectedResult>AI should understand a detailed public-service water complaint.</ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-none bg-background">
                    <CardHeader className="py-3 px-4 border-b border-border">
                      <CardTitle className="text-sm font-bold text-foreground">TEST B — VERY LITTLE DETAIL — PENSION</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm leading-relaxed text-foreground/90 relative pr-10">
                        My pension hasn't come for the last three months. Earlier it used to come regularly, but suddenly it stopped. I visited the office once and they just told me to check again later. Please help me find out what happened.
                        <div className="absolute top-0 right-0"><CopyButton text="My pension hasn't come for the last three months. Earlier it used to come regularly, but suddenly it stopped. I visited the office once and they just told me to check again later. Please help me find out what happened." /></div>
                      </div>
                      <ExpectedResult>AI should understand the pension problem while recognizing that additional identifying/supporting information would make it stronger.</ExpectedResult>
                    </CardContent>
                  </Card>

                  <Card className="border-border shadow-none bg-background">
                    <CardHeader className="py-3 px-4 border-b border-border">
                      <CardTitle className="text-sm font-bold text-foreground">TEST C — ISSUE OUTSIDE NORMAL CPGRAMS SCOPE</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm leading-relaxed text-foreground/90 relative pr-10">
                        I ordered a laptop online a few days ago and when it arrived the screen was damaged. I've been trying to contact the seller but they keep refusing to replace it. I already paid the full amount and don't know what else to do now. Please help me get either a replacement or my money back.
                        <div className="absolute top-0 right-0"><CopyButton text="I ordered a laptop online a few days ago and when it arrived the screen was damaged. I've been trying to contact the seller but they keep refusing to replace it. I already paid the full amount and don't know what else to do now. Please help me get either a replacement or my money back." /></div>
                      </div>
                      <ExpectedResult>AI should recognize that this appears to concern a private seller rather than blindly treating every paragraph as a normal government-service grievance.</ExpectedResult>
                    </CardContent>
                  </Card>
                </div>
              </JourneyStep>

              <JourneyStep number={3}>
                <div className="space-y-3">
                  <p><strong>SUBMIT ONLY TEST A</strong> (Detailed Water Issue). For manual destination selection choose the demo water path:</p>
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2 text-sm">
                    <div><strong className="text-xs text-muted-foreground block">Organization:</strong> [DEMO] Civic Services Supervisory Group › [DEMO] Water Service Office</div>
                    <div><strong className="text-xs text-muted-foreground block">Category:</strong> [DEMO] Water services › [DEMO] Water supply interruption</div>
                  </div>
                </div>
              </JourneyStep>

              <JourneyStep number={4}>
                <p>Submit the grievance.</p>
                <div className="font-bold text-primary mt-2">STOP — COPY AND SAVE THE GENERATED REGISTRATION NUMBER BEFORE CONTINUING.</div>
              </JourneyStep>

              <JourneyStep number={5}>
                <div className="space-y-3">
                  <p>Logout from citizen. Login only to WATER GRO accounts.</p>
                  <div className="flex flex-col gap-2 bg-background p-3 rounded-md border border-border">
                    <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" /><Code>gro.water.a@demo-data.cpgrams.in</Code></div>
                    <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" /><Code>gro.water.b@demo-data.cpgrams.in</Code></div>
                    <div className="text-sm text-muted-foreground">Password: <Code>{DEMO_PASSWORD}</Code></div>
                  </div>
                  <div className="font-bold text-foreground space-y-2 pt-2">
                    <div>1. OPEN CASES</div>
                    <div>2. SEARCH USING THE SAVED REGISTRATION NUMBER</div>
                    <div>3. OPEN THE MATCHING CASE</div>
                  </div>
                  <p className="text-muted-foreground">If not found, logout and try the next Water GRO account.</p>
                </div>
              </JourneyStep>

              <JourneyStep number={6}>
                <p>Explore the case. Run AI Summary, inspect requested outcome, and submit a reasonable resolution. If available, test AI Resolution Intelligence before submitting.</p>
              </JourneyStep>

              <JourneyStep number={7}>
                <div className="space-y-3">
                  <p>Logout from GRO. Login back to the creating citizen:</p>
                  <div className="flex flex-col gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <div className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /><Code>citizen.1@demo-data.cpgrams.in</Code></div>
                    <div className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /><Code>citizen.2@demo-data.cpgrams.in</Code></div>
                  </div>
                  <p>Locate the case via Action Required or registration number. Review resolution. Select <strong className="text-primary font-semibold">YES</strong> to confirm closure.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection id="journey-2" title="JOURNEY 2 — CLARIFICATION, PARTIAL OUTCOME AND APPEAL">
            <ol className="space-y-8 mt-2">
              <JourneyStep number={1}>
                <div className="space-y-3">
                  <p>Login as citizen:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <UserRound className="size-4 text-muted-foreground" /><Code>citizen.1@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Open case: <Code>CPG-2026-D3A0000000000000000D</Code></p>
                </div>
              </JourneyStep>
              <JourneyStep number={2}>
                <p><strong className="text-foreground">SUBMIT CLARIFICATION:</strong> Enter a useful clarification in the existing form and submit.</p>
              </JourneyStep>
              <JourneyStep number={3}>
                <div className="space-y-3">
                  <p>Logout. Login as GRO:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <ShieldCheck className="size-4 text-muted-foreground" /><Code>gro.urban.pune.b@demo-data.cpgrams.in</Code>
                  </div>
                  <div className="font-bold text-foreground space-y-2 pt-2">
                    <div>1. OPEN CASES</div>
                    <div>2. SEARCH: <Code>CPG-2026-D3A0000000000000000D</Code></div>
                    <div>3. OPEN THE MATCHING CASE</div>
                  </div>
                </div>
              </JourneyStep>
              <JourneyStep number={4}><p>Click AI Summary. Verify citizen clarification is visible.</p></JourneyStep>
              <JourneyStep number={5}><p><strong className="text-foreground">SUBMIT RESOLUTION:</strong> Submit a resolution using the GRO workflow.</p></JourneyStep>
              <JourneyStep number={6}>
                <div className="space-y-3">
                  <p>Logout. Login as citizen:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <UserRound className="size-4 text-muted-foreground" /><Code>citizen.1@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Open <Code>CPG-2026-D3A0000000000000000D</Code>. Select <strong className="text-primary font-semibold">PARTLY</strong>, enter short reason, and proceed to FILE APPEAL.</p>
                </div>
              </JourneyStep>
              <JourneyStep number={7}>
                <div className="space-y-3">
                  <p>Login to Appellate Authority:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <Gavel className="size-4 text-muted-foreground" /><Code>appellate@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Open the appeal. Review context and appellate decision workflow.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection id="journey-3" title="JOURNEY 3 — CITIZEN REJECTS THE OUTCOME">
            <ol className="space-y-8 mt-2">
              <JourneyStep number={1}>
                <div className="space-y-3">
                  <p>Login as citizen:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <UserRound className="size-4 text-muted-foreground" /><Code>citizen.2@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Open case: <Code>CPG-2026-D3A0000000000000001E</Code></p>
                  <p>Select <strong className="text-primary font-semibold">NO</strong>, enter reason, and proceed to FILE APPEAL.</p>
                </div>
              </JourneyStep>
              <JourneyStep number={2}>
                <div className="space-y-3">
                  <p>Login to Appellate Authority:</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <Gavel className="size-4 text-muted-foreground" /><Code>appellate@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Open newly filed appeal, inspect information, and explore appellate actions.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection id="journey-4" title="JOURNEY 4 — EXPLORE THE SPECIALIST GOVERNMENT WORKSPACES">
            <ol className="space-y-8 mt-2">
              <JourneyStep number={1}>
                <div className="space-y-3">
                  <p><strong>PART A — NODAL OFFICER</strong></p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <Users className="size-4 text-muted-foreground" /><Code>nodal.supervisory@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Explore capabilities:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                    <li>Wider organization/subtree visibility</li>
                    <li>Statistics/dashboard & SLA priority</li>
                    <li><strong className="text-foreground">SYSTEMIC ISSUES</strong> section</li>
                  </ul>
                  <p className="text-sm">A GRO handles individual grievances. Nodal Officers see broader organizational workload, SLAs, and systemic issues.</p>
                </div>
              </JourneyStep>
              <JourneyStep number={2}>
                <div className="space-y-3">
                  <p><strong>PART B — APPELLATE AUTHORITY</strong></p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border w-fit">
                    <Gavel className="size-4 text-muted-foreground" /><Code>appellate@demo-data.cpgrams.in</Code>
                  </div>
                  <p>Inspect appeals queue, requested outcome, citizen disagreement, and decision actions. This is not just another GRO queue.</p>
                </div>
              </JourneyStep>
              <JourneyStep number={3}>
                <div className="space-y-3">
                  <p><strong>PART C — GUIDANCE ASSISTANT</strong></p>
                  <p>Suggested test questions:</p>
                  <div className="flex flex-wrap gap-2">
                    <Code>"How do I file?"</Code>
                    <Code>"How do I appeal?"</Code>
                    <Code>"What does a GRO do?"</Code>
                  </div>
                  <p className="text-sm">Provides basic portal guidance. Does not make government decisions. Demo AI limit: approx 30 requests per minute.</p>
                </div>
              </JourneyStep>
            </ol>
          </CollapsibleSection>
        </section>

        {/* Reviewer account list */}
        <section className="space-y-6" aria-labelledby="accounts">
          <div className="border-b border-border pb-3">
            <h2 id="accounts" className="text-2xl font-bold text-foreground">Reviewer Account Directory</h2>
            <p className="mt-1 text-muted-foreground text-sm">Reviewer authentication is intentionally simplified. Production uses secure OTP. Mock OTP: <Code>24682468</Code></p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">1. Citizens</h3>
              <div className="grid gap-3 md:grid-cols-2">{sortedAccounts("Citizen").map((a) => <AccountCard key={a.email} account={a} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">2. GROs</h3>
              <div className="grid gap-3 md:grid-cols-2">{sortedAccounts("GRO").map((a) => <AccountCard key={a.email} account={a} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">3. Nodal Officers</h3>
              <div className="grid gap-3 md:grid-cols-2">{sortedAccounts("Nodal Officer").map((a) => <AccountCard key={a.email} account={a} />)}</div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">4. Appellate Authority</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <AccountCard account={{ email: "appellate@demo-data.cpgrams.in", persona: "Appellate Authority", organization: "Civic Services Supervisory Group › Appellate Review Cell", bestFor: "Appellate Authority journeys" }} />
              </div>
            </div>
          </div>
        </section>

        {/* What this prototype improves */}
        <section className="space-y-6" aria-labelledby="advantages">
          <h2 id="advantages" className="text-2xl font-bold text-foreground border-b border-border pb-3 uppercase">What This Prototype Improves</h2>
          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><UserRound className="size-5 text-muted-foreground" /> Citizen</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { title: "Problem-first grievance creation", body: "Citizen describes the actual problem instead of first understanding complete government taxonomy." },
                { title: "AI grievance understanding", body: "Extracts what happened, wanted outcome, location, and helpful missing information." },
                { title: "Missing-information guidance", body: "Explains what information would make the complaint stronger before submission." },
                { title: "AI confidence / suitability guidance", body: "AI can indicate uncertainty or if CPGRAMS appears suitable. Does not make authoritative decisions." },
                { title: "Advisory routing", body: "AI-assisted routing suggestion while the citizen remains in control. Not fully autonomous routing." },
                { title: "Requested-outcome extraction", body: "Explicitly identifies what the citizen wants resolved for clearer officer review." },
                { title: "Action Required workspace", body: "Clarification/document requests and resolution review are clearly surfaced." },
                { title: "Explicit citizen outcome confirmation", body: "Citizen responds YES/PARTLY/NO, driving the next understandable action including appeal." },
              ].map((adv) => (
                <Card key={adv.title} className="shadow-none border-border bg-background">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-semibold text-sm">{adv.title}</p>
                    <p className="text-sm text-muted-foreground">{adv.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pt-4"><ShieldCheck className="size-5 text-muted-foreground" /> GRO</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { title: "Assigned-case workspace", body: "GROs work on assigned grievances rather than every officer seeing every case." },
                { title: "AI Officer Summary", body: "Advisory concise summary of grievance and context." },
                { title: "Requested outcome visibility", body: "Officer sees exactly what result the citizen asked for." },
                { title: "AI Resolution Intelligence", body: "Compares requested outcome vs government response, warning about vague disposal language." },
                { title: "Clarification workflow", body: "Explicit requests for clarification surfaced in the case workspace." },
                { title: "Structured document requests", body: "Request required items and see which have been supplied." },
                { title: "Progress updates", body: "Provide citizen-visible progress instead of jumping from filed to resolved." },
                { title: "Wrong-route transfer workflow", body: "Demonstrates destination restriction, transfer reason, and wrong-route deadline." },
                { title: "Citizen-confirmed closure", body: "Assigned officer finally closes case after required citizen confirmation state." },
              ].map((adv) => (
                <Card key={adv.title} className="shadow-none border-border bg-background">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-semibold text-sm">{adv.title}</p>
                    <p className="text-sm text-muted-foreground">{adv.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pt-4"><Users className="size-5 text-muted-foreground" /> Nodal Officer</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { title: "GRO operational capabilities", body: "Inspect/work with grievances similarly to GRO where authorized." },
                { title: "Organization/subtree oversight", body: "Wider authorized scope rather than one individual queue." },
                { title: "Statistics / operational analytics", body: "Implemented statistics visible in Nodal account." },
                { title: "Priority and SLA oversight", body: "Deadlines, priority distribution, workload patterns." },
                { title: "Systemic Issues", body: "Identifies repeated/related problems indicating wider service-delivery issues based on seeded clusters." },
                { title: "Multi-GRO workload visibility", body: "Understand work distribution across officers." },
              ].map((adv) => (
                <Card key={adv.title} className="shadow-none border-border bg-background">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-semibold text-sm">{adv.title}</p>
                    <p className="text-sm text-muted-foreground">{adv.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pt-4"><Gavel className="size-5 text-muted-foreground" /> Appellate Authority</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { title: "Focused appeal workspace", body: "Works on appealed grievances rather than ordinary queue." },
                { title: "Full disagreement context", body: "Exposes grievance, outcome, resolution, disagreement, and history." },
                { title: "Purpose-built appellate decision", body: "Record appellate decision and reasoning." },
                { title: "Single appellate reviewer account", body: "Uses one demo Appellate account. AI does not decide appeals." },
              ].map((adv) => (
                <Card key={adv.title} className="shadow-none border-border bg-background">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-semibold text-sm">{adv.title}</p>
                    <p className="text-sm text-muted-foreground">{adv.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pt-4"><Bot className="size-5 text-muted-foreground" /> Guidance Assistant</h3>
            <Card className="shadow-none border-border bg-background">
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-muted-foreground">Lightweight guidance, basic information provider. Explains roles/process, recommends pages, does not make government decisions. Current CPGRAMS already has an AI chatbot; this is for demo navigation guidance. Demo AI limit: approx 30 requests/min based on provider quota.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Comparison table */}
        <section className="space-y-4" aria-labelledby="comparison">
          <h2 id="comparison" className="text-xl font-bold">Comparison Table</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Prototype improvement</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Who benefits</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Why it improves experience</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="bg-background">
                    <td className="px-4 py-3 font-medium text-foreground">{row.improvement}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.who}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prototype limitations */}
        <section className="space-y-4" aria-labelledby="limitations">
          <h2 id="limitations" className="text-xl font-bold text-foreground uppercase border-b border-border pb-3">
            Where the Current CPGRAMS Platform Is Stronger / Prototype Limitations
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { title: "Demo taxonomy only", body: "Intentionally limited synthetic taxonomy, not complete GOI taxonomy." },
              { title: "Synthetic accounts and cases", body: "Reviewers and cases are demo identities." },
              { title: "Mock authentication", body: "Shared password/mock OTP exist only to simplify hackathon evaluation." },
              { title: "AI is advisory", body: "Manual fallback remains available due to quota limits or imperfect suggestions." },
              { title: "Routing is not fully autonomous", body: "Provides AI suggestions, not automatically committed routing." },
              { title: "Limited national integration", body: "Not connected to all ministries/states/infrastructure." },
              { title: "No production-scale validation", body: "Has not undergone GOI security/privacy/load testing." },
              { title: "Existing CPGRAMS has real institutional scale", body: "Real platform has nationwide integration, real volume, and mobile/UMANG presence." },
              { title: "Chatbot is intentionally basic", body: "Simple guidance, not presented as more advanced than CPGRAMS chatbot." },
              { title: "Seeded Systemic Issues are demo-scale", body: "Clustered issues are pre-seeded demo data, not real-time nationwide analytics." },
              { title: "No mobile / UMANG deployment", body: "Not verified on production mobile infrastructure." },
              { title: "No formal government certification", body: "No formal security audit or compliance certification." },
            ].map((lim) => (
              <Card key={lim.title} className="shadow-none border-border bg-background">
                <CardContent className="p-4 space-y-1">
                  <p className="font-semibold text-sm">{lim.title}</p>
                  <p className="text-sm text-muted-foreground">{lim.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
