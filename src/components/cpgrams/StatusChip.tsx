import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/cpgrams/types";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-neutral-surface text-foreground",
        info: "border-info/25 bg-info-surface text-info",
        warning: "border-warning/35 bg-warning-surface text-warning-foreground",
        success: "border-success/25 bg-success-surface text-success",
        critical: "border-critical/25 bg-critical-surface text-critical",
      } satisfies Record<StatusTone, string>,
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  label: string;
  /** Optional prefix such as "Government" or "Citizen" to keep the two lanes distinct. */
  lane?: string;
  dot?: boolean;
}

export function StatusChip({ label, lane, tone, size, dot = true, className, ...rest }: StatusChipProps) {
  return (
    <span className={cn(chipVariants({ tone, size }), className)} {...rest}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {lane && <span className="font-normal opacity-70">{lane}:</span>}
      {label}
    </span>
  );
}
