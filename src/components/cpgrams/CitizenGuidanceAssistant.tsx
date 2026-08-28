import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { requestCitizenGuidance, type GuidanceResult } from "@/lib/cpgrams/ai-gateway";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { useCitizenGrievancesQuery } from "@/lib/cpgrams/queries";
import { useSession } from "@/lib/cpgrams/session";

interface ChatEntry {
  id: string;
  role: "citizen" | "assistant";
  text: string;
  result?: GuidanceResult;
}

export function CitizenGuidanceAssistant() {
  const { user } = useSession();
  const { language } = useLanguage();
  const citizenId = user?.role === "citizen" ? user.id : undefined;
  const casesQuery = useCitizenGrievancesQuery(citizenId);
  const [message, setMessage] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cases = useMemo(() => casesQuery.data?.grievances ?? [], [casesQuery.data]);

  // Never leave private case guidance visible after logout or an account switch.
  useEffect(() => {
    setSelectedCaseId("");
    setEntries([]);
    setMessage("");
    setError(null);
  }, [user?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if (!question || pending) return;
    setPending(true);
    setError(null);
    setEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "citizen", text: question },
    ]);
    setMessage("");
    try {
      const result = await requestCitizenGuidance({
        message: question,
        language,
        grievanceId: citizenId && selectedCaseId ? selectedCaseId : null,
      });
      setEntries((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: result.answer, result },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The guidance assistant is unavailable right now.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed right-4 bottom-20 z-40 rounded-full shadow-raised md:bottom-6"
          aria-label="Open citizen guidance assistant"
        >
          <Bot className="size-4" aria-hidden />
          <span className="hidden sm:inline">Guidance assistant</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col sm:max-w-md"
        aria-describedby="guidance-description"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" aria-hidden /> Citizen guidance
          </SheetTitle>
          <SheetDescription id="guidance-description">
            Ask about filing, eligibility, statuses, appeals, or—when signed in—one of your own
            cases.
          </SheetDescription>
        </SheetHeader>

        <div className="rounded-md border border-info/35 bg-info-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline size-3.5 text-info" aria-hidden />
          This assistant gives guidance only. It cannot perform or claim a government action.
        </div>

        {citizenId && (
          <div className="space-y-2">
            <Label htmlFor="guidance-case">Case context (optional)</Label>
            <select
              id="guidance-case"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              disabled={casesQuery.isPending}
            >
              <option value="">General guidance only</option>
              {cases.map((grievance) => (
                <option key={grievance.id} value={grievance.id}>
                  {grievance.registration_number} — {grievance.short_title}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The server verifies ownership with your session and Supabase RLS before reading a
              case.
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2" aria-live="polite">
          {entries.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Try “How do I file a grievance?”, “What does awaiting confirmation mean?”, or select
              your case and ask for its current status.
            </div>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg p-3 text-sm ${entry.role === "citizen" ? "ml-8 bg-primary text-primary-foreground" : "mr-6 border border-border bg-surface-sunken"}`}
            >
              <p className="whitespace-pre-wrap">{entry.text}</p>
              {entry.result && entry.result.suggested_actions.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {entry.result.suggested_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              )}
              {entry.result && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {entry.result.fallback_used ? "Rules-based fallback" : "AI-assisted guidance"}
                  {entry.result.case_context_used ? " · authorized case context used" : ""}
                </p>
              )}
            </div>
          ))}
          {pending && <p className="text-sm text-muted-foreground">Preparing guidance…</p>}
          {error && (
            <p
              className="rounded-md border border-critical/40 bg-critical-surface p-3 text-sm text-critical"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <form className="space-y-2 border-t border-border pt-4" onSubmit={submit}>
          <Label htmlFor="guidance-question">Your question</Label>
          <Textarea
            id="guidance-question"
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask for guidance…"
          />
          <Button type="submit" className="w-full" disabled={pending || message.trim().length < 2}>
            <Send className="size-4" aria-hidden /> {pending ? "Sending…" : "Ask assistant"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
