import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  FileSearch,
  Gavel,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicShell, StatusChip, KpiCard } from "@/components/cpgrams";
import { REVIEWER_DEMO_OTP } from "@/lib/cpgrams/reviewer-demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CPGRAMS Resolution Workspace — Lodge and track a public grievance" },
      {
        name: "description",
        content:
          "Describe your problem in normal language, see what the government actually did, and confirm yourself when the problem is truly solved.",
      },
      { property: "og:title", content: "CPGRAMS Resolution Workspace" },
      {
        property: "og:description",
        content:
          "Plain-language grievance intake, cases that explain themselves, and a visible appeal path.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Describe the problem",
    body: "Write it the way you would say it. No forms full of ministry codes, no category guessing.",
  },
  {
    icon: Building2,
    title: "We route it to the right office",
    body: "Government taxonomy is applied behind the interface, and you can see which office holds your case.",
  },
  {
    icon: FileSearch,
    title: "Follow what actually happens",
    body: "Every meaningful change is recorded as a dated event, in language that explains itself.",
  },
  {
    icon: ShieldCheck,
    title: "You confirm the outcome",
    body: "The office can dispose the case. Only you can confirm the real-world problem was solved.",
  },
];

function HomePage() {
  return (
    <PublicShell>
      <section className="border-b border-critical/30 bg-critical-surface">
        <div className="page-container py-4 text-critical">
          <p className="text-sm font-bold tracking-wide uppercase">
            Demonstration interface — not an official Government of India website
          </p>
          <p className="mt-1 text-xs leading-relaxed">
            Synthetic reviewer data and explicitly mocked reviewer authentication only. No live
            government system, citizen record, or endorsement is represented.
          </p>
        </div>
      </section>

      <section className="border-b border-warning/30 bg-warning-surface">
        <div className="page-container grid gap-5 py-5 text-warning-foreground lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide uppercase">Reviewer quick start</p>
            <p className="text-sm leading-relaxed">
              Choose the email OTP tab and use mock reviewer code{" "}
              <code className="rounded bg-background/70 px-1.5 py-0.5 font-bold">
                {REVIEWER_DEMO_OTP}
              </code>
              . Citizen: <code>citizen.1@demo-data.cpgrams.in</code> or{" "}
              <code>citizen.2@demo-data.cpgrams.in</code>. Nodal:{" "}
              <code>nodal@demo-data.cpgrams.in</code>. Appellate:{" "}
              <code>appellate@demo-data.cpgrams.in</code>. GRO accounts and best cases are listed in
              the guide.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/reviewer-guide">Reviewer Guide / Demo Guide</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/auth/login">Reviewer login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="border-b border-border bg-surface-raised">
        <div className="page-container grid gap-10 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-6">
            <StatusChip label="Public grievance redress, redesigned" tone="info" dot={false} />
            <h1 className="text-3xl leading-[1.1] font-bold md:text-5xl">
              Tell us what went wrong. In your own words.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              You should not have to learn how the government is organised to ask it for help.
              Describe your problem, and we will find the office responsible, keep you informed, and
              separate &ldquo;the file was closed&rdquo; from &ldquo;the problem was solved&rdquo;.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/citizen/grievances/new">
                  Describe your problem / Lodge a grievance
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/track">Track a grievance</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
              <Link
                to="/auth/login"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-primary hover:underline"
              >
                <UserRound className="size-4" aria-hidden />
                Citizen Login
              </Link>
              <Link
                to="/auth/officer-login"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-primary hover:underline"
              >
                <ShieldCheck className="size-4" aria-hidden />
                Government Officer Login
              </Link>
              <Link
                to="/appeal-status"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-primary hover:underline"
              >
                <Gavel className="size-4" aria-hidden />
                Appeal status
              </Link>
            </div>
          </div>

          <Card className="self-start border-border">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Two statuses, never merged
              </p>
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-surface-sunken p-4">
                  <StatusChip lane="Government" label="Disposed by government" tone="info" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    The office has finished its side of the file and recorded what it did.
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-sunken p-4">
                  <StatusChip lane="You" label="Problem still there" tone="critical" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    If nothing changed on the ground, the case is not resolved — and an appeal is
                    available to you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="page-container py-14 md:py-20" aria-labelledby="how-it-works">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">How it works</p>
          <h2 id="how-it-works" className="text-2xl font-bold md:text-3xl">
            Four steps, and none of them require government vocabulary
          </h2>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full border-border">
                <CardContent className="space-y-3 p-5">
                  <span className="flex size-9 items-center justify-center rounded-md bg-accent text-primary">
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/about">Read the full process</Link>
          </Button>
        </div>
      </section>

      {/* Public dashboards */}
      <section
        className="border-y border-border bg-surface-raised py-14 md:py-20"
        aria-labelledby="dashboards"
      >
        <div className="page-container space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">
                Public dashboards
              </p>
              <h2 id="dashboards" className="text-2xl font-bold md:text-3xl">
                What the system is doing, in the open
              </h2>
              <p className="text-sm text-muted-foreground">
                Public reporting is deliberately separate from private case records. This prototype
                does not present illustrative figures as official statistics.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/dashboard/public">
                <BarChart3 className="size-4" aria-hidden />
                Public reporting status
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Case performance"
              value="Private"
              helpText="No public aggregate feed is published in this prototype"
            />
            <KpiCard
              label="Citizen outcomes"
              value="Private"
              tone="success"
              helpText="Citizen confirmation remains private to each case"
            />
            <KpiCard
              label="SLA reporting"
              value="Pending"
              tone="warning"
              helpText="Requires an approved aggregate publication contract"
            />
            <KpiCard
              label="Appeal reporting"
              value="Pending"
              tone="warning"
              helpText="Individual appeal files are private"
            />
          </div>
          <div>
            <Button asChild variant="outline">
              <Link to="/dashboard/appeals">Appeal reporting status</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Directories */}
      <section className="page-container py-14 md:py-20" aria-labelledby="directories">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Directories</p>
          <h2 id="directories" className="text-2xl font-bold md:text-3xl">
            Nodal officers and Appellate Authorities
          </h2>
          <p className="text-sm text-muted-foreground">
            Find the officer responsible for grievances in a ministry, a state, or at the appeal
            stage.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { to: "/officers/central" as const, label: "Central ministries & departments" },
            { to: "/officers/states" as const, label: "States & Union Territories" },
            { to: "/officers/appeals" as const, label: "Appellate Authorities" },
          ].map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="focus-ring group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-5 hover:shadow-raised"
            >
              <span className="text-sm font-semibold">{d.label}</span>
              <ArrowRight
                className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
