import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionRequiredCardProps {
  title: string;
  description: string;
  dueLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Escalation-grade urgency uses the critical lane. */
  severity?: "action" | "critical";
  className?: string;
  children?: React.ReactNode;
}

export function ActionRequiredCard({
  title,
  description,
  dueLabel,
  actionLabel,
  onAction,
  severity = "action",
  className,
  children,
}: ActionRequiredCardProps) {
  const isCritical = severity === "critical";
  return (
    <section
      className={cn(
        "rounded-lg border p-5",
        isCritical
          ? "border-critical/35 bg-critical-surface"
          : "border-warning/40 bg-warning-surface",
        className,
      )}
      aria-label="Action required"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className={cn("mt-0.5 size-5 shrink-0", isCritical ? "text-critical" : "text-warning-foreground")}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={cn("text-sm font-bold", isCritical ? "text-critical" : "text-warning-foreground")}>
              {title}
            </h3>
            {dueLabel && <span className="text-xs font-medium text-muted-foreground">{dueLabel}</span>}
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
          {children}
          {actionLabel && (
            <Button size="sm" variant={isCritical ? "destructive" : "default"} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
