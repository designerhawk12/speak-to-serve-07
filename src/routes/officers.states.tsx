import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { OfficerDirectory } from "@/components/cpgrams/OfficerDirectory";

export const Route = createFileRoute("/officers/states")({
  head: () => ({
    meta: [
      { title: "State & UT grievance officers — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Directory of grievance nodal officers for states and Union Territories, with contact details.",
      },
      { property: "og:title", content: "State & UT grievance officers" },
      {
        property: "og:description",
        content: "Find the grievance nodal officer for a state or Union Territory.",
      },
    ],
  }),
  component: StateOfficersPage,
});

function StateOfficersPage() {
  return (
    <PublicShell>
      <div className="page-container py-10 md:py-14">
        <PageHeader
          eyebrow="Directory"
          title="States & Union Territories"
          description="State-level nodal officers who receive grievances routed to state administrations."
        />
        <OfficerDirectory caption="Prototype/demo state directory records only. They are not official government directory data." />
      </div>
    </PublicShell>
  );
}
