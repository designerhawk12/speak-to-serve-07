import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, PublicShell } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track a grievance — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Enter a registration number to see the current stage of a grievance and what the office has recorded.",
      },
      { property: "og:title", content: "Track a grievance" },
      {
        property: "og:description",
        content: "Look up a case by registration number and see what is actually happening.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-3xl py-10 md:py-14">
        <PageHeader
          eyebrow="Track"
          title="Track a grievance"
          description="Signed-in citizens see all of their grievances automatically — no registration number needed."
          actions={
            <Button asChild variant="outline">
              <Link to="/auth/login">Citizen Login</Link>
            </Button>
          }
        />

        <Card className="border-border">
          <CardContent className="p-5 md:p-6">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="reg">Registration number</Label>
                <Input id="reg" placeholder="DOPOST/E/2026/0000988" className="font-mono" />
              </div>
              <Button type="submit">
                <Search className="size-4" aria-hidden />
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          <EmptyState
            title="No case looked up yet"
            description="Enter a registration number above. Lookup will read from the case database once it is connected."
            icon={Search}
          />
        </div>
      </div>
    </PublicShell>
  );
}
