import type { AuthHomeRoute } from "./auth-routing";
import { roleHomePath } from "./auth-routing";
import type { AppRole } from "./session";

/** Metadata allowed during a public citizen self-signup. Authorization data is deliberately absent. */
export function citizenSignupMetadata(fullName: string, phone: string) {
  return { full_name: fullName, phone };
}

/** Resolve the destination only from the role loaded from the profile. */
export function postAuthenticationRoute(profile: { role: AppRole } | null): AuthHomeRoute | null {
  return profile ? roleHomePath(profile.role) : null;
}

/** A restored browser session must be re-linked to a profile before it is authorized. */
export function shouldLoadProfileForSession<T extends { user: unknown }>(session: T | null): session is T {
  return session !== null;
}
