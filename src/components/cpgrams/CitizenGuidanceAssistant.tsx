import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Send, ShieldCheck } from "lucide-react";
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

interface ChatEntry {
  id: string;
  role: "citizen" | "assistant";
  text: string;
  result?: GuidanceResult;
}

export function CitizenGuidanceAssistant() {
  const { language } = useLanguage();
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            Ask about this prototype, filing, statuses, required actions, roles, tracking, or
            appeals.
          </SheetDescription>
        </SheetHeader>

        <div className="rounded-md border border-info/35 bg-info-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline size-3.5 text-info" aria-hidden />
          This assistant gives guidance only. It cannot perform or claim a government action.
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2" aria-live="polite">
          {entries.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Try “How do I file a grievance?”, “What does Action Required mean?”, or “How do I
              appeal?” Private case details are available only in the relevant authorized page.
            </div>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg p-3 text-sm ${entry.role === "citizen" ? "ml-8 bg-primary text-primary-foreground" : "mr-6 border border-border bg-surface-sunken"}`}
            >
              <p className="whitespace-pre-wrap">{entry.text}</p>
              {entry.result?.suggested_route && entry.result.suggested_action_label && (
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to={entry.result.suggested_route}>
                    {entry.result.suggested_action_label}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              )}
              {entry.result && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {entry.result.fallback_used ? "Rules-based fallback" : "AI-assisted guidance"}
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
