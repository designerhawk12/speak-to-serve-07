import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PublicShell } from "@/components/cpgrams";

export const Route = createFileRoute("/dashboard/appeals")({
  head: () => ({ meta: [{ title: "Public appeal reporting — CPGRAMS Resolution Workspace" }] }),
  component: AppealDashboard,
});

function AppealDashboard() {
  return (
    <PublicShell>
      <div className="page-container max-w-4xl py-10 md:py-14">
        <PageHeader
          eyebrow="Public reporting"
          title="Appeal reporting"
          description="Appeal files remain private to the citizen and authorized Appellate Authority."
        />
        <Card className="border-info/30 bg-info-surface">
          <CardContent className="space-y-3 p-5 md:p-6">
            <div className="flex items-center gap-2 text-info">
              <LockKeyhole className="size-4" aria-hidden />
              <h2 className="text-sm font-semibold">
                No live appeal metrics are published in this demo
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-info">
              This page deliberately does not expose private appeal records or claim prototype
              figures are official. A future aggregate dashboard requires an approved publication
              contract.
            </p>
          </CardContent>
        </Card>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border-border">
            <CardContent className="space-y-2 p-5">
              <Gavel className="size-5 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">What appeal reporting should preserve</h2>
              <p className="text-sm text-muted-foreground">
                The distinction between an appeal filed, a manual decision recorded, and a citizen’s
                separate outcome confirmation.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold">Check an individual appeal</h2>
              <p className="text-sm text-muted-foreground">
                Use a reference number as a public fallback, or sign in to see your own private case
                and appeal history.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/appeal-status">Appeal status</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/auth/login">Citizen Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicShell>
  );
}
