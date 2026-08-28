export interface AssignmentCandidate {
  id: string;
  organizationId: string;
  active: boolean;
  stateNames: string[];
  districtNames: string[];
  locationTerms: string[];
  activeCaseCount: number;
  lastAssignedAt: string | null;
}

export interface AssignmentCase {
  organizationId: string;
  stateName?: string | null;
  districtName?: string | null;
  locationText?: string | null;
}

const normalized = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() ?? "";

function exactMatch(configured: string[], value: string | null | undefined) {
  return (
    configured.length === 0 || configured.some((entry) => normalized(entry) === normalized(value))
  );
}

export function isEligibleGro(candidate: AssignmentCandidate, grievance: AssignmentCase): boolean {
  const location = normalized(
    [grievance.stateName, grievance.districtName, grievance.locationText].filter(Boolean).join(" "),
  );
  return (
    candidate.active &&
    candidate.organizationId === grievance.organizationId &&
    exactMatch(candidate.stateNames, grievance.stateName) &&
    exactMatch(candidate.districtNames, grievance.districtName) &&
    (candidate.locationTerms.length === 0 ||
      candidate.locationTerms.some((term) => location.includes(normalized(term))))
  );
}

export function chooseEligibleGro(
  candidates: AssignmentCandidate[],
  grievance: AssignmentCase,
): AssignmentCandidate | null {
  return (
    candidates
      .filter((candidate) => isEligibleGro(candidate, grievance))
      .sort((left, right) => {
        if (left.activeCaseCount !== right.activeCaseCount)
          return left.activeCaseCount - right.activeCaseCount;
        if (left.lastAssignedAt !== right.lastAssignedAt) {
          if (!left.lastAssignedAt) return -1;
          if (!right.lastAssignedAt) return 1;
          return left.lastAssignedAt.localeCompare(right.lastAssignedAt);
        }
        return left.id.localeCompare(right.id);
      })[0] ?? null
  );
}

export function assignmentDistribution(
  candidates: AssignmentCandidate[],
  grievances: AssignmentCase[],
): Record<string, number> {
  const working = candidates.map((candidate) => ({ ...candidate }));
  const result = Object.fromEntries(working.map((candidate) => [candidate.id, 0]));
  grievances.forEach((grievance, index) => {
    const selected = chooseEligibleGro(working, grievance);
    if (!selected) return;
    selected.activeCaseCount += 1;
    selected.lastAssignedAt = new Date(index + 1).toISOString();
    result[selected.id] = (result[selected.id] ?? 0) + 1;
  });
  return result;
}

export function authorizedOrganizationIds(
  organizations: Array<{ id: string; parent_id: string | null }>,
  rootId: string,
  includeSubtree: boolean,
): Set<string> {
  const ids = new Set([rootId]);
  if (!includeSubtree) return ids;
  let added = true;
  while (added) {
    added = false;
    for (const organization of organizations) {
      if (organization.parent_id && ids.has(organization.parent_id) && !ids.has(organization.id)) {
        ids.add(organization.id);
        added = true;
      }
    }
  }
  return ids;
}

export interface TransferOrganization {
  id: string;
  parent_id: string | null;
  is_active: boolean;
  is_appellate_office: boolean;
}

function organizationRootId(
  organizations: TransferOrganization[],
  organizationId: string,
): string | null {
  const byId = new Map(organizations.map((organization) => [organization.id, organization]));
  let current = byId.get(organizationId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (!current.parent_id) return current.id;
    current = byId.get(current.parent_id);
  }
  return null;
}

export function authorizedTransferOrganizationIds(
  organizations: TransferOrganization[],
  role: "gro" | "nodal",
  actorOrganizationId: string | null,
  sourceOrganizationId: string | null,
): Set<string> {
  if (!actorOrganizationId || !sourceOrganizationId) return new Set();
  const candidates = organizations.filter(
    (organization) =>
      organization.is_active &&
      !organization.is_appellate_office &&
      organization.id !== sourceOrganizationId,
  );

  if (role === "nodal") {
    const subtree = authorizedOrganizationIds(organizations, actorOrganizationId, true);
    return new Set(
      candidates.filter((organization) => subtree.has(organization.id)).map(({ id }) => id),
    );
  }

  const sourceRoot = organizationRootId(organizations, sourceOrganizationId);
  if (!sourceRoot) return new Set();
  return new Set(
    candidates
      .filter((organization) => organizationRootId(organizations, organization.id) === sourceRoot)
      .map(({ id }) => id),
  );
}

export function queueRange(page: number, pageSize: number) {
  const boundedPageSize = Math.min(100, Math.max(10, Math.trunc(pageSize)));
  const boundedPage = Math.max(1, Math.trunc(page));
  const from = (boundedPage - 1) * boundedPageSize;
  return { page: boundedPage, pageSize: boundedPageSize, from, to: from + boundedPageSize - 1 };
}

export type OfficerQueueAssigneeSelection = "all" | "mine" | "other" | "unassigned";

/** A GRO's normal queue is always assigned-only. Supervisory roles may use the
 * broader filters, subject to the underlying RLS-authorized scope. */
export function effectiveNormalQueueAssignee(
  role: string | undefined,
  selected: OfficerQueueAssigneeSelection,
): OfficerQueueAssigneeSelection {
  return role === "gro" ? "mine" : selected;
}

export function mayOpenNormalOfficerCase(
  role: string | undefined,
  userId: string | undefined,
  assignedOfficerId: string | null,
): boolean {
  return role !== "gro" || Boolean(userId && assignedOfficerId === userId);
}
