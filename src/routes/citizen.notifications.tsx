import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader, EmptyState, ErrorState, LoadingState, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, toGrievanceSummary } from "@/lib/cpgrams/data-adapters";
import { queryErrorDetail, useCitizenGrievancesQuery, useNotificationsQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/citizen/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CPGRAMS Resolution Workspace" }, { name: "description", content: "Plain-language case updates grouped by grievance." }] }),
  component: CitizenNotifications,
});

function CitizenNotifications() {
  const { user } = useSession();
  const notificationsQuery = useNotificationsQuery(user?.id);
  const casesQuery = useCitizenGrievancesQuery(user?.id);
  const notifications = notificationsQuery.data ?? [];
  const casesById = new Map((casesQuery.data?.grievances ?? []).map((grievance) => [grievance.id, grievance]));
  const groups = notifications.reduce<Map<string, typeof notifications>>((all, notification) => {
    const key = notification.grievance_id ?? `other:${notification.id}`;
    all.set(key, [...(all.get(key) ?? []), notification]);
    return all;
  }, new Map());
  return <div className="space-y-6"><PageHeader eyebrow="Updates" title="Notifications" description="Current actions and updates are grouped by grievance. Case timelines remain chronological inside each case." />
    {notificationsQuery.isPending || casesQuery.isPending ? <LoadingState label="Loading notifications" />
      : notificationsQuery.isError ? <ErrorState detail={queryErrorDetail(notificationsQuery.error)} onRetry={() => void notificationsQuery.refetch()} />
        : casesQuery.isError ? <ErrorState detail={queryErrorDetail(casesQuery.error)} onRetry={() => void casesQuery.refetch()} />
          : !notifications.length ? <EmptyState icon={Bell} title="No notifications yet" description="Updates on your cases will appear here." />
            : <div className="space-y-5">{[...groups.entries()].map(([grievanceId, items]) => {
              const grievance = grievanceId.startsWith("other:") ? undefined : casesById.get(grievanceId);
              const summary = grievance ? toGrievanceSummary(grievance, undefined) : null;
              return <section key={grievanceId} className="space-y-3 rounded-lg border border-border bg-surface-raised p-5" aria-label={summary ? `Updates for ${summary.registrationNumber}` : "Other updates"}>
                <div><h2 className="text-base font-semibold">{summary?.shortTitle ?? "Other account updates"}</h2>{summary && <Link to="/citizen/grievances/$id" params={{ id: summary.id }} className="text-sm font-medium text-primary hover:underline">{summary.registrationNumber}</Link>}</div>
                <ul className="space-y-3">{items.map((notification) => <li key={notification.id}><Card className="border-border"><CardContent className="space-y-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><StatusChip label={notification.action_required ? "Action required" : "Update"} tone={notification.action_required ? "warning" : "info"} /><span className="text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</span></div><h3 className="text-sm font-semibold">{notification.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{notification.body}</p></CardContent></Card></li>)}</ul>
              </section>;
            })}</div>}
  </div>;
}
