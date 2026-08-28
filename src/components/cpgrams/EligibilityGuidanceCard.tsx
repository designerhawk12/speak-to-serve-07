import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EligibilityResult } from "@/lib/cpgrams/ai-gateway";

const LABELS: Record<EligibilityResult["classification"], string> = {
  ACTIONABLE_GRIEVANCE: "Likely actionable grievance",
  POSSIBLE_RTI: "Possible RTI request",
  POSSIBLE_SUB_JUDICE: "Possible court/sub-judice matter",
  GOVERNMENT_EMPLOYEE_SERVICE_MATTER: "Possible government service matter",
  RELIGIOUS_OR_NON_SERVICE_MATTER: "Possible non-service matter",
  SUGGESTION: "Suggestion or policy proposal",
  UNCERTAIN: "Needs manual review",
};

export function EligibilityGuidanceCard({
  result,
  pending,
  error,
}: {
  result: EligibilityResult | undefined;
  pending: boolean;
  error: boolean;
}) {
  return (
    <Card className="border-info/40 bg-info-surface">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          {pending ? (
            <Loader2 className="mt-0.5 size-4 animate-spin text-info" aria-hidden />
          ) : error ? (
            <AlertCircle className="mt-0.5 size-4 text-warning" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 text-info" aria-hidden />
          )}
          <div>
            <p className="text-sm font-semibold">Eligibility guidance</p>
            <p className="text-xs text-muted-foreground">
              Advisory only. This check cannot reject, close, route, or decide your grievance.
            </p>
          </div>
        </div>
        {pending && <p className="text-sm text-muted-foreground">Reviewing the type of request…</p>}
        {error && (
          <p className="text-sm text-muted-foreground" role="status">
            Guidance is unavailable. You can continue manually and submit after reviewing your
            details.
          </p>
        )}
        {result && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{LABELS[result.classification]}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{result.guidance}</p>
            <p className="text-xs text-muted-foreground">
              {result.fallback_used ? "Rules-based fallback" : "AI-assisted guidance"} · prompt{" "}
              {result.prompt_version}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
