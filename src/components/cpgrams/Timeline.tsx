import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/cpgrams/session";
import type { StatusTone, TimelineEventRecord } from "@/lib/cpgrams/types";
import { DocumentCard } from "./DocumentCard";

const dotTone: Record<StatusTone, string> = {
  neutral: "bg-border-strong",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  critical: "bg-critical",
};

export function TimelineEvent({
  event,
  isLast = false,
}: {
  event: TimelineEventRecord;
  isLast?: boolean;
}) {
  const actorType = event.actorLabel;
  const actorDetail =
    event.actorRole === "officer" || event.actorRole === "nodal" || event.actorRole === "appellate"
      ? ROLE_LABELS[event.actorRole]
      : null;
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && <span className="absolute top-4 left-[7px] h-full w-px bg-border" aria-hidden />}
      <span
        className={cn(
          "relative mt-1.5 size-3.5 shrink-0 rounded-full ring-4 ring-background",
          dotTone[event.tone ?? "neutral"],
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold">{event.title}</p>
          <time className="text-xs text-muted-foreground">{event.occurredAt}</time>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-surface-sunken px-2 py-0.5 font-semibold text-foreground">
            {actorType.toLocaleUpperCase()}
          </span>
          {actorDetail && <span>{actorDetail}</span>}
        </div>
        {event.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        )}
        {event.attachments?.length ? (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            {event.attachments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} compact />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export interface TimelineProps {
  events: TimelineEventRecord[];
  className?: string;
}

/** Append-only case history (BUILD_CONTRACT #4). Events are never edited in place. */
export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn("list-none", className)}>
      {events.map((event, i) => (
        <TimelineEvent key={event.id} event={event} isLast={i === events.length - 1} />
      ))}
    </ol>
  );
}
