import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Gavel } from "lucide-react";
import { EmptyState, PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicTrackAppeal, type PublicAppealTracking } from "@/lib/cpgrams/public-tracking";
import { APPEAL_STATUS_META, type AppealStatus } from "@/lib/cpgrams/types";

export const Route = createFileRoute("/appeal-status")({
  head: () => ({
    meta: [
      { title: "Check appeal status — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Look up a privacy-safe current appeal status by appeal reference number.",
      },
    ],
  }),
  component: AppealStatusPage,
});

const STAGES: AppealStatus[] = [
  "eligible",
  "filed",
  "under_appeal_review",
  "appeal_decided",
  "appeal_rejected",
];

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not available";
}

function AppealResult({ tracking }: { tracking: PublicAppealTracking }) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Appeal reference
            </p>
            <p className="mt-1 font-mono text-base font-semibold">{tracking.referenceNumber}</p>
          </div>
          <StatusChip label={tracking.appealStage} tone="info" />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <AppealField
            label="Appellate organization"
            value={tracking.appellateOrganizationName ?? "Not assigned"}
          />
          <AppealField label="Filed" value={formatDate(tracking.filedAt)} />
          <AppealField label="Last public update" value={formatDate(tracking.lastUpdatedAt)} />
        </dl>
        <section aria-labelledby="appeal-milestones" className="border-t border-border pt-4">
          <h2 id="appeal-milestones" className="text-sm font-semibold">
            Public appeal milestones
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
          This fallback intentionally omits appeal reasons, decisions, evidence, documents, and the
          underlying grievance details. Sign in to see your own complete private appeal.
        </p>
      </CardContent>
    </Card>
  );
}

function AppealField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function AppealStatusPage() {
  const [reference, setReference] = useState("");
  const [tracking, setTracking] = useState<PublicAppealTracking | null | undefined>(undefined);
  const [cooldown, setCooldown] = useState(false);
  const lookup = useMutation({ mutationFn: publicTrackAppeal, onSuccess: setTracking });

  function submit() {
    if (cooldown) return;
    setTracking(undefined);
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 3_000);
    lookup.mutate(reference.trim());
  }

  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Appeals"
          title="Check the status of an appeal"
          description="This is a limited public fallback. Signed-in citizens see their own private appeal history automatically."
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
                <Label htmlFor="appeal-no">Appeal reference number</Label>
                <Input
                  id="appeal-no"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="APL-2026-..."
                  className="font-mono"
                  autoCapitalize="characters"
                />
              </div>
              <Button type="submit" disabled={lookup.isPending || cooldown}>
                <Gavel className="size-4" aria-hidden />
                {lookup.isPending ? "Checking" : cooldown ? "Please wait" : "Check status"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          {lookup.isError ? (
            <EmptyState
              title="Appeal tracking is temporarily unavailable"
              description="Please wait a moment and try again, or sign in to your citizen workspace."
              icon={Gavel}
            />
          ) : tracking === null ? (
            <EmptyState
              title="No public appeal record found"
              description="Check the appeal reference and try again. Sign in to see your own private appeal history automatically."
              icon={Gavel}
            />
          ) : tracking ? (
            <AppealResult tracking={tracking} />
          ) : (
            <EmptyState
              title="No appeal looked up yet"
              description="Enter an appeal reference as a public fallback."
              icon={Gavel}
            />
          )}
        </div>

        <section className="mt-8 space-y-3" aria-labelledby="stages">
          <h2 id="stages" className="text-lg font-semibold">
            What each appeal stage means
          </h2>
          <ul className="space-y-2">
            {STAGES.map((stage) => {
              const meta = APPEAL_STATUS_META[stage];
              return (
                <li
                  key={stage}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <StatusChip label={meta.label} tone={meta.tone} className="self-start" />
                  <p className="text-sm text-muted-foreground">{meta.meaning}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PublicShell>
  );
}
