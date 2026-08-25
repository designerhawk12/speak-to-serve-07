import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Technical detail, shown collapsed so citizens are not confused by it. */
  detail?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "This didn't load",
  description = "Something went wrong while fetching this information. You can try again.",
  detail,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("rounded-lg border border-critical/35 bg-critical-surface p-6", className)}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertOctagon className="mt-0.5 size-5 shrink-0 text-critical" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-bold text-critical">{title}</h3>
          <p className="text-sm text-foreground/80">{description}</p>
          {detail && (
            <details className="text-xs text-muted-foreground">
              <summary className="focus-ring cursor-pointer rounded-md">Technical details</summary>
              <pre className="mt-2 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap">{detail}</pre>
            </details>
          )}
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
