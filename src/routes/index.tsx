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
      {/* Hero */}
      <section className="border-b border-border bg-surface-raised">
        <div className="page-container grid gap-10 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-6">
            <StatusChip label="Public grievance redress, redesigned" tone="info" dot={false} />
            <h1 className="text-3xl leading-[1.1] font-bold md:text-5xl">
              Tell us what went wrong. In your own words.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              You should not have to learn how the government is organised to ask it for help. Describe
              your problem, and we will find the office responsible, keep you informed, and separate
              &ldquo;the file was closed&rdquo; from &ldquo;the problem was solved&rdquo;.
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
              <Link to="/auth/login" className="focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-primary hover:underline">
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
              <Link to="/appeal-status" className="focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-primary hover:underline">
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
      <section className="border-y border-border bg-surface-raised py-14 md:py-20" aria-labelledby="dashboards">
        <div className="page-container space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">Public dashboards</p>
              <h2 id="dashboards" className="text-2xl font-bold md:text-3xl">
                What the system is doing, in the open
              </h2>
              <p className="text-sm text-muted-foreground">
                Illustrative figures. Live public dashboards will be published from the case database.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/office/analytics">
                <BarChart3 className="size-4" aria-hidden />
                Detailed analytics
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Grievances this month" value="1,24,806" helpText="Registered across all offices" />
            <KpiCard
              label="Citizen-confirmed resolved"
              value="41%"
              tone="success"
              helpText="Confirmed by citizens, not by disposal counts"
            />
            <KpiCard label="Past committed timeline" value="8,912" tone="critical" helpText="Cases beyond their SLA" />
            <KpiCard label="Appeals pending" value="3,144" tone="warning" helpText="With Appellate Authorities" />
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
            Find the officer responsible for grievances in a ministry, a state, or at the appeal stage.
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
              <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
