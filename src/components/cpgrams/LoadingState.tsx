import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  variant?: "cards" | "table" | "page" | "inline";
  rows?: number;
  label?: string;
  className?: string;
}

export function LoadingState({
  variant = "cards",
  rows = 3,
  label = "Loading",
  className,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <p className={cn("text-sm text-muted-foreground", className)} role="status" aria-live="polite">
        {label}…
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite" aria-label={label}>
      {variant === "page" && (
        <div className="space-y-2 pb-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-surface-raised p-5">
          <Skeleton className={variant === "table" ? "h-4 w-full" : "h-4 w-24"} />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
