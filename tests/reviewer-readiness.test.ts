import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { Session, User } from "@supabase/supabase-js";
import {
  requestReviewerLoginOtp,
  verifyReviewerLoginOtp,
  type ReviewerOtpApi,
} from "../src/lib/cpgrams/auth-otp";
import {
  REVIEWER_ACCOUNTS,
  REVIEWER_DEMO_OTP,
  isReviewerAccountEmail,
} from "../src/lib/cpgrams/reviewer-demo";
import {
  effectiveNormalQueueAssignee,
  mayOpenNormalOfficerCase,
} from "../src/lib/cpgrams/officer-assignment";
import {
  REVIEWER_EMAILS,
  validateReviewerLoginRequest,
} from "../supabase/functions/_shared/reviewer-auth";

const root = new URL("..", import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("reviewer-mode authentication", () => {
  test("uses exactly the guarded synthetic account inventory", () => {
    expect(REVIEWER_ACCOUNTS.filter((account) => account.persona === "Citizen")).toHaveLength(2);
    expect(REVIEWER_ACCOUNTS).toHaveLength(11);
    expect(REVIEWER_EMAILS).toEqual(REVIEWER_ACCOUNTS.map((account) => account.email));
    expect(REVIEWER_DEMO_OTP).toMatch(/^\d{8}$/);
    expect(isReviewerAccountEmail(" CITIZEN.1@DEMO-DATA.CPGRAMS.IN ")).toBe(true);
  });

  test("the request step sends no email and normalizes input", async () => {
    expect(await requestReviewerLoginOtp(" Citizen.1@Demo-Data.Cpgrams.In ")).toBe(
      "citizen.1@demo-data.cpgrams.in",
    );
    await expect(requestReviewerLoginOtp("not-an-email")).rejects.toThrow("valid email");
  });

  test("server validation accepts only allowlisted email plus configured code", () => {
    expect(
      validateReviewerLoginRequest(
        { email: "citizen.1@demo-data.cpgrams.in", code: REVIEWER_DEMO_OTP },
        REVIEWER_DEMO_OTP,
      ),
    ).toEqual({ email: "citizen.1@demo-data.cpgrams.in", code: REVIEWER_DEMO_OTP });
    expect(
      validateReviewerLoginRequest(
        { email: "unknown@example.in", code: REVIEWER_DEMO_OTP },
        REVIEWER_DEMO_OTP,
      ),
    ).toBeNull();
    expect(
      validateReviewerLoginRequest(
        { email: "citizen.1@demo-data.cpgrams.in", code: "00000000" },
        REVIEWER_DEMO_OTP,
      ),
    ).toBeNull();
  });

  test("verification establishes the returned normal Supabase session", async () => {
    const user = { id: "reviewer-user" } as User;
    const session = { user } as Session;
    const calls: unknown[] = [];
    const api: ReviewerOtpApi = {
      invoke: async (body) => {
        calls.push(["invoke", body]);
        return {
          data: { access_token: "access-token", refresh_token: "refresh-token" },
          error: null,
        };
      },
      setSession: async (tokens) => {
        calls.push(["setSession", tokens]);
        return { data: { user, session }, error: null };
      },
    };
    expect(
      (await verifyReviewerLoginOtp("citizen.1@demo-data.cpgrams.in", REVIEWER_DEMO_OTP, api))
        .session,
    ).toBe(session);
    expect(calls).toEqual([
      [
        "invoke",
        { email: "citizen.1@demo-data.cpgrams.in", code: REVIEWER_DEMO_OTP },
      ],
      [
        "setSession",
        { access_token: "access-token", refresh_token: "refresh-token" },
      ],
    ]);
  });

  test("bad or unknown reviewer login has one safe generic error", async () => {
    const api: ReviewerOtpApi = {
      invoke: async () => ({ data: null, error: { message: "raw provider detail" } }),
      setSession: async () => {
        throw new Error("must not be called");
      },
    };
    await expect(
      verifyReviewerLoginOtp("unknown@example.in", REVIEWER_DEMO_OTP, api),
    ).rejects.toThrow("Reviewer sign-in could not be completed");
  });

  test("mock auth is explicitly gated and no reviewer password or service key enters client code", () => {
    const component = source("src/components/cpgrams/EmailOtpLogin.tsx");
    const config = source("src/lib/cpgrams/reviewer-demo.ts");
    const edge = source("supabase/functions/reviewer-auth/index.ts");
    expect(component).toContain("Demo mode only");
    expect(config).toContain("VITE_REVIEWER_DEMO_MODE");
    expect(edge).toContain('Deno.env.get("REVIEWER_DEMO_MODE")');
    expect(edge).toContain('Deno.env.get("REVIEWER_DEMO_PASSWORD")');
    expect(edge).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(component).not.toContain("REVIEWER_DEMO_PASSWORD");
    expect(config).not.toContain("REVIEWER_DEMO_PASSWORD");
  });
});

describe("strict normal GRO workspace", () => {
  test("GRO queue is assignment-only while Nodal filters remain available", () => {
    expect(effectiveNormalQueueAssignee("gro", "all")).toBe("mine");
    expect(effectiveNormalQueueAssignee("gro", "other")).toBe("mine");
    expect(effectiveNormalQueueAssignee("nodal", "other")).toBe("other");
  });

  test("same-organization GRO cannot open another GRO's normal detail", () => {
    expect(mayOpenNormalOfficerCase("gro", "gro-a", "gro-a")).toBe(true);
    expect(mayOpenNormalOfficerCase("gro", "gro-b", "gro-a")).toBe(false);
    expect(mayOpenNormalOfficerCase("nodal", "nodal", "gro-a")).toBe(true);
  });
});

describe("public reviewer guidance", () => {
  test("guide is explicit about journeys, limitations, tools, and synthetic data", () => {
    const route = source("src/routes/reviewer-guide.tsx");
    const guide = source("docs/REVIEWER_GUIDE.md");
    for (const required of [
      "Demonstration interface",
      "Reviewer quick start",
      "Citizen → GRO → resolution → confirmation → close",
      "Where production CPGRAMS wins",
      "Codex",
      "Gemini",
      "Thank you to Varun Mayya",
    ]) {
      expect(`${route}\n${guide}`).toContain(required);
    }
  });
});

