import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader, EmptyState, StatusChip } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";

const NOTIFICATIONS = [
  {
    id: "n-1",
    at: "08 Sep 2026, 09:22",
    title: "You reported that the problem still persists",
    body: "Your case DOPST/E/2026/0001041 stays open on your side even though the office recorded an action.",
    tone: "warning" as const,
    toneLabel: "Action available",
  },
  {
    id: "n-2",
    at: "02 Sep 2026, 11:40",
    title: "An office recorded an action on your case",
    body: "The Pension Cell attached an action note stating arrears were released to your bank.",
    tone: "info" as const,
    toneLabel: "Update",
  },
];

export const Route = createFileRoute("/citizen/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Every update on your grievances, written in plain language rather than status codes.",
      },
      { property: "og:title", content: "Notifications" },
      { property: "og:description", content: "Plain-language updates on your cases." },
    ],
  }),
  component: CitizenNotifications,
});

function CitizenNotifications() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="What changed on your cases, and whether anything is waiting on you."
      />

      {NOTIFICATIONS.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Updates on your cases will appear here." />
      ) : (
        <ul className="space-y-3">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id}>
              <Card className="border-border">
                <CardContent className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusChip label={n.toneLabel} tone={n.tone} />
                    <span className="text-xs text-muted-foreground">{n.at}</span>
                  </div>
                  <h2 className="text-sm font-semibold">{n.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
