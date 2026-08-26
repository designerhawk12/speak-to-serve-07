import { Navigate, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/cpgrams/session";
import { canAccessRoute, roleHomePath, routeAccessRule } from "@/lib/cpgrams/auth-routing";
import { LoadingState } from "@/components/cpgrams/LoadingState";

export interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Prevents protected route content from rendering until the profile-backed
 * role is allowed by the centralized route authorization map.
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const { session, user, isLoading, profileState } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rule = routeAccessRule(pathname);

  if (isLoading || (session && profileState === "loading")) {
    return <LoadingState variant="inline" label="Checking your access" />;
  }

  if (!rule) return <>{children}</>;
  if (user && canAccessRoute(user.role, pathname)) return <>{children}</>;

  if (!session) return <Navigate to={rule.loginTo} replace />;
  if (user) return <Navigate to={roleHomePath(user.role)} replace />;

  return <LoadingState variant="inline" label="Loading your authorized workspace" />;
}
