import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { OfficerDirectory } from "@/components/cpgrams/OfficerDirectory";

export const Route = createFileRoute("/officers/appeals")({
  head: () => ({
    meta: [
      { title: "Appellate Authorities directory — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content:
          "Directory of Appellate Authorities who review how grievances were handled, with contact details.",
      },
      { property: "og:title", content: "Appellate Authorities directory" },
      {
        property: "og:description",
        content: "Find the Appellate Authority responsible for reviewing a grievance decision.",
      },
    ],
  }),
  component: AppealOfficersPage,
});

function AppealOfficersPage() {
  return (
    <PublicShell>
      <div className="page-container py-10 md:py-14">
        <PageHeader
          eyebrow="Directory"
          title="Appellate Authorities"
          description="Senior officers who review how a grievance was handled when a citizen is not satisfied with the outcome."
        />
        <OfficerDirectory caption="Prototype/demo appellate directory records only. They are not official government directory data." />
      </div>
    </PublicShell>
  );
}
