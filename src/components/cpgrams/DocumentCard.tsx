import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentRecord } from "@/lib/cpgrams/types";

export interface DocumentCardProps {
  document: DocumentRecord;
  compact?: boolean;
  onOpen?: (doc: DocumentRecord) => void;
  className?: string;
}

export function DocumentCard({ document: doc, compact = false, onOpen, className }: DocumentCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-surface-raised",
        compact ? "px-3 py-2" : "p-4",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-primary">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[doc.kind, doc.sizeLabel, doc.uploadedBy, doc.uploadedAt].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpen?.(doc)}
        className="focus-ring rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Open ${doc.name}`}
      >
        <Download className="size-4" aria-hidden />
      </button>
    </div>
  );
}
