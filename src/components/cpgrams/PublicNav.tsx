import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { to: "/", label: "Home" },
  { to: "/track", label: "Track grievance" },
  { to: "/appeal-status", label: "Appeal status" },
  { to: "/officers/central", label: "Officer directory" },
  { to: "/about", label: "How it works" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

const linkClass =
  "focus-ring rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

export function PublicNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Public navigation">
        {PUBLIC_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            className={linkClass}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        <Button asChild variant="outline" size="sm">
          <Link to="/auth/officer-login">Government Officer Login</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/auth/login">Citizen Login</Link>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-surface-raised p-4 shadow-raised lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public navigation">
            {PUBLIC_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            <Button asChild size="sm" onClick={() => setOpen(false)}>
              <Link to="/auth/login">Citizen Login</Link>
            </Button>
            <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
              <Link to="/auth/officer-login">Government Officer Login</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
