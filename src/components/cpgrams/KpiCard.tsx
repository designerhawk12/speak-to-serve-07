import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/cpgrams/types";

const accent: Record<StatusTone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  warning: "text-warning-foreground",
  success: "text-success",
  critical: "text-critical",
};

export interface KpiCardProps {
  label: string;
  value: string | number;
  helpText?: string;
  tone?: StatusTone;
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  className?: string;
}

export function KpiCard({ label, value, helpText, tone = "neutral", delta, className }: KpiCardProps) {
  const Icon = delta?.direction === "up" ? TrendingUp : TrendingDown;
  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="space-y-1.5 p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={cn("text-3xl font-bold tabular-nums", accent[tone])}>{value}</p>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold",
                delta.good === false ? "text-critical" : "text-success",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {delta.value}
            </span>
          )}
        </div>
        {helpText && <p className="text-xs leading-relaxed text-muted-foreground">{helpText}</p>}
      </CardContent>
    </Card>
  );
}
