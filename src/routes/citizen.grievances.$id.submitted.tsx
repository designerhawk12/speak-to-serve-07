import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/cpgrams";
import { queryErrorDetail, useGrievanceWorkspaceQuery } from "@/lib/cpgrams/queries";

export const Route = createFileRoute("/citizen/grievances/$id/submitted")({
  head: () => ({ meta: [{ title: "Grievance submitted — CPGRAMS Resolution Workspace" }] }),
  component: GrievanceSubmitted,
});

function GrievanceSubmitted() {
  const { id } = Route.useParams();
  const grievanceQuery = useGrievanceWorkspaceQuery(id);
  if (grievanceQuery.isPending) return <LoadingState variant="page" label="Loading submitted grievance" />;
  if (grievanceQuery.isError) return <ErrorState detail={queryErrorDetail(grievanceQuery.error)} onRetry={() => void grievanceQuery.refetch()} />;
  if (!grievanceQuery.data) return <EmptyState title="Submission not found" description="This case is not available in your citizen workspace." />;
  const grievance = grievanceQuery.data.grievance;
  return <div className="mx-auto max-w-2xl space-y-8"><PageHeader eyebrow="Submission received" title="Your grievance has been submitted" description="Your case is now in your workspace. You can follow each recorded update without entering a tracking number." /><Card className="border-success/35 bg-success-surface"><CardContent className="space-y-4 p-6"><CheckCircle2 className="size-8 text-success" aria-hidden /><div><p className="text-sm font-semibold">Registration number</p><p className="mt-1 font-mono text-lg">{grievance.registration_number}</p></div><p className="text-sm text-muted-foreground">The original grievance text has been preserved and a submission event was recorded on the case timeline.</p><div className="flex flex-wrap gap-2"><Button asChild><Link to="/citizen/grievances/$id" params={{ id }}>View case</Link></Button><Button asChild variant="outline"><Link to="/citizen">Go to my grievances</Link></Button></div></CardContent></Card></div>;
}
