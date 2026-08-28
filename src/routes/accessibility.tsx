import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/accessibility")({
  head: () => ({ meta: [{ title: "Accessibility — CPGRAMS Resolution Workspace" }] }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Prototype information"
          title="Accessibility information"
          description="Practical help for using this responsive demonstration interface."
        />
        <Card className="border-warning bg-warning-surface">
          <CardContent className="p-5 text-sm leading-relaxed text-warning-foreground">
            <strong>Demonstration interface — not an official Government of India website.</strong>{" "}
            This page describes design intentions, not a formal conformance claim.
          </CardContent>
        </Card>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">Using the site</h2>
            <p className="mt-2">
              Use the keyboard Tab and Shift+Tab keys to move through controls, Enter or Space to
              activate a focused button, and the visible focus outline to identify the current
              control. Navigation collapses into a menu on smaller screens.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">Readable content</h2>
            <p className="mt-2">
              The interface uses responsive spacing and semantic headings so public pages and the
              grievance builder remain usable on narrow screens. Avoid relying only on colour:
              status text and labels provide the primary explanation.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">Language and original text</h2>
            <p className="mt-2">
              The shared header offers English, Hindi, and Tamil display preferences. Authoritative
              grievance and government text is preserved in its original language; where a
              translation is unavailable, the original text remains visible.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-foreground">Limitations</h2>
            <p className="mt-2">
              No formal accessibility audit or dedicated assistance channel is configured for this
              prototype. If the interface is difficult to use, do not rely on this demonstration as
              an official service channel.
            </p>
          </section>
        </div>
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/sitemap">View sitemap</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
