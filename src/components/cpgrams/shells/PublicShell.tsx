import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { AppHeader } from "../AppHeader";
import { PublicNav } from "../PublicNav";

const FOOTER_GROUPS = [
  {
    titleKey: "footer.forCitizens",
    links: [
      { to: "/citizen/grievances/new" as const, labelKey: "footer.describeProblem" },
      { to: "/track" as const, labelKey: "footer.trackGrievance" },
      { to: "/appeal-status" as const, labelKey: "footer.checkAppeal" },
      { to: "/faq" as const, labelKey: "footer.faq" },
    ],
  },
  {
    titleKey: "footer.directories",
    links: [
      { to: "/officers/central" as const, labelKey: "footer.centralMinistries" },
      { to: "/officers/states" as const, labelKey: "footer.states" },
      { to: "/officers/appeals" as const, labelKey: "footer.appellateAuthorities" },
    ],
  },
  {
    titleKey: "footer.about",
    links: [
      { to: "/about" as const, labelKey: "footer.howThisWorks" },
      { to: "/reviewer-guide" as const, labelKey: "footer.reviewerGuide" },
      { to: "/contact" as const, labelKey: "footer.contact" },
      { to: "/auth/officer-login" as const, labelKey: "footer.officerLogin" },
    ],
  },
  {
    titleKey: "footer.prototypePolicies",
    links: [
      { to: "/disclaimer" as const, labelKey: "footer.disclaimer" },
      { to: "/privacy" as const, labelKey: "footer.privacy" },
      { to: "/accessibility" as const, labelKey: "footer.accessibility" },
      { to: "/sitemap" as const, labelKey: "footer.sitemap" },
    ],
  },
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader>
        <PublicNav />
      </AppHeader>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface-sunken">
        <div className="page-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-bold">CPGRAMS {t("brand.workspace")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>
          {FOOTER_GROUPS.map((g) => (
            <nav key={g.titleKey} aria-label={t(g.titleKey)} className="space-y-2">
              <p className="text-xs font-bold tracking-wide uppercase">{t(g.titleKey)}</p>
              <ul className="space-y-1.5">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="focus-ring rounded-md text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {t(l.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border bg-warning-surface">
          <p className="page-container py-4 text-xs text-warning-foreground">
            <strong>{t("footer.demoWarning")}</strong> {t("footer.demoInstruction")}
          </p>
        </div>
      </footer>
    </div>
  );
}
