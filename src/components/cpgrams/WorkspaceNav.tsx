import { Link } from "@tanstack/react-router";
import { BarChart3, Gavel, Layers, LayoutDashboard, Scale } from "lucide-react";
import { canAccessRoute } from "@/lib/cpgrams/auth-routing";
import { useSession } from "@/lib/cpgrams/session";
import { cn } from "@/lib/utils";

const WORKSPACE_LINKS = [
  { to: "/office", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/office/cases", label: "Cases", icon: Scale, exact: false },
  { to: "/office/appeals", label: "Appeals", icon: Gavel, exact: false },
  { to: "/office/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/office/systemic-issues", label: "Systemic issues", icon: Layers, exact: false },
] as const;

/**
 * Government workspace navigation. Denser than the citizen surface:
 * a horizontal scrollable bar on mobile, a fixed rail on desktop.
 */
export function WorkspaceNav({ className }: { className?: string }) {
  const { user } = useSession();
  const visibleLinks = user ? WORKSPACE_LINKS.filter((link) => canAccessRoute(user.role, link.to)) : [];

  return (
    <nav
      className={cn("flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible", className)}
      aria-label="Government workspace navigation"
    >
      {visibleLinks.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          className="focus-ring flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
