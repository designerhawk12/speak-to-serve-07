import { describe, expect, test } from "bun:test";
import { AUTH_FEATURES, createAuthFeatures } from "../src/lib/cpgrams/auth-config";
import {
  canAccessRoute,
  canAccessWorkspace,
  roleHomePath,
  routeAccessRule,
} from "../src/lib/cpgrams/auth-routing";
import {
  citizenSignupMetadata,
  postAuthenticationRoute,
  shouldLoadProfileForSession,
} from "../src/lib/cpgrams/auth-workflows";

describe("roleHomePath", () => {
  test("routes citizens to their workspace", () => {
    expect(roleHomePath("citizen")).toBe("/citizen");
  });

  test("routes office roles to the correct workspace", () => {
    expect(roleHomePath("gro")).toBe("/office");
    expect(roleHomePath("nodal")).toBe("/office");
    expect(roleHomePath("appellate")).toBe("/office/appeals");
    expect(roleHomePath("platform_admin")).toBe("/admin");
  });
});

describe("route-level authorization", () => {
  test("independently guards nested office routes", () => {
    expect(canAccessRoute("gro", "/office/cases/case-1")).toBe(true);
    expect(canAccessRoute("gro", "/office/appeals/appeal-1")).toBe(false);
    expect(canAccessRoute("nodal", "/office/appeals")).toBe(false);
    expect(canAccessRoute("appellate", "/office/appeals/appeal-1")).toBe(true);
    expect(canAccessRoute("appellate", "/office/cases/case-1")).toBe(false);
  });

  test("assigns each operational route only to its configured role", () => {
    expect(canAccessRoute("citizen", "/citizen/notifications")).toBe(true);
    expect(canAccessRoute("citizen", "/office")).toBe(false);
    expect(canAccessRoute("gro", "/office/analytics")).toBe(false);
    expect(canAccessRoute("nodal", "/office/analytics")).toBe(true);
    expect(canAccessRoute("nodal", "/office/systemic-issues")).toBe(true);
    expect(canAccessRoute("platform_admin", "/admin/users")).toBe(true);
    expect(canAccessRoute("platform_admin", "/office/cases")).toBe(false);
    expect(routeAccessRule("/office/appeals/appeal-1")?.allow).toEqual(["appellate"]);
  });
});

describe("development authentication workflows", () => {
  test("loads a profile whenever a browser session is restored", () => {
    expect(shouldLoadProfileForSession(null)).toBe(false);
    expect(shouldLoadProfileForSession({ user: { id: "auth-user" } })).toBe(true);
  });

  test("uses only the database profile role for post-authentication routing", () => {
    expect(postAuthenticationRoute({ role: "citizen" })).toBe("/citizen");
    expect(postAuthenticationRoute({ role: "gro" })).toBe("/office");
    expect(postAuthenticationRoute({ role: "nodal" })).toBe("/office");
    expect(postAuthenticationRoute({ role: "appellate" })).toBe("/office/appeals");
    expect(postAuthenticationRoute(null)).toBeNull();
  });

  test("public signup metadata cannot select an application role", () => {
    expect(citizenSignupMetadata("Asha", "9000000000")).toEqual({
      full_name: "Asha",
      phone: "9000000000",
    });
    expect(citizenSignupMetadata("Asha", "9000000000")).not.toHaveProperty("role");
  });

  test("email authentication uses Supabase Auth in development and production", () => {
    expect(AUTH_FEATURES.passwordSignIn).toBe(true);
    expect(createAuthFeatures(true)).toMatchObject({
      developmentMode: true,
      emailOtp: true,
      passwordRecovery: true,
      emailConfirmation: true,
    });
  });
});

describe("canAccessWorkspace", () => {
  test("does not let citizens enter the office workspace", () => {
    expect(canAccessWorkspace("citizen", ["gro", "nodal", "appellate", "platform_admin"])).toBe(
      false,
    );
  });

  test("allows only the roles explicitly permitted by a route", () => {
    expect(canAccessWorkspace("gro", ["gro", "nodal"])).toBe(true);
    expect(canAccessWorkspace("appellate", ["gro", "nodal"])).toBe(false);
  });
});
