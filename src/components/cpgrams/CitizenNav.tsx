import { Link } from "@tanstack/react-router";
import { Bell, FilePlus2, LayoutDashboard, UserRound } from "lucide-react";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { cn } from "@/lib/utils";

const CITIZEN_LINKS = [
  { to: "/citizen", labelKey: "nav.citizen.grievances", icon: LayoutDashboard, exact: true },
  {
    to: "/citizen/grievances/new",
    labelKey: "nav.citizen.describe",
    icon: FilePlus2,
    exact: false,
  },
  { to: "/citizen/notifications", labelKey: "nav.citizen.updates", icon: Bell, exact: false },
  { to: "/citizen/profile", labelKey: "nav.citizen.profile", icon: UserRound, exact: false },
] as const;

/**
 * Citizen navigation. Mobile-first: a bottom tab bar on small screens,
 * an inline row inside the header on larger screens.
 */
export function CitizenNav({ variant = "inline" }: { variant?: "inline" | "bottom" }) {
  const { t } = useLanguage();
  if (variant === "bottom") {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label={t("nav.citizen.aria")}
      >
        {CITIZEN_LINKS.map(({ to, labelKey, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="focus-ring flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" aria-hidden />
            {t(labelKey)}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label={t("nav.citizen.aria")}>
      {CITIZEN_LINKS.map(({ to, labelKey, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          className={cn(
            "focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          activeProps={{ className: "bg-accent text-accent-foreground" }}
        >
          <Icon className="size-4" aria-hidden />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
