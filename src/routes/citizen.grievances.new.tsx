import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiSuggestionCard, ConfirmationDialog, PageHeader } from "@/components/cpgrams";

export const Route = createFileRoute("/citizen/grievances/new")({
  head: () => ({
    meta: [
      { title: "Describe your problem — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Describe your problem in your own words. Government categories are applied afterwards, with assistance.",
      },
      { property: "og:title", content: "Describe your problem" },
      {
        property: "og:description",
        content: "Plain-language grievance intake — no ministry codes to guess.",
      },
    ],
  }),
  component: NewGrievancePage,
});

const STEPS = [
  { n: 1, label: "Describe the problem" },
  { n: 2, label: "What outcome do you want?" },
  { n: 3, label: "Where and when" },
  { n: 4, label: "Confirm and submit" },
];

function NewGrievancePage() {
  const [text, setText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="New grievance"
        title="Describe your problem"
        description="Write it the way you would explain it to a person. You will not be asked to pick a ministry or category."
      />

      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary">
              {s.n}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <Card className="border-border">
        <CardContent className="space-y-5 p-5 md:p-6">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="problem">What went wrong?</Label>
              <Textarea
                id="problem"
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="For example: My father's pension has not been credited since April. We visited the office twice and were told it was processed, but the bank has received nothing."
              />
              <p className="text-xs text-muted-foreground">
                Your words are stored exactly as written and stay on the case permanently.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outcome">What would fix this for you?</Label>
              <Textarea
                id="outcome"
                rows={3}
                placeholder="For example: The pending amount credited to the bank account, and a date I can rely on."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="place">Where did this happen?</Label>
                <Input id="place" placeholder="City, district or office name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="since">Since when?</Label>
                <Input id="since" placeholder="e.g. April 2026" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="files">Supporting documents (optional)</Label>
              <Input id="files" type="file" multiple />
            </div>

            <Button type="submit">Review and submit</Button>
          </form>

          <AiSuggestionCard
            suggestion={{
              id: "placeholder",
              kind: "office_routing",
              title: "Routing assistance will appear here",
              body: "Once assistive routing is connected, a suggested office and category will be shown for your review. You never have to accept it, and it is never applied automatically.",
              basis: "Not connected yet — placeholder only.",
            }}
          />
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this grievance?"
        description="Your description will be stored exactly as written and sent to the office responsible. You can add more information later, but this text will always remain on the case."
        confirmLabel="Submit grievance"
        onConfirm={() => setConfirmOpen(false)}
      />
    </div>
  );
}
