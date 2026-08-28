import type { GrievanceCategoryRow, OrganizationRow } from "./data-access";

type HierarchicalReferenceRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

export interface IntakeTaxonomyOption {
  id: string;
  label: string;
  searchText: string;
}

function ancestorNames<Row extends HierarchicalReferenceRow>(row: Row, rows: Row[]): string[] {
  const byId = new Map(rows.map((entry) => [entry.id, entry]));
  const names: string[] = [];
  const visited = new Set<string>([row.id]);
  let parentId = row.parent_id;

  while (parentId && !visited.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    names.unshift(parent.name);
    visited.add(parent.id);
    parentId = parent.parent_id;
  }

  return names;
}

/**
 * Produces an honest hierarchy label from the database reference tree. It does
 * not imply that the connected reference dataset is a complete official list.
 */
export function toIntakeTaxonomyOptions<Row extends HierarchicalReferenceRow>(
  rows: Row[],
  extraSearchText: (row: Row) => string = () => "",
): IntakeTaxonomyOption[] {
  return rows
    .map((row) => {
      const ancestry = ancestorNames(row, rows);
      const label = ancestry.length ? `${ancestry.join(" › ")} › ${row.name}` : row.name;
      return {
        id: row.id,
        label,
        searchText: `${label} ${extraSearchText(row)}`.toLocaleLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function filterIntakeTaxonomyOptions(
  options: IntakeTaxonomyOption[],
  search: string,
): IntakeTaxonomyOption[] {
  const normalized = search.trim().toLocaleLowerCase();
  return normalized ? options.filter((option) => option.searchText.includes(normalized)) : options;
}

export function organizationIntakeOptions(rows: OrganizationRow[]): IntakeTaxonomyOption[] {
  return toIntakeTaxonomyOptions(rows, (row) => `${row.code} ${row.level} ${row.state_name ?? ""}`);
}

export function categoryIntakeOptions(rows: GrievanceCategoryRow[]): IntakeTaxonomyOption[] {
  return toIntakeTaxonomyOptions(rows, (row) => `${row.code} ${row.plain_language_hint ?? ""}`);
}
