export type AuthCallbackKind = "confirmation" | "recovery";

function validHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Browser redirects should return to the exact deployed or local CPGRAMS
 * origin. The configured value is only a non-browser/SSR fallback; it is not
 * a Lovable URL or an authorization input.
 */
export function resolveAuthApplicationOrigin(input: {
  runtimeOrigin?: string;
  configuredOrigin?: string;
}): string {
  return (
    validHttpOrigin(input.runtimeOrigin) ??
    validHttpOrigin(input.configuredOrigin) ??
    "http://localhost:5173"
  );
}

export function makeAuthCallbackUrl(
  input: { runtimeOrigin?: string; configuredOrigin?: string },
  kind?: AuthCallbackKind,
): string {
  const url = new URL("/auth/callback", resolveAuthApplicationOrigin(input));
  if (kind) url.searchParams.set("type", kind);
  return url.toString();
}

/** The sole browser URL used by Supabase confirmation and recovery emails. */
export function authCallbackUrl(kind?: AuthCallbackKind): string {
  const runtimeOrigin = typeof window === "undefined" ? undefined : window.location.origin;
  const configuredOrigin = import.meta.env["VITE_APP_URL"];
  return makeAuthCallbackUrl(
    {
      ...(runtimeOrigin ? { runtimeOrigin } : {}),
      ...(configuredOrigin ? { configuredOrigin } : {}),
    },
    kind,
  );
}
