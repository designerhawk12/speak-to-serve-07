import { describe, expect, test } from "bun:test";
import {
  calculateSupervisorMetrics,
  calculateSystemicIssueMetrics,
} from "../src/lib/cpgrams/supervisor-presentation";
import type {
  CaseEventRow,
  GrievanceRow,
  IssueClusterCollection,
  IssueClusterRow,
  OfficeAnalyticsData,
} from "../src/lib/cpgrams/data-access";

const now = new Date("2026-08-26T12:00:00.000Z");
const grievance = (id: string, overrides: Partial<GrievanceRow> = {}) =>
  ({
    id,
    created_at: "2026-08-20T12:00:00.000Z",
    submitted_at: "2026-08-20T12:00:00.000Z",
    administrative_state: "UNDER_EXAMINATION",
    citizen_confirmation_state: "NOT_REQUESTED",
    sla_due_at: "2026-08-30T12:00:00.000Z",
    ...overrides,
  }) as GrievanceRow;

function analyticsData(): OfficeAnalyticsData {
  const confirmed = grievance("confirmed", { citizen_confirmation_state: "CONFIRMED_RESOLVED" });
  const disposed = grievance("disposed", {
    administrative_state: "DISPOSED",
    sla_due_at: "2026-08-24T12:00:00.000Z",
  });
  return {
    collection: {
      grievances: [confirmed, disposed],
      organizations: {},
      categories: {},
      appealsByGrievance: {},
      requestsByGrievance: {},
      requestItemsByRequest: {},
      prioritiesByGrievance: { disposed: { waiting_on_citizen: true } as never },
    },
    events: [
      {
        grievance_id: "confirmed",
        actor_type: "officer",
        event_type: "INTERIM_UPDATE_ADDED",
        created_at: "2026-08-21T12:00:00.000Z",
      } as CaseEventRow,
      {
        grievance_id: "confirmed",
        actor_type: "officer",
        event_type: "CASE_TRANSFERRED",
        created_at: "2026-08-22T12:00:00.000Z",
      } as CaseEventRow,
    ],
  };
}

describe("supervisor presentation metrics", () => {
  test("uses citizen confirmation rather than government disposal as resolution", () => {
    const metrics = calculateSupervisorMetrics(analyticsData(), undefined, now);

    expect(metrics.confirmedResolutionRate).toBe(50);
    expect(metrics.slaComplianceRate).toBe(100);
    expect(metrics.slaMeasuredCases).toBe(1);
    expect(metrics.firstMeaningfulResponseHours).toBe(24);
    expect(metrics.averageTransfers).toBe(0.5);
  });

  test("limits systemic aggregates to linked grievance rows visible under RLS", () => {
    const visible = grievance("visible", {
      submitted_at: "2026-08-16T12:00:00.000Z",
      citizen_confirmation_state: "NOT_RESOLVED",
      district_name: "Pune",
    });
    const cluster = { id: "cluster", organization_id: null, case_count: 7 } as IssueClusterRow;
    const collection = {
      clusters: [cluster],
      organizations: {},
      categories: {},
      membersByCluster: {
        cluster: [{ grievance_id: "visible" }, { grievance_id: "not-visible" }] as never,
      },
      grievancesById: { visible },
      appealsByGrievance: { visible: [{ id: "appeal" }] as never },
    } as IssueClusterCollection;

    const metrics = calculateSystemicIssueMetrics(cluster, collection, now);
    expect(metrics.accessibleCaseCount).toBe(1);
    expect(metrics.averageAgeDays).toBe(10);
    expect(metrics.unresolvedRate).toBe(100);
    expect(metrics.appealRate).toBe(100);
    expect(metrics.geography).toBe("Pune");
  });

  test("does not count terminal historical cases in active critical/high totals", () => {
    const terminal = grievance("terminal", {
      administrative_state: "RESOLUTION_PROVIDED",
      government_response_completed_at: "2026-08-23T12:00:00.000Z",
    });
    const analytics = analyticsData();
    analytics.collection.grievances.push(terminal);
    analytics.collection.prioritiesByGrievance.terminal = {
      priority_level: "CRITICAL",
      priority_score: 100,
    } as never;

    const metrics = calculateSupervisorMetrics(analytics, undefined, now);
    expect(metrics.criticalCaseCount).toBe(0);
  });
});
