import { describe, expect, test } from "bun:test";
import {
  FAQ_ENTRIES,
  FAQ_SEARCH_SUGGESTIONS,
  PUBLIC_SITEMAP,
  filterFaqEntries,
} from "../src/lib/cpgrams/public-content";

describe("public content contracts", () => {
  test("finds FAQ guidance across questions, answers, and keywords", () => {
    expect(filterFaqEntries("sub-judice", "All").map((entry) => entry.id)).toContain("court");
    expect(filterFaqEntries("OTP", "Account help").map((entry) => entry.id)).toContain(
      "password-otp",
    );
  });
  test("returns at least one relevant FAQ for every displayed suggested search", () => {
    const expectedMatches: Record<(typeof FAQ_SEARCH_SUGGESTIONS)[number]["query"], string> = {
      "filing process": "how-to-file",
      "document requests": "clarification-documents",
      "email OTP": "password-otp",
      appeal: "appeal",
    };

    for (const suggestion of FAQ_SEARCH_SUGGESTIONS) {
      const matches = filterFaqEntries(suggestion.query, "All");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.map((entry) => entry.id)).toContain(expectedMatches[suggestion.query]);
    }
  });
  test("keeps a selected FAQ section isolated", () => {
    const entries = filterFaqEntries("", "Eligibility guidance");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.section === "Eligibility guidance")).toBe(true);
  });
  test("covers public content routes without exposing private workspaces", () => {
    const paths = PUBLIC_SITEMAP.map((entry) => entry.path);
    expect(paths).toEqual(
      expect.arrayContaining(["/", "/track", "/appeal-status", "/faq", "/contact"]),
    );
    expect(
      paths.some(
        (path) =>
          path === "/citizen" ||
          path.startsWith("/citizen/") ||
          path === "/office" ||
          path.startsWith("/office/"),
      ),
    ).toBe(false);
  });
  test("keeps required FAQ guidance in the inventory", () => {
    const ids = FAQ_ENTRIES.map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "who-can-lodge",
        "problem-first",
        "action-required",
        "resolution-confirmation",
        "appeal",
        "rti",
      ]),
    );
  });
});
