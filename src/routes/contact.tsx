import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Clock } from "lucide-react";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact and helpline — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Helpline numbers, email and a message form for help with using the grievance service.",
      },
      { property: "og:title", content: "Contact the grievance helpdesk" },
      {
        property: "og:description",
        content: "Helpline, email and a message form for support with the grievance service.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicShell>
      <div className="page-container py-10 md:py-14">
        <PageHeader
          eyebrow="Contact"
          title="Get help using this service"
          description="For help with a specific case, keep your registration number ready. To lodge a new grievance, use the describe-a-problem flow instead."
        />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {[
              { icon: Phone, label: "Helpline", value: "1800 000 0000 (toll free)" },
              { icon: Mail, label: "Email", value: "help@cpgrams.example.gov.in" },
              { icon: Clock, label: "Hours", value: "Monday to Saturday, 9:00 – 18:00 IST" },
            ].map((c) => (
              <Card key={c.label} className="border-border">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <c.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {c.label}
                    </p>
                    <p className="text-sm font-medium">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardContent className="p-5 md:p-6">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-name">Your name</Label>
                    <Input id="c-name" autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email">Email</Label>
                    <Input id="c-email" type="email" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-ref">Registration number (optional)</Label>
                  <Input id="c-ref" placeholder="e.g. DOPOST/E/2026/0000988" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-msg">How can we help?</Label>
                  <Textarea id="c-msg" rows={6} placeholder="Describe what you need help with." />
                </div>
                <p className="text-xs text-muted-foreground">
                  Message delivery is not connected yet. This form will submit through the case database
                  once the backend is wired up.
                </p>
                <Button type="submit">Send message</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
