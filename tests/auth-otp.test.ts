import { describe, expect, test } from "bun:test";
import type { Session, User } from "@supabase/supabase-js";
import {
  AUTH_OTP_LENGTH,
  AuthFlowError,
  authErrorMessage,
  isCompleteOtp,
  maskAuthEmail,
  normalizeOtpInput,
  requestLoginOtp,
  requestRecoveryOtp,
  updateRecoveredPassword,
  validateNewPassword,
  verifyLoginOtp,
  verifyRecoveryOtp,
  type OtpAuthApi,
} from "../src/lib/cpgrams/auth-otp";

const user = { id: "auth-user" } as User;
const session = { user } as Session;

function authMock(overrides: Partial<OtpAuthApi> = {}) {
  const calls: Array<{ method: string; input: unknown }> = [];
  const auth: OtpAuthApi = {
    signInWithOtp: async (input) => {
      calls.push({ method: "signInWithOtp", input });
      return { data: {}, error: null };
    },
    resetPasswordForEmail: async (input) => {
      calls.push({ method: "resetPasswordForEmail", input });
      return { data: {}, error: null };
    },
    verifyOtp: async (input) => {
      calls.push({ method: "verifyOtp", input });
      return { data: { user, session }, error: null };
    },
    updateUser: async (input) => {
      calls.push({ method: "updateUser", input });
      return { data: { user }, error: null };
    },
    ...overrides,
  };
  return { auth, calls };
}

describe("Supabase email OTP authentication", () => {
  test("requests login OTP for a normalized email without creating an account", async () => {
    const { auth, calls } = authMock();
    expect(await requestLoginOtp("  Citizen@Example.IN ", auth)).toBe("citizen@example.in");
    expect(calls).toEqual([
      {
        method: "signInWithOtp",
        input: { email: "citizen@example.in", options: { shouldCreateUser: false } },
      },
    ]);
  });

  test("rejects malformed email before any Supabase request", async () => {
    const { auth, calls } = authMock();
    await expect(requestLoginOtp("not-an-email", auth)).rejects.toBeInstanceOf(AuthFlowError);
    expect(calls).toHaveLength(0);
  });

  test("verifies a complete login code using email type", async () => {
    const { auth, calls } = authMock();
    expect((await verifyLoginOtp("citizen@example.in", "12345678", auth)).session).toBe(session);
    expect(calls[0]).toEqual({
      method: "verifyOtp",
      input: { email: "citizen@example.in", token: "12345678", type: "email" },
    });
  });

  test("does not submit incomplete codes and maps invalid codes safely", async () => {
    const incomplete = authMock();
    await expect(
      verifyLoginOtp("citizen@example.in", "123", incomplete.auth),
    ).rejects.toBeInstanceOf(AuthFlowError);
    expect(incomplete.calls).toHaveLength(0);
    const invalid = authMock({
      verifyOtp: async () => ({
        data: { user: null, session: null },
        error: { message: "Token has expired or is invalid" },
      }),
    });
    await expect(verifyLoginOtp("citizen@example.in", "12345678", invalid.auth)).rejects.toThrow(
      "invalid or has expired",
    );
  });

  test("maps rate limiting without exposing provider internals", async () => {
    const { auth } = authMock({
      signInWithOtp: async () => ({
        data: {},
        error: { status: 429, message: "provider quota detail" },
      }),
    });
    await expect(requestLoginOtp("citizen@example.in", auth)).rejects.toThrow("Too many requests");
    expect(authErrorMessage(new Error("raw internal detail"))).not.toContain("raw internal");
  });

  test("accepts only a complete eight-digit OTP and masks the destination", () => {
    expect(AUTH_OTP_LENGTH).toBe(8);
    expect(Array.from({ length: AUTH_OTP_LENGTH })).toHaveLength(8);
    expect(isCompleteOtp("123456")).toBe(false);
    expect(isCompleteOtp("1234567")).toBe(false);
    expect(isCompleteOtp("12345678")).toBe(true);
    expect(isCompleteOtp("123456789")).toBe(false);
    expect(isCompleteOtp("1234567a")).toBe(false);
    expect(maskAuthEmail("citizen@example.in")).toBe("c••••••@example.in");
  });

  test("normalizes a pasted OTP to eight numeric positions", () => {
    expect(normalizeOtpInput("12345678")).toBe("12345678");
    expect(normalizeOtpInput("12 34-56ab78")).toBe("12345678");
    expect(normalizeOtpInput("1234567890")).toBe("12345678");
  });
});

describe("Supabase recovery OTP", () => {
  test("requests recovery through resetPasswordForEmail", async () => {
    const { auth, calls } = authMock();
    await requestRecoveryOtp("citizen@example.in", auth);
    expect(calls).toEqual([{ method: "resetPasswordForEmail", input: "citizen@example.in" }]);
  });

  test("verifies recovery with recovery type, never email type", async () => {
    const { auth, calls } = authMock();
    await verifyRecoveryOtp("citizen@example.in", "87654321", auth);
    expect(calls[0]).toEqual({
      method: "verifyOtp",
      input: { email: "citizen@example.in", token: "87654321", type: "recovery" },
    });
  });

  test("cannot update a password before recovery verification", async () => {
    const { auth, calls } = authMock();
    await expect(
      updateRecoveredPassword("new-password", "new-password", false, auth),
    ).rejects.toThrow("Verify your recovery code");
    expect(calls).toHaveLength(0);
  });

  test("validates confirmation and updates only Supabase Auth after verification", async () => {
    const { auth, calls } = authMock();
    expect(validateNewPassword("new-password", "different")).toContain("does not match");
    await updateRecoveredPassword("new-password", "new-password", true, auth);
    expect(calls).toEqual([{ method: "updateUser", input: { password: "new-password" } }]);
  });
});
