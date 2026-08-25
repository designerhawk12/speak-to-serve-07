import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How this grievance process works — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "How a grievance moves from your description to an office, an action, your confirmation, and if needed an appeal.",
      },
      { property: "og:title", content: "How this grievance process works" },
      {
        property: "og:description",
        content: "From plain-language description to citizen-confirmed outcome and appeal.",
      },
    ],
  }),
  component: AboutPage,
});

const SECTIONS = [
  {
    title: "You describe, we classify",
    body: "You write the problem in normal language. Ministry, department and category are applied behind the interface and shown to you as plain names, never as codes you must choose.",
  },
  {
    title: "A named office owns the case",
    body: "Cases are routed to an office that accepts responsibility. Every routing and re-routing is recorded permanently on the case history.",
  },
  {
    title: "Actions are recorded, not assumed",
    body: "When an office does something, it records what it did and attaches supporting documents. The record cannot be edited later — corrections are added as new events.",
  },
  {
    title: "Disposal is not resolution",
    body: "The government can mark a case disposed. Separately, you tell us whether the real-world problem went away. Those two answers are stored and shown separately, always.",
  },
  {
    title: "Appeal is a normal, visible option",
    body: "If the case was closed without solving your problem, you can ask a senior Appellate Authority to review how it was handled. The appeal stage, reasoning and outcome are shown in plain language.",
  },
  {
    title: "AI assists, humans decide",
    body: "Assistive features may help route, summarise and spot repeated problems. They will never invent a government action, close a grievance, or decide an appeal.",
  },
];

function AboutPage() {
  return (
    <PublicShell>
      <div className="page-container py-10 md:py-14">
        <PageHeader
          eyebrow="How it works"
          title="What happens after you describe your problem"
          description="This service is built around one idea: a case should explain what is actually happening, in language you already use."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="border-border">
              <CardContent className="space-y-2 p-5">
                <h2 className="text-base font-semibold">{s.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
