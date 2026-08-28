import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PublicShell } from "@/components/cpgrams";
import { PUBLIC_SITEMAP } from "@/lib/cpgrams/public-content";

export const Route = createFileRoute("/sitemap")({
  head: () => ({ meta: [{ title: "Sitemap — CPGRAMS Resolution Workspace" }] }),
  component: SitemapPage,
});

function SitemapPage() {
  return (
    <PublicShell>
      <div className="page-container max-w-4xl py-10 md:py-14">
        <PageHeader
          eyebrow="Navigate"
          title="Public sitemap"
          description="A directory of public information and limited tracking routes. Private citizen, officer, and administration workspaces are intentionally not listed."
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {PUBLIC_SITEMAP.map((entry) => (
            <li key={entry.path}>
              <Link
                to={entry.path}
                className="focus-ring block rounded-lg border border-border bg-surface-raised p-4 hover:shadow-raised"
              >
                <p className="text-sm font-semibold text-primary">{entry.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{entry.path}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
