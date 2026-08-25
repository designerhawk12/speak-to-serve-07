import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, ROLE_LABELS } from "@/lib/cpgrams/session";
import { AppHeader } from "../AppHeader";
import { WorkspaceNav } from "../WorkspaceNav";
import { RoleGuard } from "./RoleGuard";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        secondary={
          <div className="bg-sidebar text-sidebar-foreground lg:hidden">
            <div className="page-container">
              <WorkspaceNav className="py-2" />
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-xs leading-tight sm:block">
            <span className="block font-semibold">{user?.name}</span>
            <span className="block text-muted-foreground">
              {user ? ROLE_LABELS[user.role] : ""}
              {user?.officeLabel ? ` · ${user.officeLabel}` : ""}
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </AppHeader>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-3 lg:block">
          <WorkspaceNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <RoleGuard allow={["officer", "nodal", "appellate"]} loginTo="/auth/officer-login">
            {children}
          </RoleGuard>
        </main>
      </div>
    </div>
  );
}
