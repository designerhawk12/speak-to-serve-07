import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestOfficerSummary } from "@/lib/cpgrams/ai-gateway";
import { useLanguage } from "@/lib/cpgrams/language-context";

export function OfficerAiSummaryCard({ grievanceId }: { grievanceId: string }) {
  const { language } = useLanguage();
  const summary = useMutation({
    mutationFn: () => requestOfficerSummary({ grievanceId, language }),
  });

  return (
    <Card className="border-info/30 bg-info-surface">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-info">AI case summary</p>
            <p className="mt-1 text-sm text-info">
              Advisory only. It summarizes the authorized case record and cannot change the case,
              routing, assignment, resolution, or citizen outcome.
            </p>
          </div>
          <Sparkles className="mt-0.5 size-5 shrink-0 text-info" aria-hidden />
        </div>
        {!summary.data && (
          <Button
            type="button"
            size="sm"
            onClick={() => summary.mutate()}
            disabled={summary.isPending}
          >
            {summary.isPending ? "Preparing summary" : "Generate advisory summary"}
          </Button>
        )}
        {summary.isError && (
          <p className="text-sm text-critical" role="alert">
            {summary.error instanceof Error
              ? summary.error.message
              : "AI case summary is unavailable. Use the recorded case file."}
          </p>
        )}
        {summary.data && (
          <div className="space-y-3 text-sm">
            <p className="leading-relaxed">{summary.data.case_summary}</p>
            {summary.data.key_facts.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Key facts
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {summary.data.key_facts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.data.citizen_required_action && (
              <p>
                <span className="font-semibold">Citizen-required action:</span>{" "}
                {summary.data.citizen_required_action}
              </p>
            )}
            {summary.data.open_questions.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Open questions for officer review
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {summary.data.open_questions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary.data.fallback_used ? "Deterministic fallback" : summary.data.provider} ·{" "}
              {summary.data.prompt_version}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
