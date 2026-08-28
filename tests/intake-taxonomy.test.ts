import { describe, expect, test } from "bun:test";
import {
  filterIntakeTaxonomyOptions,
  toIntakeTaxonomyOptions,
} from "../src/lib/cpgrams/intake-taxonomy";

const organizations = [
  { id: "central", name: "Central Services", parent_id: null, code: "CENTRAL" },
  { id: "maharashtra", name: "Maharashtra Services", parent_id: "central", code: "MH" },
  { id: "pune", name: "Pune Municipal Corporation", parent_id: "maharashtra", code: "PMC" },
  { id: "karnataka", name: "Karnataka Services", parent_id: "central", code: "KA" },
  {
    id: "bengaluru",
    name: "Bengaluru Municipal Corporation",
    parent_id: "karnataka",
    code: "BBMP",
  },
  { id: "pension", name: "Pension Directorate", parent_id: "central", code: "PENSION" },
  { id: "appeals", name: "Appeals Office", parent_id: "central", code: "APPEALS" },
];

const categories = [
  { id: "urban", name: "Urban services", parent_id: null, code: "URBAN" },
  { id: "streetlight", name: "Streetlight maintenance", parent_id: "urban", code: "URBAN-LIGHT" },
  { id: "pension-root", name: "Pensions", parent_id: null, code: "PENSION" },
  {
    id: "pension-delay",
    name: "Pension payment delay",
    parent_id: "pension-root",
    code: "PENSION-DELAY",
  },
];

describe("intake taxonomy presentation", () => {
  test("returns every active database row passed to it instead of truncating a demo list", () => {
    const options = toIntakeTaxonomyOptions(organizations, (organization) => organization.code);

    expect(options).toHaveLength(organizations.length);
    expect(options.map((option) => option.id).sort()).toEqual(
      organizations.map((row) => row.id).sort(),
    );
  });

  test("searches all organization rows and keeps their database hierarchy visible", () => {
    const options = toIntakeTaxonomyOptions(organizations, (organization) => organization.code);
    const results = filterIntakeTaxonomyOptions(options, "pune");

    expect(results).toEqual([
      expect.objectContaining({
        id: "pune",
        label: "Central Services › Maharashtra Services › Pune Municipal Corporation",
      }),
    ]);
  });

  test("keeps category/subcategory relationships searchable and visible", () => {
    const options = toIntakeTaxonomyOptions(categories, (category) => category.code);
    const results = filterIntakeTaxonomyOptions(options, "payment delay");

    expect(results).toEqual([
      expect.objectContaining({
        id: "pension-delay",
        label: "Pensions › Pension payment delay",
      }),
    ]);
    expect(options).toHaveLength(categories.length);
  });
});
