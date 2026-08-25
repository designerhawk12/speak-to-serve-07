import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_DISCLAIMER, type AiSuggestion } from "@/lib/cpgrams/ai";

export interface AiSuggestionCardProps {
  suggestion: AiSuggestion;
  onAccept?: (s: AiSuggestion) => void;
  onDismiss?: (s: AiSuggestion) => void;
  acceptLabel?: string;
  className?: string;
}

/**
 * Advisory only. AI can never record a government action or decide an appeal
 * (BUILD_CONTRACT #5, #6). Acceptance always routes through a human action.
 */
export function AiSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  acceptLabel = "Use this suggestion",
  className,
}: AiSuggestionCardProps) {
  return (
    <section
      className={cn("rounded-lg border border-dashed border-primary/40 bg-surface-raised p-4", className)}
      aria-label="AI suggestion"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-primary uppercase">AI suggestion</p>
              <h3 className="text-sm font-semibold">{suggestion.title}</h3>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(suggestion)}
                className="focus-ring rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Dismiss suggestion"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{suggestion.body}</p>
          {suggestion.basis && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Basis:</span> {suggestion.basis}
              {typeof suggestion.confidence === "number" &&
                ` · confidence ${Math.round(suggestion.confidence * 100)}%`}
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">{AI_DISCLAIMER}</p>
          {onAccept && (
            <Button size="sm" variant="outline" onClick={() => onAccept(suggestion)}>
              {acceptLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
