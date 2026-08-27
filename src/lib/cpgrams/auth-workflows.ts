import type { AuthHomeRoute } from "./auth-routing";
import { roleHomePath } from "./auth-routing";
import type { AppRole } from "./session";

export type AuthAccessPhase =
  | "AUTH_INITIALIZING"
  | "UNAUTHENTICATED"
  | "PROFILE_LOADING"
  | "AUTHORIZED"
  | "PROFILE_UNAVAILABLE";

export function authAccessPhase(input: {
  isInitializing: boolean;
  hasSession: boolean;
  hasProfile: boolean;
  profileState: "loading" | "ready" | "missing" | "error";
}): AuthAccessPhase {
  if (input.isInitializing) return "AUTH_INITIALIZING";
  if (!input.hasSession) return "UNAUTHENTICATED";
  if (input.profileState === "loading") return "PROFILE_LOADING";
  if (input.hasProfile && input.profileState === "ready") return "AUTHORIZED";
  return "PROFILE_UNAVAILABLE";
}

/** Metadata allowed during a public citizen self-signup. Authorization data is deliberately absent. */
export function citizenSignupMetadata(
  fullName: string,
  phone: string,
  optional: { gender?: string; address?: string } = {},
) {
  return {
    full_name: fullName,
    phone,
    ...(optional.gender ? { gender: optional.gender } : {}),
    ...(optional.address ? { address: optional.address } : {}),
  };
}

/** Resolve the destination only from the role loaded from the profile. */
export function postAuthenticationRoute(profile: { role: AppRole } | null): AuthHomeRoute | null {
  return profile ? roleHomePath(profile.role) : null;
}

/** A restored browser session must be re-linked to a profile before it is authorized. */
export function shouldLoadProfileForSession<T extends { user: unknown }>(
  session: T | null,
): session is T {
  return session !== null;
}

interface AuthCallbackResult {
  data: { session: { user: unknown } | null };
  error: { message?: string } | null;
}

export interface AuthCallbackApi {
  exchangeCodeForSession: (code: string) => Promise<AuthCallbackResult>;
  getSession: () => Promise<AuthCallbackResult>;
}

export function authCallbackKind(url: string): "recovery" | "confirmation" {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  return parsed.searchParams.get("type") === "recovery" || hash.get("type") === "recovery"
    ? "recovery"
    : "confirmation";
}

/** Completes a PKCE callback when a code is present; implicit callbacks rely on
 * the client session Supabase has already detected. */
export async function completeAuthCallback(url: string, auth: AuthCallbackApi) {
  const code = new URL(url).searchParams.get("code");
  const result = code ? await auth.exchangeCodeForSession(code) : await auth.getSession();
  if (result.error || !result.data.session) {
    throw new Error(
      "We could not complete the secure email link. Please request a new link and try again.",
    );
  }
  return { session: result.data.session, kind: authCallbackKind(url) };
}

export function validatePasswordLogin(email: string, password: string): string | null {
  if (!email.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  if (!password) return "Enter your password.";
  return null;
}

/** Supabase returns a session with Confirm Email off, otherwise a user without
 * a session. Both outcomes are valid signup journeys. */
export function signupDisposition(input: { hasUser: boolean; hasSession: boolean }) {
  if (input.hasUser && input.hasSession) return "signed_in" as const;
  if (input.hasUser) return "confirmation_required" as const;
  return "failed" as const;
}

export function passwordSignInErrorMessage(
  error: { message?: string | undefined; status?: number | undefined } | null,
): string {
  const message = error?.message?.toLocaleLowerCase() ?? "";
  if (error?.status === 429 || message.includes("rate") || message.includes("too many"))
    return "Too many sign-in attempts. Please wait before trying again.";
  if (message.includes("network") || message.includes("fetch"))
    return "We could not reach the sign-in service. Check your connection and try again.";
  if (message.includes("confirm"))
    return "Please confirm your email from the link we sent, then sign in.";
  return "The email or password is incorrect. Check both and try again.";
}
