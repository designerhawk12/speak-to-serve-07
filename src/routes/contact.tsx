import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleHelp, LockKeyhole, Search } from "lucide-react";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact and helpline — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Prototype support information and safe self-service guidance for using the grievance workspace.",
      },
      { property: "og:title", content: "Contact the grievance helpdesk" },
      {
        property: "og:description",
        content: "Safe self-service guidance for this demonstration interface.",
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
          description="For help with a specific case, use secure citizen access. This prototype does not publish official contact details or transmit support messages."
        />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {[
              {
                icon: LockKeyhole,
                label: "Your private case",
                value:
                  "Sign in to see your grievance, documents, messages, and current action without entering a registration number.",
              },
              {
                icon: Search,
                label: "Public fallback",
                value:
                  "Use Track Grievance when a registration number is the only available reference.",
              },
              {
                icon: CircleHelp,
                label: "Service guidance",
                value:
                  "Read the FAQ for plain-language explanations of status, resolution confirmation, and appeals.",
              },
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
                    <p className="text-sm leading-relaxed text-muted-foreground">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardContent className="p-5 md:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-semibold">
                  Demo contact/support information not configured
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A contact-message backend and official helpline directory have not been
                  configured. To avoid misrepresenting demo information as government contact data,
                  this page does not show placeholder phone numbers, email addresses, or send a
                  contact form.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/auth/login">Citizen Login</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/track">Track grievance</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/faq">Read FAQ</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
