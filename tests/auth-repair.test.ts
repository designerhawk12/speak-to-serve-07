import { describe, expect, test } from "bun:test";
import {
  authAccessPhase,
  authCallbackKind,
  citizenSignupMetadata,
  completeAuthCallback,
  passwordSignInErrorMessage,
  postAuthenticationRoute,
  signupDisposition,
  validatePasswordLogin,
} from "../src/lib/cpgrams/auth-workflows";
import { makeAuthCallbackUrl } from "../src/lib/cpgrams/auth-url";
import { validateNewPassword } from "../src/lib/cpgrams/auth-otp";

describe("auth repair regressions", () => {
  test("does not authorize or redirect while session/profile initialization is still in flight", () => {
    expect(
      authAccessPhase({
        isInitializing: true,
        hasSession: false,
        hasProfile: false,
        profileState: "loading",
      }),
    ).toBe("AUTH_INITIALIZING");
    expect(
      authAccessPhase({
        isInitializing: false,
        hasSession: true,
        hasProfile: false,
        profileState: "loading",
      }),
    ).toBe("PROFILE_LOADING");
    expect(
      authAccessPhase({
        isInitializing: false,
        hasSession: true,
        hasProfile: false,
        profileState: "error",
      }),
    ).toBe("PROFILE_UNAVAILABLE");
  });

  test("uses the current deployed/local CPGRAMS origin for every email callback", () => {
    expect(
      makeAuthCallbackUrl({ runtimeOrigin: "https://cpgrams.example.in" }, "confirmation"),
    ).toBe("https://cpgrams.example.in/auth/callback?type=confirmation");
    expect(makeAuthCallbackUrl({ runtimeOrigin: "http://localhost:5173" }, "recovery")).toBe(
      "http://localhost:5173/auth/callback?type=recovery",
    );
  });

  test("accepts both valid Supabase signup outcomes", () => {
    expect(signupDisposition({ hasUser: true, hasSession: true })).toBe("signed_in");
    expect(signupDisposition({ hasUser: true, hasSession: false })).toBe("confirmation_required");
    expect(citizenSignupMetadata("Citizen", "9000000000", { gender: "Other" })).toEqual({
      full_name: "Citizen",
      phone: "9000000000",
      gender: "Other",
    });
    expect(citizenSignupMetadata("Citizen", "9000000000")).not.toHaveProperty("role");
  });

  test("exchanges a PKCE recovery code before permitting password update", async () => {
    const calls: string[] = [];
    const callback = await completeAuthCallback(
      "https://cpgrams.example.in/auth/callback?type=recovery&code=pkce-code",
      {
        exchangeCodeForSession: async (code) => {
          calls.push(code);
          return { data: { session: { user: {} } }, error: null };
        },
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    );
    expect(calls).toEqual(["pkce-code"]);
    expect(callback.kind).toBe("recovery");
    expect(authCallbackKind("https://cpgrams.example.in/auth/callback#type=recovery")).toBe(
      "recovery",
    );
  });

  test("keeps password mismatch local and gives safe password errors", () => {
    expect(validateNewPassword("abcdefgh", "different")).toBe(
      "New password and confirmation password do not match.",
    );
    expect(passwordSignInErrorMessage({ message: "Invalid login credentials" })).toBe(
      "The email or password is incorrect. Check both and try again.",
    );
    expect(validatePasswordLogin("not-an-email", "password")).toBe("Enter a valid email address.");
  });

  test("routes only from the role loaded from the profile", () => {
    expect(postAuthenticationRoute({ role: "citizen" })).toBe("/citizen");
    expect(postAuthenticationRoute({ role: "appellate" })).toBe("/office/appeals");
    expect(postAuthenticationRoute(null)).toBeNull();
  });
});
