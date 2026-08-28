import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({ meta: [{ title: "Disclaimer — CPGRAMS Resolution Workspace" }] }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Prototype information"
          title="Disclaimer"
          description="Read this before relying on the demonstration interface."
        />
        <Card className="border-warning bg-warning-surface">
          <CardContent className="p-5 text-sm leading-relaxed text-warning-foreground">
            <strong>Demonstration interface — not an official Government of India website.</strong>{" "}
            This application is a prototype and must not be treated as an official grievance
            channel, official directory, policy publication, legal advice, or a promise of
            government action.
          </CardContent>
        </Card>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Prototype records, guidance, targets, directories, and reports may be incomplete,
            illustrative, or development-only. A display in this interface does not establish a
            legal entitlement, administrative decision, filing acknowledgement, or service-level
            commitment.
          </p>
          <p>
            Where the interface offers automated guidance, it is advisory only. It does not make a
            government decision, reject a grievance authoritatively, transfer a case, close a case,
            or decide an appeal.
          </p>
          <p>
            For official services and authoritative information, use the appropriate verified
            government channel. Do not submit emergency, sensitive, or irreplaceable information
            through an unverified demonstration deployment.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/faq">Read the FAQ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/privacy">Privacy & website policies</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
