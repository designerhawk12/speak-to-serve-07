import { Navigate, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/cpgrams/session";
import { canAccessRoute, roleHomePath, routeAccessRule } from "@/lib/cpgrams/auth-routing";
import { authAccessPhase } from "@/lib/cpgrams/auth-workflows";
import { LoadingState } from "@/components/cpgrams/LoadingState";
import { ErrorState } from "@/components/cpgrams/ErrorState";
import { Button } from "@/components/ui/button";

export interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Prevents protected route content from rendering until the profile-backed
 * role is allowed by the centralized route authorization map.
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const { session, user, isLoading, profileState, refreshProfile, signOut } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rule = routeAccessRule(pathname);

  const phase = authAccessPhase({
    isInitializing: isLoading,
    hasSession: Boolean(session),
    hasProfile: Boolean(user),
    profileState,
  });

  if (phase === "AUTH_INITIALIZING") {
    return <LoadingState variant="inline" label="Checking your access" />;
  }

  if (!rule) return <>{children}</>;
  if (phase === "PROFILE_LOADING") {
    return <LoadingState variant="inline" label="Loading your authorized workspace" />;
  }
  if (phase === "AUTHORIZED" && user && canAccessRoute(user.role, pathname)) return <>{children}</>;

  if (phase === "UNAUTHENTICATED") return <Navigate to={rule.loginTo} replace />;
  if (user) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <div className="space-y-3">
      <ErrorState
        title="Your account workspace is unavailable"
        description="Your sign-in succeeded, but we could not load the profile that authorizes this workspace."
        onRetry={() => void refreshProfile(session?.user)}
      />
      <Button type="button" variant="outline" onClick={() => void signOut()}>
        Sign out and try another account
      </Button>
    </div>
  );
}
