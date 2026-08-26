import { Card, CardContent } from "@/components/ui/card";
import type { CitizenCaseNarrative } from "@/lib/cpgrams/citizen-narrative";

export function CaseNarrativeCard({ narrative }: { narrative: CitizenCaseNarrative }) {
  const sections = [
    ["Where is my case?", narrative.whereIsMyCase],
    ["What has happened?", narrative.whatHasHappened],
    ["What is happening now?", narrative.whatIsHappeningNow],
    ["Is anything blocking it?", narrative.blocker],
    ["What happens next?", narrative.whatHappensNext],
    ["What do I need to do?", narrative.whatYouNeedToDo],
  ] as const;
  return (
    <section className="space-y-4" aria-labelledby="case-narrative-title">
      <div>
        <h2 id="case-narrative-title" className="text-lg font-semibold">
          Case update in plain language
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This summary uses recorded case information only.
        </p>
      </div>
      <Card className="border-border">
        <CardContent className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
          {sections.map(([title, text]) => (
            <div key={title} className="space-y-1">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
              </h3>
              <p className="text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
