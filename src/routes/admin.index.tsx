import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, RoleGuard } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Platform administration — CPGRAMS Resolution Workspace" }] }),
  component: PlatformAdminHome,
});

function PlatformAdminHome() {
  return (
    <RoleGuard>
      <main className="page-container space-y-6 py-8 md:py-12">
        <PageHeader
          eyebrow="Platform administration"
          title="Administrative workspace"
          description="Technical administration is separate from grievance resolution and appeal decisions."
        />
        <Card className="border-border">
          <CardContent className="space-y-2 p-6">
            <h2 className="text-sm font-semibold">Administration modules are not implemented yet</h2>
            <p className="text-sm text-muted-foreground">User, organization, taxonomy, system, audit, and AI configuration routes will be added only when their specific requirements are approved.</p>
          </CardContent>
        </Card>
      </main>
    </RoleGuard>
  );
}
