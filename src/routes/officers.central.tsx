import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { OfficerDirectory } from "@/components/cpgrams/OfficerDirectory";

export const Route = createFileRoute("/officers/central")({
  head: () => ({
    meta: [
      { title: "Central nodal grievance officers — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Directory of nodal grievance officers across central ministries and departments, with contact details.",
      },
      { property: "og:title", content: "Central nodal grievance officers" },
      {
        property: "og:description",
        content: "Find the nodal grievance officer for a central ministry or department.",
      },
    ],
  }),
  component: CentralOfficersPage,
});

function CentralOfficersPage() {
  return (
    <PublicShell>
      <div className="page-container py-10 md:py-14">
        <PageHeader
          eyebrow="Directory"
          title="Central ministries & departments"
          description="Nodal grievance officers responsible for grievance handling in central government organisations."
        />
        <OfficerDirectory />
      </div>
    </PublicShell>
  );
}
