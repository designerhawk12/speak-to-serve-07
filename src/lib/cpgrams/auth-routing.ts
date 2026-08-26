import type { AppRole } from "./session";

export type AuthHomeRoute = "/citizen" | "/office" | "/office/appeals" | "/admin";

export interface RouteAccessRule {
  /** Route prefix. More-specific entries must appear first. */
  path: string;
  allow: readonly AppRole[];
  loginTo: "/auth/login" | "/auth/officer-login";
}

/**
 * The application-level authorization map. It governs whether a role may open
 * a workspace route; Supabase RLS remains the authority for individual rows.
 */
export const PROTECTED_ROUTE_RULES: readonly RouteAccessRule[] = [
  { path: "/citizen", allow: ["citizen"], loginTo: "/auth/login" },
  { path: "/office/appeals", allow: ["appellate"], loginTo: "/auth/officer-login" },
  { path: "/office/analytics", allow: ["nodal"], loginTo: "/auth/officer-login" },
  { path: "/office/systemic-issues", allow: ["nodal"], loginTo: "/auth/officer-login" },
  { path: "/office/cases", allow: ["gro", "nodal"], loginTo: "/auth/officer-login" },
  { path: "/office", allow: ["gro", "nodal", "appellate"], loginTo: "/auth/officer-login" },
  { path: "/admin", allow: ["platform_admin"], loginTo: "/auth/officer-login" },
];

export function roleHomePath(role: AppRole): AuthHomeRoute {
  switch (role) {
    case "citizen":
      return "/citizen";
    case "appellate":
      return "/office/appeals";
    case "gro":
    case "nodal":
      return "/office";
    case "platform_admin":
      return "/admin";
  }
}

export function routeAccessRule(pathname: string): RouteAccessRule | undefined {
  return PROTECTED_ROUTE_RULES.find((rule) => pathname === rule.path || pathname.startsWith(`${rule.path}/`));
}

export function canAccessRoute(role: AppRole, pathname: string): boolean {
  const rule = routeAccessRule(pathname);
  return Boolean(rule?.allow.includes(role));
}

/** @deprecated Prefer canAccessRoute so nested routes stay independently guarded. */
export function canAccessWorkspace(role: AppRole, allowedRoles: readonly AppRole[]): boolean {
  return allowedRoles.includes(role);
}
