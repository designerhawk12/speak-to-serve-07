import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy and website policies — CPGRAMS Resolution Workspace" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Prototype information"
          title="Privacy and website policies"
          description="Plain-language limits for this demonstration website; this is not an official government privacy notice."
        />
        <Card className="border-warning bg-warning-surface">
          <CardContent className="p-5 text-sm leading-relaxed text-warning-foreground">
            <strong>Demonstration interface — not an official Government of India website.</strong>{" "}
            Do not assume this page replaces an official privacy policy or data-protection notice.
          </CardContent>
        </Card>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">Private case access</h2>
            <p className="mt-2">
              Within the prototype, signed-in citizens are intended to access only their own cases
              and associated records. Public tracking is deliberately limited and does not return
              the complaint narrative, documents, messages, or other private case content.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">
              Website preferences and drafts
            </h2>
            <p className="mt-2">
              The website may retain a local display-language preference and an in-progress
              grievance draft to keep the interface usable. These convenience features are not a
              substitute for an approved retention policy or secure personal-data storage plan.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">Appropriate use</h2>
            <p className="mt-2">
              Do not submit emergency information, passwords, OTPs, payment details, or other
              sensitive information that is not needed for a prototype demonstration. Do not use the
              website to impersonate another person or attempt to access another person’s case.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">No support mailbox</h2>
            <p className="mt-2">
              A support-message backend and official contact dataset are not configured. This site
              does not publish invented phone numbers, email addresses, or a claim that a support
              request was received.
            </p>
          </section>
        </div>
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/accessibility">Accessibility information</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
