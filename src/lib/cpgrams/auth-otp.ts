import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AUTH_OTP_LENGTH = 8;
export const AUTH_RESEND_SECONDS = 60;

export type AuthFailureCategory =
  | "invalid_email"
  | "invalid_otp"
  | "rate_limited"
  | "network"
  | "delivery"
  | "password_policy"
  | "recovery_invalid"
  | "unknown";

interface AuthFailureLike {
  code?: string;
  message?: string;
  status?: number;
}
interface AuthResult<T> {
  data: T;
  error: AuthFailureLike | null;
}
export interface OtpAuthApi {
  signInWithOtp: (input: {
    email: string;
    options: { shouldCreateUser: false };
  }) => Promise<AuthResult<unknown>>;
  resetPasswordForEmail: (email: string) => Promise<AuthResult<unknown>>;
  verifyOtp: (input: {
    email: string;
    token: string;
    type: "email" | "recovery";
  }) => Promise<AuthResult<{ user: User | null; session: Session | null }>>;
  updateUser: (input: { password: string }) => Promise<AuthResult<{ user: User | null }>>;
}

const browserAuth = () => supabase.auth as unknown as OtpAuthApi;

export class AuthFlowError extends Error {
  constructor(
    public readonly category: AuthFailureCategory,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}
export function isValidAuthEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthEmail(email));
}
export function isCompleteOtp(token: string): boolean {
  return new RegExp(`^\\d{${AUTH_OTP_LENGTH}}$`).test(token);
}
export function normalizeOtpInput(token: string): string {
  return token.replace(/\D/g, "").slice(0, AUTH_OTP_LENGTH);
}
export function maskAuthEmail(email: string): string {
  const [name = "", domain = ""] = normalizeAuthEmail(email).split("@");
  if (!domain) return "your email address";
  return `${name.slice(0, 1)}${"•".repeat(Math.max(3, name.length - 1))}@${domain}`;
}

function toFlowError(
  error: AuthFailureLike,
  operation: "request" | "verify" | "recovery" | "password",
): AuthFlowError {
  const code = error.code?.toLocaleLowerCase() ?? "";
  const message = error.message?.toLocaleLowerCase() ?? "";
  if (
    error.status === 429 ||
    code.includes("rate") ||
    message.includes("rate") ||
    message.includes("too many")
  )
    return new AuthFlowError("rate_limited", "Too many requests. Please wait before trying again.");
  if (message.includes("fetch") || message.includes("network") || code.includes("network"))
    return new AuthFlowError(
      "network",
      "We couldn't complete the request. Check your connection and try again.",
    );
  if (operation === "verify")
    return new AuthFlowError(
      "invalid_otp",
      "That verification code is invalid or has expired. Request a new code and try again.",
    );
  if (operation === "recovery")
    return new AuthFlowError(
      "recovery_invalid",
      "That recovery code is invalid or has expired. Request a new code and try again.",
    );
  if (operation === "password")
    return new AuthFlowError(
      "password_policy",
      "We couldn't update that password. Check the password requirements and try again.",
    );
  return new AuthFlowError(
    "delivery",
    "We couldn't send a verification code. Please wait and try again.",
  );
}

export function authErrorMessage(error: unknown): string {
  return error instanceof AuthFlowError
    ? error.message
    : "We couldn't complete the authentication request. Please try again.";
}

export async function requestLoginOtp(
  email: string,
  auth: OtpAuthApi = browserAuth(),
): Promise<string> {
  const normalized = normalizeAuthEmail(email);
  if (!isValidAuthEmail(normalized))
    throw new AuthFlowError("invalid_email", "Enter a valid email address.");
  const { error } = await auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: false },
  });
  if (error) throw toFlowError(error, "request");
  return normalized;
}

export async function verifyLoginOtp(
  email: string,
  token: string,
  auth: OtpAuthApi = browserAuth(),
) {
  if (!isCompleteOtp(token))
    throw new AuthFlowError("invalid_otp", `Enter the complete ${AUTH_OTP_LENGTH}-digit code.`);
  const { data, error } = await auth.verifyOtp({
    email: normalizeAuthEmail(email),
    token,
    type: "email",
  });
  if (error || !data.user || !data.session) throw toFlowError(error ?? {}, "verify");
  return data;
}

export async function requestRecoveryOtp(
  email: string,
  auth: OtpAuthApi = browserAuth(),
): Promise<string> {
  const normalized = normalizeAuthEmail(email);
  if (!isValidAuthEmail(normalized))
    throw new AuthFlowError("invalid_email", "Enter a valid email address.");
  const { error } = await auth.resetPasswordForEmail(normalized);
  if (error) throw toFlowError(error, "request");
  return normalized;
}

export async function verifyRecoveryOtp(
  email: string,
  token: string,
  auth: OtpAuthApi = browserAuth(),
) {
  if (!isCompleteOtp(token))
    throw new AuthFlowError("invalid_otp", `Enter the complete ${AUTH_OTP_LENGTH}-digit code.`);
  const { data, error } = await auth.verifyOtp({
    email: normalizeAuthEmail(email),
    token,
    type: "recovery",
  });
  if (error || !data.user || !data.session) throw toFlowError(error ?? {}, "recovery");
  return data;
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Use at least 8 characters for your new password.";
  if (password !== confirmation) return "The password confirmation does not match.";
  return null;
}

export async function updateRecoveredPassword(
  password: string,
  confirmation: string,
  recoveryVerified: boolean,
  auth: OtpAuthApi = browserAuth(),
) {
  if (!recoveryVerified)
    throw new AuthFlowError(
      "recovery_invalid",
      "Verify your recovery code before setting a new password.",
    );
  const validation = validateNewPassword(password, confirmation);
  if (validation) throw new AuthFlowError("password_policy", validation);
  const { data, error } = await auth.updateUser({ password });
  if (error || !data.user) throw toFlowError(error ?? {}, "password");
  return data.user;
}
