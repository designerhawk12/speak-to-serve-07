import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/cpgrams/session";
import { AppHeader } from "../AppHeader";
import { CitizenNav } from "../CitizenNav";
import { RoleGuard } from "./RoleGuard";

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <AppHeader>
        <CitizenNav />
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </AppHeader>

      <main className="page-container flex-1 py-6 md:py-10">
        <RoleGuard>{children}</RoleGuard>
      </main>

      <CitizenNav variant="bottom" />

      <footer className="hidden border-t border-border bg-surface-sunken md:block">
        <p className="page-container py-4 text-xs text-muted-foreground">
          Need help?{" "}
          <Link to="/contact" className="underline">
            Contact support
          </Link>{" "}
          ·{" "}
          <Link to="/faq" className="underline">
            Read the FAQ
          </Link>
        </p>
      </footer>
    </div>
  );
}
