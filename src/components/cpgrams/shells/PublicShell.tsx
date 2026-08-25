import { Link } from "@tanstack/react-router";
import { AppHeader } from "../AppHeader";
import { PublicNav } from "../PublicNav";

const FOOTER_GROUPS = [
  {
    title: "For citizens",
    links: [
      { to: "/citizen/grievances/new" as const, label: "Describe a problem" },
      { to: "/track" as const, label: "Track a grievance" },
      { to: "/appeal-status" as const, label: "Check appeal status" },
      { to: "/faq" as const, label: "Frequently asked questions" },
    ],
  },
  {
    title: "Directories",
    links: [
      { to: "/officers/central" as const, label: "Central ministries" },
      { to: "/officers/states" as const, label: "States & UTs" },
      { to: "/officers/appeals" as const, label: "Appellate authorities" },
    ],
  },
  {
    title: "About",
    links: [
      { to: "/about" as const, label: "How this works" },
      { to: "/contact" as const, label: "Contact & helpline" },
      { to: "/auth/officer-login" as const, label: "Government Officer Login" },
    ],
  },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader>
        <PublicNav />
      </AppHeader>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface-sunken">
        <div className="page-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-bold">CPGRAMS Resolution Workspace</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A redesign of India&apos;s public grievance process, built so cases explain themselves and
              citizens confirm when a problem is actually solved.
            </p>
          </div>
          {FOOTER_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title} className="space-y-2">
              <p className="text-xs font-bold tracking-wide uppercase">{g.title}</p>
              <ul className="space-y-1.5">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="focus-ring rounded-md text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border">
          <p className="page-container py-4 text-xs text-muted-foreground">
            Demonstration interface. Not an official Government of India website.
          </p>
        </div>
      </footer>
    </div>
  );
}
