import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState, PageHeader, PrivateDocumentCard } from "@/components/cpgrams";
import { createCitizenAppeal } from "@/lib/cpgrams/data-access";
import { cpgramsQueryKeys, queryErrorDetail, useGrievanceWorkspaceQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";
import { getCitizenAppealPreload } from "@/lib/cpgrams/appeal-preload";

export const Route = createFileRoute("/citizen/grievances/$id/appeal")({ component: AppealPage });

function AppealPage() {
  const { id } = Route.useParams(); const { user } = useSession(); const navigate = useNavigate(); const queryClient = useQueryClient(); const caseQuery = useGrievanceWorkspaceQuery(id);
  const [grounds, setGrounds] = useState(""); const [relief, setRelief] = useState("");
  const mutation = useMutation({ mutationFn: () => createCitizenAppeal({ grievanceId: id, grounds, requestedRelief: relief }), onSuccess: async (appealId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(id) }), queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.citizenGrievances(user?.id ?? "unavailable") }), queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedAppeals })]); void navigate({ to: "/citizen/appeals/$id", params: { id: appealId } }); } });
  if (caseQuery.isPending) return <LoadingState variant="page" label="Loading appeal context" />;
  if (caseQuery.isError) return <ErrorState detail={queryErrorDetail(caseQuery.error)} onRetry={() => void caseQuery.refetch()} />;
  if (!caseQuery.data) return <EmptyState title="Case not found" description="This case does not exist or is outside your authorized cases." />;
  const eligible = ["PARTIALLY_RESOLVED", "NOT_RESOLVED"].includes(caseQuery.data.grievance.citizen_confirmation_state) && !caseQuery.data.appeals.length;
  const preload = getCitizenAppealPreload(caseQuery.data);
  return <div className="mx-auto max-w-3xl space-y-6"><PageHeader eyebrow={caseQuery.data.grievance.registration_number} title="Appeal this resolution" description="The Appellate Authority receives the existing case record. Add your own words about what remains unresolved." />
    <ContextCard title="Original grievance" value={preload.originalGrievance} /><ContextCard title="Requested outcome" value={preload.requestedOutcome} /><ContextCard title="Government resolution" value={preload.governmentResolution} /><ContextCard title="Your disagreement" value={preload.citizenDisagreement} />
    <Card className="border-border"><CardContent className="space-y-3 p-5"><h2 className="text-sm font-semibold">Existing evidence</h2>{preload.evidence.length ? <div className="grid gap-2 sm:grid-cols-2">{preload.evidence.map((document) => <PrivateDocumentCard key={document.id} document={document} compact />)}</div> : <p className="text-sm text-muted-foreground">No evidence has been attached to this case.</p>}</CardContent></Card>
    <Card className="border-border"><CardContent className="space-y-4 p-5"><Field label="Why are you appealing?"><Textarea value={grounds} onChange={(e) => setGrounds(e.target.value)} rows={6} placeholder="Explain in your own words what is still unresolved. This is your appeal text." /></Field><Field label="What correction or relief are you requesting? (optional)"><Textarea value={relief} onChange={(e) => setRelief(e.target.value)} rows={3} /></Field><p className="text-xs text-muted-foreground">A future AI summary may help organise this record, but it cannot replace your words or file an appeal for you.</p>{!eligible && <p className="text-sm text-warning">An appeal is available after you record a PARTLY or NO response, and only one appeal may be filed for this case.</p>}<div className="flex gap-2"><Button disabled={!user || !eligible || !grounds.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting" : "Submit appeal"}</Button><Button asChild variant="outline"><Link to="/citizen/grievances/$id" params={{ id }}>Cancel</Link></Button></div>{mutation.isError && <p className="text-sm text-critical" role="alert">{queryErrorDetail(mutation.error)}</p>}</CardContent></Card></div>;
}
function ContextCard({ title, value }: { title: string; value: string }) { return <Card className="border-border"><CardContent className="space-y-2 p-5"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2><p className="whitespace-pre-wrap text-sm">{value}</p></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
