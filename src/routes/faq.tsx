import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently asked questions — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Answers about lodging a grievance, timelines, disposal versus resolution, appeals, and privacy.",
      },
      { property: "og:title", content: "Grievance FAQs" },
      {
        property: "og:description",
        content: "Timelines, disposal versus resolution, appeals and privacy, explained simply.",
      },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "Do I need to know which ministry handles my problem?",
    a: "No. Describe the problem and we route it. If the routing is wrong, the office must transfer it and that transfer is recorded on your case.",
  },
  {
    q: "My case says 'disposed' but nothing changed. What now?",
    a: "Disposal is the government's statement about its file, not a confirmation that your problem was solved. You can report that the problem persists, and then file an appeal.",
  },
  {
    q: "How long should a grievance take?",
    a: "Each case carries a committed timeline shown as a clear indicator. If information is awaited from you, the clock is paused and you will see that too.",
  },
  {
    q: "What does an appeal actually review?",
    a: "An Appellate Authority reviews how your case was handled and whether the response addressed your problem. It can direct the office to act further and must record reasons.",
  },
  {
    q: "Is my original description changed or summarised?",
    a: "Your original text is preserved exactly as you wrote it and is always available on the case, even if a summary is displayed alongside it.",
  },
  {
    q: "Will an AI decide my case?",
    a: "No. Assistive features can suggest routing or summarise, but only an identified officer or Appellate Authority can take a decision, and their name is recorded.",
  },
];

function FaqPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Support"
          title="Frequently asked questions"
          description="If your question is not here, contact the helpline and we will add it."
        />
        <Accordion type="single" collapsible className="rounded-lg border border-border bg-surface-raised px-4">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PublicShell>
  );
}
