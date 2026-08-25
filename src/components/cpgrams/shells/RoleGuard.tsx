import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, ROLE_LABELS } from "@/lib/cpgrams/session";
import type { UserRole } from "@/lib/cpgrams/types";

export interface RoleGuardProps {
  allow: UserRole[];
  loginTo?: "/auth/login" | "/auth/officer-login";
  children: React.ReactNode;
}

/**
 * Scaffolding only — NOT production permissions.
 * Real enforcement will come from Supabase auth + RLS + server functions.
 */
export function RoleGuard({ allow, loginTo = "/auth/login", children }: RoleGuardProps) {
  const { user } = useSession();

  if (user && allow.includes(user.role)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md space-y-4 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warning-surface text-warning-foreground">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          This section is available to {allow.map((r) => ROLE_LABELS[r]).join(", ")}. Access rules are
          scaffolded here and will be enforced by the backend once authentication is connected.
        </p>
        <Button asChild>
          <Link to={loginTo}>Go to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
