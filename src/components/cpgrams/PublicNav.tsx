import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { to: "/", labelKey: "nav.public.home" },
  { to: "/track", labelKey: "nav.public.track" },
  { to: "/appeal-status", labelKey: "nav.public.appealStatus" },
  { to: "/officers/central", labelKey: "nav.public.officerDirectory" },
  { to: "/about", labelKey: "nav.public.howItWorks" },
  { to: "/faq", labelKey: "nav.public.faq" },
  { to: "/contact", labelKey: "nav.public.contact" },
] as const;

const linkClass =
  "focus-ring rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

export function PublicNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label={t("nav.public.aria")}>
        {PUBLIC_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            className={linkClass}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            {t(l.labelKey)}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        <Button asChild variant="outline" size="sm">
          <Link to="/auth/officer-login">{t("nav.public.officerLogin")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/auth/login">{t("nav.public.citizenLogin")}</Link>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={open ? t("nav.public.closeMenu") : t("nav.public.openMenu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-surface-raised p-4 shadow-raised lg:hidden">
          <nav className="flex flex-col gap-1" aria-label={t("nav.public.aria")}>
            {PUBLIC_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {t(l.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            <Button asChild size="sm" onClick={() => setOpen(false)}>
              <Link to="/auth/login">{t("nav.public.citizenLogin")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
              <Link to="/auth/officer-login">{t("nav.public.officerLogin")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
