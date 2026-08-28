import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicTrackGrievance, type PublicGrievanceTracking } from "@/lib/cpgrams/public-tracking";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track a grievance — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Enter a registration number to see a privacy-safe current grievance stage.",
      },
    ],
  }),
  component: TrackPage,
});

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not available";
}

function TrackResult({ tracking }: { tracking: PublicGrievanceTracking }) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Registration number
            </p>
            <p className="mt-1 font-mono text-base font-semibold">{tracking.registrationNumber}</p>
          </div>
          <StatusChip label={tracking.administrativeStage} tone="info" />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <TrackingField label="Category" value={tracking.category ?? "Not categorized"} />
          <TrackingField
            label="Current organization"
            value={tracking.organizationName ?? "Being routed"}
          />
          <TrackingField label="Submitted" value={formatDate(tracking.submittedAt)} />
          <TrackingField label="Last public update" value={formatDate(tracking.lastUpdatedAt)} />
          <TrackingField label="Resolution status" value={tracking.resolutionStatus} />
          <TrackingField label="Appeal status" value={tracking.appealStatus} />
        </dl>
        <section aria-labelledby="public-milestones" className="border-t border-border pt-4">
          <h2 id="public-milestones" className="text-sm font-semibold">
            Public tracking milestones
          </h2>
          {tracking.milestones.length ? (
            <ol className="mt-3 space-y-2">
              {tracking.milestones.map((milestone) => (
                <li key={`${milestone.occurredAt}-${milestone.stage}`} className="text-sm">
                  <span className="font-medium">{milestone.stage}</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatDate(milestone.occurredAt)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No public milestones are available yet.
            </p>
          )}
        </section>
        <p className="rounded-md border border-border bg-surface-sunken p-3 text-xs text-muted-foreground">
          This fallback intentionally omits personal details, grievance text, messages, documents,
          and evidence. Sign in to see your own complete private case.
        </p>
      </CardContent>
    </Card>
  );
}

function TrackingField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function TrackPage() {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [tracking, setTracking] = useState<PublicGrievanceTracking | null | undefined>(undefined);
  const [cooldown, setCooldown] = useState(false);
  const lookup = useMutation({ mutationFn: publicTrackGrievance, onSuccess: setTracking });

  function submit() {
    if (cooldown) return;
    setTracking(undefined);
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 3_000);
    lookup.mutate(registrationNumber.trim());
  }

  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Track"
          title="Track a grievance"
          description="This is a limited public fallback. Signed-in citizens see all of their own cases automatically."
          actions={
            <Button asChild variant="outline">
              <Link to="/citizen">Go to my workspace</Link>
            </Button>
          }
        />

        <Card className="mt-6 border-border">
          <CardContent className="p-5 md:p-6">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="reg">Registration number</Label>
                <Input
                  id="reg"
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(event.target.value)}
                  placeholder="CPG-2026-..."
                  className="font-mono"
                  autoCapitalize="characters"
                />
              </div>
              <Button type="submit" disabled={lookup.isPending || cooldown}>
                <Search className="size-4" aria-hidden />
                {lookup.isPending ? "Checking" : cooldown ? "Please wait" : "Track"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          {lookup.isError ? (
            <EmptyState
              title="Tracking is temporarily unavailable"
              description="Please wait a moment and try again, or sign in to your citizen workspace."
              icon={Search}
            />
          ) : tracking === null ? (
            <EmptyState
              title="No public tracking record found"
              description="Check the registration number and try again. Sign in to see your own private cases automatically."
              icon={Search}
            />
          ) : tracking ? (
            <TrackResult tracking={tracking} />
          ) : (
            <EmptyState
              title="No case looked up yet"
              description="Enter a registration number as a public fallback."
              icon={Search}
            />
          )}
        </div>
      </div>
    </PublicShell>
  );
}
