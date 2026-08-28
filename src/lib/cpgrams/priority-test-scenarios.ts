import {
  calculatePriority,
  notificationAudience,
  type PriorityFacts,
  type PriorityLevel,
  type PriorityResult,
} from "./priority-engine";

export type PriorityTestScenarioId =
  | "P1_NORMAL"
  | "P2_UNOPENED_24H"
  | "P3_UNOPENED_48H"
  | "P4_INACTIVE_3D"
  | "P5_INACTIVE_7D"
  | "P6_SLA_50"
  | "P7_SLA_75"
  | "P8_SLA_90"
  | "P9_SLA_100"
  | "P10_WAITING_CITIZEN_7D"
  | "P11_REMINDER_1"
  | "P12_REMINDER_SPAM"
  | "P13_CRITICAL_ESCALATION"
  | "P14_RESOLVED_OLD";

export interface PriorityTestScenario {
  id: PriorityTestScenarioId;
  title: string;
  submittedHoursAgo: number;
  slaWindowHours: number;
  assignmentHoursAgo?: number;
  openedHoursAgo?: number;
  lastMeaningfulActionHoursAgo?: number;
  waitingOnCitizen?: boolean;
  reminderHoursAgo?: number[];
  terminalGovernmentResponse?: boolean;
  expected: {
    score: number;
    level: PriorityLevel;
    reasonIncludes: string;
  };
}

export const PRIORITY_TEST_SCENARIOS: readonly PriorityTestScenario[] = [
  {
    id: "P1_NORMAL",
    title: "Fresh assigned and opened case",
    submittedHoursAgo: 2,
    slaWindowHours: 240,
    assignmentHoursAgo: 2,
    openedHoursAgo: 1,
    lastMeaningfulActionHoursAgo: 1,
    expected: { score: 0, level: "NORMAL", reasonIncludes: "" },
  },
  {
    id: "P2_UNOPENED_24H",
    title: "Assigned for more than 24 hours and not opened",
    submittedHoursAgo: 96,
    slaWindowHours: 720,
    assignmentHoursAgo: 25,
    expected: { score: 20, level: "ELEVATED", reasonIncludes: "not opened for 25 hours" },
  },
  {
    id: "P3_UNOPENED_48H",
    title: "Assigned for more than 48 hours and not opened",
    submittedHoursAgo: 120,
    slaWindowHours: 720,
    assignmentHoursAgo: 49,
    expected: { score: 45, level: "HIGH", reasonIncludes: "not opened for 49 hours" },
  },
  {
    id: "P4_INACTIVE_3D",
    title: "Opened with no meaningful government action for more than 3 days",
    submittedHoursAgo: 144,
    slaWindowHours: 720,
    assignmentHoursAgo: 96,
    openedHoursAgo: 96,
    lastMeaningfulActionHoursAgo: 73,
    expected: {
      score: 20,
      level: "ELEVATED",
      reasonIncludes: "No meaningful government action for 3 days",
    },
  },
  {
    id: "P5_INACTIVE_7D",
    title: "Opened with no meaningful government action for more than 7 days",
    submittedHoursAgo: 240,
    slaWindowHours: 720,
    assignmentHoursAgo: 192,
    openedHoursAgo: 192,
    lastMeaningfulActionHoursAgo: 169,
    expected: {
      score: 45,
      level: "HIGH",
      reasonIncludes: "No meaningful government action for 7 days",
    },
  },
  {
    id: "P6_SLA_50",
    title: "50 percent of the government-response target elapsed",
    submittedHoursAgo: 120,
    slaWindowHours: 240,
    expected: { score: 10, level: "NORMAL", reasonIncludes: "at least 50% of SLA" },
  },
  {
    id: "P7_SLA_75",
    title: "75 percent of the government-response target elapsed",
    submittedHoursAgo: 180,
    slaWindowHours: 240,
    expected: { score: 25, level: "ELEVATED", reasonIncludes: "at least 75% of SLA" },
  },
  {
    id: "P8_SLA_90",
    title: "90 percent of the government-response target elapsed",
    submittedHoursAgo: 216,
    slaWindowHours: 240,
    expected: { score: 45, level: "HIGH", reasonIncludes: "at least 90% of SLA" },
  },
  {
    id: "P9_SLA_100",
    title: "Government-response target breached",
    submittedHoursAgo: 264,
    slaWindowHours: 240,
    expected: { score: 70, level: "CRITICAL", reasonIncludes: "SLA breached" },
  },
  {
    id: "P10_WAITING_CITIZEN_7D",
    title: "Required citizen document outstanding for 7 days",
    submittedHoursAgo: 240,
    slaWindowHours: 720,
    assignmentHoursAgo: 192,
    openedHoursAgo: 192,
    lastMeaningfulActionHoursAgo: 168,
    waitingOnCitizen: true,
    expected: {
      score: 0,
      level: "NORMAL",
      reasonIncludes: "Government inactivity escalation paused",
    },
  },
  {
    id: "P11_REMINDER_1",
    title: "One eligible citizen reminder",
    submittedHoursAgo: 24,
    slaWindowHours: 720,
    assignmentHoursAgo: 8,
    openedHoursAgo: 7,
    lastMeaningfulActionHoursAgo: 7,
    reminderHoursAgo: [1],
    expected: { score: 5, level: "NORMAL", reasonIncludes: "1 recent citizen reminder" },
  },
  {
    id: "P12_REMINDER_SPAM",
    title: "Many citizen reminders; deterministic contribution cap applies",
    submittedHoursAgo: 24,
    slaWindowHours: 720,
    assignmentHoursAgo: 8,
    openedHoursAgo: 7,
    lastMeaningfulActionHoursAgo: 7,
    reminderHoursAgo: [1, 2, 3, 4, 5, 6, 7, 8],
    expected: { score: 15, level: "NORMAL", reasonIncludes: "contribution capped at 15 points" },
  },
  {
    id: "P13_CRITICAL_ESCALATION",
    title: "SLA breach requiring GRO and Nodal attention",
    submittedHoursAgo: 264,
    slaWindowHours: 240,
    assignmentHoursAgo: 96,
    openedHoursAgo: 72,
    lastMeaningfulActionHoursAgo: 72,
    expected: { score: 90, level: "CRITICAL", reasonIncludes: "SLA breached" },
  },
  {
    id: "P14_RESOLVED_OLD",
    title: "Resolved historical case; active original-case escalation stopped",
    submittedHoursAgo: 2_880,
    slaWindowHours: 240,
    assignmentHoursAgo: 2_856,
    openedHoursAgo: 2_856,
    lastMeaningfulActionHoursAgo: 2_400,
    terminalGovernmentResponse: true,
    expected: {
      score: 0,
      level: "NORMAL",
      reasonIncludes: "Original government-processing phase is complete",
    },
  },
] as const;

export function hoursBefore(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 3_600_000);
}

export function priorityFactsForScenario(scenario: PriorityTestScenario, now: Date): PriorityFacts {
  const submittedAt = hoursBefore(now, scenario.submittedHoursAgo);
  return {
    now,
    submittedAt,
    slaDueAt: new Date(submittedAt.getTime() + scenario.slaWindowHours * 3_600_000),
    waitingOnCitizen: Boolean(scenario.waitingOnCitizen),
    recentReminderCount: scenario.reminderHoursAgo?.length ?? 0,
    relatedCaseCount: 0,
    hasActiveAppeal: false,
    ...(scenario.assignmentHoursAgo == null
      ? {}
      : { assignmentStartedAt: hoursBefore(now, scenario.assignmentHoursAgo) }),
    ...(scenario.openedHoursAgo == null
      ? {}
      : { openedAt: hoursBefore(now, scenario.openedHoursAgo) }),
    ...(scenario.lastMeaningfulActionHoursAgo == null
      ? {}
      : {
          lastMeaningfulGovernmentActionAt: hoursBefore(now, scenario.lastMeaningfulActionHoursAgo),
        }),
  };
}

export function priorityResultForScenario(
  scenario: PriorityTestScenario,
  now: Date,
): PriorityResult {
  if (scenario.terminalGovernmentResponse) {
    return {
      score: 0,
      level: "NORMAL" as const,
      reasons: [
        "Original government-processing phase is complete; active inactivity escalation is stopped",
      ],
      escalationLevel: 0 as const,
    };
  }
  return calculatePriority(priorityFactsForScenario(scenario, now));
}

export function priorityNotificationAudienceForScenario(scenario: PriorityTestScenario, now: Date) {
  return notificationAudience(priorityResultForScenario(scenario, now));
}
