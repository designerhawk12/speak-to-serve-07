import { describe, expect, test } from "bun:test";
import { canAccessRoute } from "../src/lib/cpgrams/auth-routing";

describe("appeal workflow route boundaries", () => {
  test("keeps Nodal supervisory review in authorized cases, not appellate adjudication", () => {
    expect(canAccessRoute("nodal", "/office/cases")).toBe(true);
    expect(canAccessRoute("nodal", "/office/appeals/appeal-1")).toBe(false);
  });

  test("limits the manual appellate decision lane to Appellate Authorities", () => {
    expect(canAccessRoute("appellate", "/office/appeals/appeal-1")).toBe(true);
    expect(canAccessRoute("gro", "/office/appeals/appeal-1")).toBe(false);
    expect(canAccessRoute("citizen", "/office/appeals/appeal-1")).toBe(false);
  });
});
