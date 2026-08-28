import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, ROLE_LABELS } from "@/lib/cpgrams/session";
import { LanguageSelector } from "./LanguageSelector";

export interface AppHeaderProps {
  /** Right-hand slot: nav, auth buttons, account menu. */
  children?: React.ReactNode;
  /** Secondary row rendered under the identity bar (section navigation). */
  secondary?: React.ReactNode;
  className?: string;
}

/**
 * Single application header used by every role section.
 * The thin band carries institutional identity; the main row carries navigation.
 */
export function AppHeader({ children, secondary, className }: AppHeaderProps) {
  const { user } = useSession();

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border bg-surface-raised", className)}>
      <div className="gov-band">
        <div className="page-container flex h-8 items-center justify-between text-[11px] font-medium">
          <span>Government of India · Public Grievance Redress</span>
          <span className="hidden sm:inline">
            {user ? `Signed in as ${ROLE_LABELS[user.role]}` : "Not signed in"}
          </span>
        </div>
      </div>

      <div className="page-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="focus-ring flex items-center gap-3 rounded-md">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Landmark className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight">CPGRAMS</span>
            <span className="block text-[11px] text-muted-foreground">Resolution Workspace</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {children}
        </div>
      </div>

      {secondary && <div className="border-t border-border bg-surface-sunken">{secondary}</div>}
    </header>
  );
}
