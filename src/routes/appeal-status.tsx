import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Gavel } from "lucide-react";
import { EmptyState, PageHeader, PublicShell, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPEAL_STATUS_META, type AppealStatus } from "@/lib/cpgrams/types";

export const Route = createFileRoute("/appeal-status")({
  head: () => ({
    meta: [
      { title: "Check appeal status — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Look up an appeal, understand what each appeal stage means, and see what an Appellate Authority reviews.",
      },
      { property: "og:title", content: "Check appeal status" },
      {
        property: "og:description",
        content: "Appeal stages explained in plain language, plus lookup by appeal number.",
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

function AppealStatusPage() {
  const [reference, setReference] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Appeals"
          title="Check the status of an appeal"
          description="An appeal asks a senior Appellate Authority to review how your case was handled — not to re-register your grievance."
        />

        <Card className="border-border">
          <CardContent className="p-5 md:p-6">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                setLookupMessage(
                  reference.trim()
                    ? "Public appeal lookup is not connected in this prototype. Sign in to securely view an appeal linked to your own case."
                    : "Enter an appeal reference, or sign in to review your own private appeal history.",
                );
              }}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="appeal-no">Appeal or registration number</Label>
                <Input
                  id="appeal-no"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="DOPST/A/2026/0000411"
                  className="font-mono"
                />
              </div>
              <Button type="submit">
                <Gavel className="size-4" aria-hidden />
                Check status
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="mt-8 space-y-3" aria-labelledby="stages">
          <h2 id="stages" className="text-lg font-semibold">
            What each appeal stage means
          </h2>
          <ul className="space-y-2">
            {STAGES.map((s) => {
              const meta = APPEAL_STATUS_META[s];
              return (
                <li
                  key={s}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <StatusChip label={meta.label} tone={meta.tone} className="self-start" />
                  <p className="text-sm text-muted-foreground">{meta.meaning}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-8">
          <EmptyState
            title={lookupMessage ? "Use secure citizen access" : "No appeal looked up yet"}
            description={
              lookupMessage ||
              "Enter an appeal reference as a public fallback. Signed-in citizens see their own appeal history without a lookup."
            }
            icon={Gavel}
          />
        </div>
      </div>
    </PublicShell>
  );
}
