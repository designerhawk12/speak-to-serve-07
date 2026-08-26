import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PublicShell } from "@/components/cpgrams";

export const Route = createFileRoute("/dashboard/public")({
  head: () => ({ meta: [{ title: "Public service reporting — CPGRAMS Resolution Workspace" }] }),
  component: PublicDashboard,
});

function PublicDashboard() {
  return (
    <PublicShell>
      <div className="page-container max-w-4xl py-10 md:py-14">
        <PageHeader
          eyebrow="Public reporting"
          title="Service performance reporting"
          description="Public aggregate reporting is intentionally separate from private citizen case records."
        />
        <Card className="border-info/30 bg-info-surface">
          <CardContent className="space-y-3 p-5 md:p-6">
            <div className="flex items-center gap-2 text-info">
              <LockKeyhole className="size-4" aria-hidden />
              <h2 className="text-sm font-semibold">Not yet published from live records</h2>
            </div>
            <p className="text-sm leading-relaxed text-info">
              This demonstration does not publish aggregate performance figures from the private
              grievance database. It avoids presenting prototype figures as official statistics and
              does not expose individual case data.
            </p>
          </CardContent>
        </Card>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border-border">
            <CardContent className="space-y-2 p-5">
              <BarChart3 className="size-5 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold">What a future public report can show</h2>
              <p className="text-sm text-muted-foreground">
                Citizen-confirmed outcomes, SLA performance, appeals, and systemic
                patterns—published only after an approved aggregate-data contract exists.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold">Need your own case?</h2>
              <p className="text-sm text-muted-foreground">
                Signed-in citizens see their own cases automatically. The public tracking route
                remains available when a registration number is the only information available.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/auth/login">Citizen Login</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/track">Track grievance</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicShell>
  );
}
