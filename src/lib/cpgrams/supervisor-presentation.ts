import type {
  CaseEventRow,
  IssueClusterCollection,
  IssueClusterRow,
  OfficeAnalyticsData,
} from "./data-access";
import {
  isOriginalGovernmentProcessingActive,
  originalGovernmentProcessingEndedAt,
} from "./resolution-lifecycle";

const MEANINGFUL_GOVERNMENT_EVENT_TYPES = new Set([
  "DOCUMENT_REQUESTED",
  "CLARIFICATION_REQUESTED",
  "INTERIM_UPDATE_ADDED",
  "CASE_TRANSFERRED",
  "EVIDENCE_ATTACHED",
  "RESOLUTION_SUBMITTED",
]);

function percent(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function firstMeaningfulGovernmentEvent(events: CaseEventRow[]): CaseEventRow | undefined {
  return events.find(
    (event) =>
      event.actor_type === "officer" && MEANINGFUL_GOVERNMENT_EVENT_TYPES.has(event.event_type),
  );
}

export interface SupervisorMetrics {
  authorizedCaseCount: number;
  confirmedResolutionRate: number | null;
  slaComplianceRate: number | null;
  slaMeasuredCases: number;
  appealRate: number | null;
  citizenConfirmedUnresolvedRate: number | null;
  clarificationRate: number | null;
  averageTransfers: number | null;
  repeatGrievanceCount: number;
  firstMeaningfulResponseHours: number | null;
  criticalCaseCount: number;
  highPriorityCaseCount: number;
  systemicIssueCount: number;
}

/**
 * Builds a supervisor-facing snapshot from records already allowed by RLS.
 * It treats citizen confirmation as the resolution signal, never disposal.
 */
export function calculateSupervisorMetrics(
  analytics: OfficeAnalyticsData,
  clusters: IssueClusterCollection | undefined,
  now = new Date(),
): SupervisorMetrics {
  const { collection, events } = analytics;
  const grievances = collection.grievances;
  const total = grievances.length;
  const eventsByGrievance = events.reduce<Record<string, CaseEventRow[]>>((all, event) => {
    (all[event.grievance_id] ??= []).push(event);
    return all;
  }, {});
  const confirmed = grievances.filter(
    (grievance) => grievance.citizen_confirmation_state === "CONFIRMED_RESOLVED",
  ).length;
  const unresolved = grievances.filter((grievance) =>
    ["NOT_RESOLVED", "PARTIALLY_RESOLVED"].includes(grievance.citizen_confirmation_state),
  ).length;
  const clarification = grievances.filter((grievance) =>
    (collection.clarificationsByGrievance?.[grievance.id] ?? []).some(
      (request) => !request.fulfilled_at,
    ),
  ).length;
  const slaMeasured = grievances.filter(
    (grievance) =>
      grievance.sla_due_at && !collection.prioritiesByGrievance[grievance.id]?.waiting_on_citizen,
  );
  const onTime = slaMeasured.filter((grievance) => {
    const processingEndedAt = originalGovernmentProcessingEndedAt(grievance);
    const measuredAt = processingEndedAt ? new Date(processingEndedAt).getTime() : now.getTime();
    return new Date(grievance.sla_due_at!).getTime() >= measuredAt;
  }).length;
  const transferCount = events.filter((event) => event.event_type === "CASE_TRANSFERRED").length;
  const firstResponseHours = grievances.flatMap((grievance) => {
    const first = firstMeaningfulGovernmentEvent(eventsByGrievance[grievance.id] ?? []);
    const submittedAt = grievance.submitted_at ?? grievance.created_at;
    if (!first || !submittedAt) return [];
    return [
      Math.max(
        0,
        (new Date(first.created_at).getTime() - new Date(submittedAt).getTime()) / 3_600_000,
      ),
    ];
  });
  const repeatGrievanceIds = new Set(
    Object.values(clusters?.membersByCluster ?? {})
      .flat()
      .map((member) => member.grievance_id)
      .filter((grievanceId) =>
        Boolean(collection.grievances.find((grievance) => grievance.id === grievanceId)),
      ),
  );

  return {
    authorizedCaseCount: total,
    confirmedResolutionRate: percent(confirmed, total),
    slaComplianceRate: percent(onTime, slaMeasured.length),
    slaMeasuredCases: slaMeasured.length,
    appealRate: percent(
      grievances.filter(
        (grievance) => (collection.appealsByGrievance[grievance.id] ?? []).length > 0,
      ).length,
      total,
    ),
    citizenConfirmedUnresolvedRate: percent(unresolved, total),
    clarificationRate: percent(clarification, total),
    averageTransfers: total ? transferCount / total : null,
    repeatGrievanceCount: repeatGrievanceIds.size,
    firstMeaningfulResponseHours: average(firstResponseHours),
    criticalCaseCount: grievances.filter(
      (grievance) =>
        isOriginalGovernmentProcessingActive(
          grievance.administrative_state,
          grievance.citizen_confirmation_state,
        ) && collection.prioritiesByGrievance[grievance.id]?.priority_level === "CRITICAL",
    ).length,
    highPriorityCaseCount: grievances.filter(
      (grievance) =>
        isOriginalGovernmentProcessingActive(
          grievance.administrative_state,
          grievance.citizen_confirmation_state,
        ) && collection.prioritiesByGrievance[grievance.id]?.priority_level === "HIGH",
    ).length,
    systemicIssueCount: clusters?.clusters.length ?? 0,
  };
}

export interface SystemicIssueMetrics {
  organization: string;
  geography: string;
  accessibleCaseCount: number;
  averageAgeDays: number | null;
  unresolvedRate: number | null;
  appealRate: number | null;
}

/** Stored clusters are not inferred in the UI; all aggregates use accessible linked cases only. */
export function calculateSystemicIssueMetrics(
  cluster: IssueClusterRow,
  collection: IssueClusterCollection,
  now = new Date(),
): SystemicIssueMetrics {
  const cases = (collection.membersByCluster[cluster.id] ?? [])
    .map((member) => collection.grievancesById[member.grievance_id])
    .filter((grievance): grievance is NonNullable<typeof grievance> => Boolean(grievance));
  const ageDays = cases.map((grievance) =>
    Math.max(
      0,
      (now.getTime() - new Date(grievance.submitted_at ?? grievance.created_at).getTime()) /
        86_400_000,
    ),
  );
  const unresolved = cases.filter((grievance) =>
    ["NOT_RESOLVED", "PARTIALLY_RESOLVED"].includes(grievance.citizen_confirmation_state),
  ).length;
  const appealed = cases.filter(
    (grievance) => (collection.appealsByGrievance[grievance.id] ?? []).length > 0,
  ).length;
  const recordedPlaces = [
    ...new Set(
      cases
        .map(
          (grievance) => grievance.district_name ?? grievance.state_name ?? grievance.location_text,
        )
        .filter(Boolean),
    ),
  ];
  const organization = cluster.organization_id
    ? (collection.organizations[cluster.organization_id]?.name ?? "Organization not recorded")
    : "Cross-organization";
  const geography = recordedPlaces.length
    ? recordedPlaces.length === 1
      ? recordedPlaces[0]!
      : `${recordedPlaces[0]} + ${recordedPlaces.length - 1} more`
    : cluster.organization_id
      ? (collection.organizations[cluster.organization_id]?.state_name ?? "Not recorded")
      : "Not recorded";

  return {
    organization,
    geography,
    accessibleCaseCount: cases.length,
    averageAgeDays: average(ageDays),
    unresolvedRate: percent(unresolved, cases.length),
    appealRate: percent(appealed, cases.length),
  };
}

export function formatMetricPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export function formatMetricNumber(value: number | null, maximumFractionDigits = 1): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
}
