import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FAQ_SEARCH_SUGGESTIONS,
  FAQ_SECTIONS,
  filterFaqEntries,
  type FaqSection,
} from "@/lib/cpgrams/public-content";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently asked questions — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Search plain-language guidance about filing, case status, resolution confirmation, appeals, eligibility, and account access.",
      },
      { property: "og:title", content: "Grievance FAQs" },
      {
        property: "og:description",
        content: "Plain-language prototype guidance for the grievance workflow.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<FaqSection | "All">("All");
  const entries = useMemo(() => filterFaqEntries(query, section), [query, section]);

  return (
    <PublicShell>
      <div className="page-container max-w-4xl py-10 md:py-14">
        <PageHeader
          eyebrow="Help and guidance"
          title="Frequently asked questions"
          description="Plain-language help for this demonstration interface. It does not replace official Government of India guidance, legal advice, or an approved support channel."
        />
        <div className="mt-8 space-y-4 rounded-lg border border-border bg-surface-raised p-4 md:p-5">
          <label className="relative block" htmlFor="faq-search">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="faq-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 pl-9"
              placeholder="Search filing, appeal, documents, OTP…"
              type="search"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2" aria-label="Suggested FAQ searches">
            <span className="text-xs font-medium text-muted-foreground">Try:</span>
            {FAQ_SEARCH_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion.query}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery(suggestion.query);
                  setSection("All");
                }}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter FAQ topics">
            {(["All", ...FAQ_SECTIONS] as const).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={section === option ? "default" : "outline"}
                onClick={() => setSection(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {entries.length} {entries.length === 1 ? "answer" : "answers"} shown
          </p>
        </div>
        {entries.length ? (
          <Accordion
            type="single"
            collapsible
            className="mt-5 rounded-lg border border-border bg-surface-raised px-4"
          >
            {entries.map((entry) => (
              <AccordionItem key={entry.id} value={entry.id}>
                <AccordionTrigger className="text-left text-sm font-semibold">
                  <span className="space-y-1 text-left">
                    <span className="block text-xs font-semibold tracking-wide text-primary uppercase">
                      {entry.section}
                    </span>
                    <span>{entry.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {entry.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border bg-surface-raised p-6 text-center">
            <p className="font-semibold">No matching answer yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a shorter term, choose another topic, or clear the filters.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setSection("All");
              }}
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
