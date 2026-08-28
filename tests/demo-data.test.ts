import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  DEMO_ACCOUNTS,
  DEMO_CASES,
  DEMO_CATEGORIES,
  DEMO_CLUSTERS,
  DEMO_ORGANIZATIONS,
  LEGACY_DEMO_AUTH_EMAILS,
  LEGACY_DEMO_CASE_IDS,
  REVIEWER_CASE_TITLE_PREFIX,
  REQUIRED_DEMO_TAGS,
  demoScenarioCounts,
} from "../scripts/demo-data-manifest";
import {
  projectRefFromConfig,
  projectRefFromSupabaseUrl,
  reviewerSeedGuardStatus,
} from "../scripts/reviewer-seed-guard";

describe("repeatable demo data manifest", () => {
  test("covers every requested workflow scenario", () => {
    const counts = demoScenarioCounts();
    for (const tag of REQUIRED_DEMO_TAGS) expect(counts[tag]).toBeGreaterThan(0);
  });

  test("uses clearly labelled prototype reference data", () => {
    expect(DEMO_ORGANIZATIONS.every((item) => item.name.startsWith("[DEMO]"))).toBe(true);
    expect(DEMO_CATEGORIES.every((item) => item.name.startsWith("[DEMO]"))).toBe(true);
    expect(DEMO_CLUSTERS.every((item) => item.title.startsWith("[DEMO]"))).toBe(true);
  });

  test("uses exactly two synthetic citizens and the intended government accounts", () => {
    expect(DEMO_ACCOUNTS.every((item) => item.email.endsWith("@demo-data.cpgrams.in"))).toBe(true);
    expect(DEMO_ACCOUNTS.filter((item) => item.role === "citizen")).toHaveLength(2);
    expect(DEMO_ACCOUNTS.filter((item) => item.role === "gro")).toHaveLength(7);
    expect(DEMO_ACCOUNTS.filter((item) => item.role === "nodal")).toHaveLength(1);
    expect(DEMO_ACCOUNTS.filter((item) => item.role === "appellate")).toHaveLength(1);
  });

  test("has enough varied rows for populated role workspaces", () => {
    expect(DEMO_ACCOUNTS.length).toBe(11);
    expect(DEMO_ORGANIZATIONS.length).toBe(5);
    expect(DEMO_CATEGORIES.length).toBe(6);
    expect(DEMO_CASES.length).toBe(31);
    expect(DEMO_CLUSTERS.length).toBe(3);
    expect(new Set(DEMO_CASES.map((item) => item.organizationCode)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(DEMO_CASES.map((item) => item.location)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(DEMO_CASES.map((item) => item.citizen))).toEqual(new Set([0, 1]));
    expect(DEMO_CASES.filter((item) => item.citizen === 0)).toHaveLength(16);
    expect(DEMO_CASES.filter((item) => item.citizen === 1)).toHaveLength(15);
  });

  test("labels every case for reviewer mode and includes manual-routing guidance", () => {
    expect(DEMO_CASES.every((item) => item.title.startsWith(REVIEWER_CASE_TITLE_PREFIX))).toBe(
      true,
    );
    expect(DEMO_CASES.some((item) => item.tags.includes("manual-routing"))).toBe(true);
  });

  test("keeps a confirmed case ready for GRO closure and closed historical cases", () => {
    const closureReady = DEMO_CASES.filter((item) => item.tags.includes("closure-ready"));
    expect(closureReady).toHaveLength(1);
    expect(closureReady[0]?.confirmationState).toBe("CONFIRMED_RESOLVED");
    expect(closureReady[0]?.administrativeState).not.toBe("CLOSED");
    expect(
      DEMO_CASES.some(
        (item) => item.tags.includes("confirmed-resolved") && item.administrativeState === "CLOSED",
      ),
    ).toBe(true);
  });

  test("uses public-tracking-compatible high-entropy-shaped demo references", () => {
    expect(DEMO_CASES.every((item) => /^CPG-2026-[A-F0-9]{20}$/.test(item.reference))).toBe(true);
    expect(new Set(DEMO_CASES.map((item) => item.id)).size).toBe(DEMO_CASES.length);
  });

  test("scopes legacy cleanup to explicit demo emails and fixture UUIDs", () => {
    expect(LEGACY_DEMO_AUTH_EMAILS).toContain("citizen.3@demo-data.cpgrams.in");
    expect(LEGACY_DEMO_AUTH_EMAILS).toContain("citizen.4@demo-data.cpgrams.in");
    expect(LEGACY_DEMO_AUTH_EMAILS).toContain("citizen.5@demo-data.cpgrams.in");
    expect(
      LEGACY_DEMO_AUTH_EMAILS.every(
        (email) =>
          email.endsWith("@demo.cpgrams.in") || email.endsWith("@demo-data.cpgrams.in"),
      ),
    ).toBe(true);
    expect(LEGACY_DEMO_CASE_IDS).toHaveLength(25);
    expect(
      LEGACY_DEMO_CASE_IDS.every((id) => id.startsWith("90000000-") || id.startsWith("91000000-")),
    ).toBe(true);
  });

  test("removes fixed case data before retired demo Auth identities", () => {
    const seedSource = readFileSync(
      new URL("../scripts/seed-demo-data.ts", import.meta.url),
      "utf8",
    );
    const packRemoval = seedSource.lastIndexOf("await removePackData(admin, false)");
    const legacyRemoval = seedSource.lastIndexOf("await removeLegacyDemoData(admin)");
    expect(packRemoval).toBeGreaterThan(-1);
    expect(packRemoval).toBeLessThan(
      legacyRemoval,
    );
    expect(seedSource).toContain("/demo-pack");
  });
});

describe("reviewer seed guard", () => {
  const configText = 'project_id = "ptriuuhnesupbdmrmwka"';
  const supabaseUrl = "https://ptriuuhnesupbdmrmwka.supabase.co";

  test("extracts matching project refs without exposing credentials", () => {
    expect(projectRefFromConfig(configText)).toBe("ptriuuhnesupbdmrmwka");
    expect(projectRefFromSupabaseUrl(supabaseUrl)).toBe("ptriuuhnesupbdmrmwka");
  });

  test("allows only an explicitly confirmed matching development project", () => {
    expect(
      reviewerSeedGuardStatus({
        nodeEnv: "development",
        target: "development",
        confirmation: "development",
        expectedProjectRef: "ptriuuhnesupbdmrmwka",
        supabaseUrl,
        configText,
      }).allowed,
    ).toBe(true);
  });

  test("refuses production, missing confirmation, and project mismatches", () => {
    const production = reviewerSeedGuardStatus({
      nodeEnv: "production",
      target: "development",
      confirmation: "development",
      expectedProjectRef: "ptriuuhnesupbdmrmwka",
      supabaseUrl,
      configText,
    });
    expect(production.allowed).toBe(false);
    expect(production.failures).toContain("NODE_ENV is production");

    const missingConfirmation = reviewerSeedGuardStatus({
      target: "development",
      expectedProjectRef: "ptriuuhnesupbdmrmwka",
      supabaseUrl,
      configText,
    });
    expect(missingConfirmation.allowed).toBe(false);
    expect(missingConfirmation.failures).toContain("REVIEWER_RESET_CONFIRM is not development");

    const mismatch = reviewerSeedGuardStatus({
      target: "development",
      confirmation: "development",
      expectedProjectRef: "otherprojectref",
      supabaseUrl,
      configText,
    });
    expect(mismatch.allowed).toBe(false);
    expect(mismatch.failures).toContain(
      "SUPABASE_URL project ref does not match REVIEWER_DEMO_PROJECT_REF",
    );
    expect(mismatch.failures).toContain(
      "supabase/config.toml project_id does not match REVIEWER_DEMO_PROJECT_REF",
    );
  });
});
