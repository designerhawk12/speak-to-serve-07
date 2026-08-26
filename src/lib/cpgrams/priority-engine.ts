export type PriorityLevel = "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";

export interface PriorityEngineConfig {
  unopenedFirstHours: number;
  unopenedStrongHours: number;
  unopenedFirstPoints: number;
  unopenedStrongPoints: number;
  stalledFirstHours: number;
  stalledStrongHours: number;
  stalledFirstPoints: number;
  stalledStrongPoints: number;
  slaFirstPercent: number;
  slaElevatedPercent: number;
  slaHighPercent: number;
  slaBreachPercent: number;
  slaFirstPoints: number;
  slaElevatedPoints: number;
  slaHighPoints: number;
  slaBreachPoints: number;
  reminderPoints: number;
  reminderPointsCap: number;
  relatedCasePoints: number;
  activeAppealPoints: number;
  elevatedMinScore: number;
  highMinScore: number;
  criticalMinScore: number;
}

export const STARTING_PRIORITY_CONFIG: PriorityEngineConfig = {
  unopenedFirstHours: 24,
  unopenedStrongHours: 48,
  unopenedFirstPoints: 20,
  unopenedStrongPoints: 45,
  stalledFirstHours: 72,
  stalledStrongHours: 168,
  stalledFirstPoints: 20,
  stalledStrongPoints: 45,
  slaFirstPercent: 50,
  slaElevatedPercent: 75,
  slaHighPercent: 90,
  slaBreachPercent: 100,
  slaFirstPoints: 10,
  slaElevatedPoints: 25,
  slaHighPoints: 45,
  slaBreachPoints: 70,
  reminderPoints: 5,
  reminderPointsCap: 15,
  relatedCasePoints: 10,
  activeAppealPoints: 25,
  elevatedMinScore: 20,
  highMinScore: 45,
  criticalMinScore: 70,
};

export interface PriorityFacts {
  now: Date;
  submittedAt?: Date;
  slaDueAt?: Date;
  assignmentStartedAt?: Date;
  openedAt?: Date;
  lastMeaningfulGovernmentActionAt?: Date;
  waitingOnCitizen: boolean;
  recentReminderCount: number;
  relatedCaseCount: number;
  hasActiveAppeal: boolean;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
  reasons: string[];
  escalationLevel: 0 | 1 | 2;
  nextEscalationAt?: Date;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function elapsedHours(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / HOUR_MS);
}

function firstFuture(now: Date, candidates: Array<Date | undefined>): Date | undefined {
  return candidates
    .filter((candidate): candidate is Date => Boolean(candidate) && candidate!.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

/**
 * Pure reference implementation of the SQL rule contract. Runtime authority is
 * the scheduled Postgres evaluator; this function keeps the rule edge cases
 * deterministic and independently testable without granting browser write access.
 */
export function calculatePriority(
  facts: PriorityFacts,
  config: PriorityEngineConfig = STARTING_PRIORITY_CONFIG,
): PriorityResult {
  let score = 0;
  const reasons: string[] = [];
  const nextCandidates: Array<Date | undefined> = [];

  if (facts.assignmentStartedAt && !facts.openedAt && !facts.waitingOnCitizen) {
    const hours = elapsedHours(facts.assignmentStartedAt, facts.now);
    if (hours >= config.unopenedStrongHours) score += config.unopenedStrongPoints;
    else if (hours >= config.unopenedFirstHours) score += config.unopenedFirstPoints;
    if (hours >= config.unopenedFirstHours) reasons.push(`Assigned but not opened for ${hours} hours`);
    nextCandidates.push(
      new Date(facts.assignmentStartedAt.getTime() + config.unopenedFirstHours * HOUR_MS),
      new Date(facts.assignmentStartedAt.getTime() + config.unopenedStrongHours * HOUR_MS),
    );
  }

  const actionAnchor = facts.openedAt
    ? new Date(
        Math.max(
          facts.openedAt.getTime(),
          facts.lastMeaningfulGovernmentActionAt?.getTime() ?? facts.openedAt.getTime(),
        ),
      )
    : undefined;
  if (actionAnchor && !facts.waitingOnCitizen) {
    const hours = elapsedHours(actionAnchor, facts.now);
    if (hours >= config.stalledStrongHours) score += config.stalledStrongPoints;
    else if (hours >= config.stalledFirstHours) score += config.stalledFirstPoints;
    if (hours >= config.stalledFirstHours) {
      reasons.push(`No meaningful government action for ${Math.floor(hours / 24)} days`);
    }
    nextCandidates.push(
      new Date(actionAnchor.getTime() + config.stalledFirstHours * HOUR_MS),
      new Date(actionAnchor.getTime() + config.stalledStrongHours * HOUR_MS),
    );
  }

  if (facts.waitingOnCitizen) {
    reasons.push("Government inactivity escalation paused while required citizen action is outstanding");
  }

  let slaPercent: number | undefined;
  if (facts.submittedAt && facts.slaDueAt && facts.slaDueAt > facts.submittedAt) {
    const targetMs = facts.slaDueAt.getTime() - facts.submittedAt.getTime();
    slaPercent = (100 * (facts.now.getTime() - facts.submittedAt.getTime())) / targetMs;
    const elapsedDays = Math.max(0, Math.floor((facts.now.getTime() - facts.submittedAt.getTime()) / DAY_MS));
    const targetDays = Math.max(1, Math.ceil(targetMs / DAY_MS));
    if (slaPercent >= config.slaBreachPercent) {
      score += config.slaBreachPoints;
      reasons.push(`SLA breached: ${elapsedDays} of ${targetDays} target days elapsed`);
    } else if (slaPercent >= config.slaHighPercent) {
      score += config.slaHighPoints;
      reasons.push(`${elapsedDays} of ${targetDays} target days elapsed (at least ${config.slaHighPercent}% of SLA)`);
    } else if (slaPercent >= config.slaElevatedPercent) {
      score += config.slaElevatedPoints;
      reasons.push(`${elapsedDays} of ${targetDays} target days elapsed (at least ${config.slaElevatedPercent}% of SLA)`);
    } else if (slaPercent >= config.slaFirstPercent) {
      score += config.slaFirstPoints;
      reasons.push(`${elapsedDays} of ${targetDays} target days elapsed (at least ${config.slaFirstPercent}% of SLA)`);
    }
    nextCandidates.push(
      new Date(facts.submittedAt.getTime() + targetMs * (config.slaFirstPercent / 100)),
      new Date(facts.submittedAt.getTime() + targetMs * (config.slaElevatedPercent / 100)),
      new Date(facts.submittedAt.getTime() + targetMs * (config.slaHighPercent / 100)),
      facts.slaDueAt,
    );
  }

  const reminderPoints = Math.min(
    Math.max(0, facts.recentReminderCount) * config.reminderPoints,
    config.reminderPointsCap,
  );
  if (reminderPoints > 0) {
    score += reminderPoints;
    reasons.push(
      `${facts.recentReminderCount} recent citizen reminder${facts.recentReminderCount === 1 ? "" : "s"} (contribution capped at ${config.reminderPointsCap} points)`,
    );
  }
  if (facts.relatedCaseCount > 0) {
    score += config.relatedCasePoints;
    reasons.push(
      `${facts.relatedCaseCount} related grievance${facts.relatedCaseCount === 1 ? "" : "s"} indicate a repeated issue`,
    );
  }
  if (facts.hasActiveAppeal) {
    score += config.activeAppealPoints;
    reasons.push("An active appeal requires senior review attention");
  }

  score = Math.min(100, Math.max(0, score));
  const breached = slaPercent != null && slaPercent >= config.slaBreachPercent;
  const level: PriorityLevel =
    breached || score >= config.criticalMinScore
      ? "CRITICAL"
      : score >= config.highMinScore
        ? "HIGH"
        : score >= config.elevatedMinScore
          ? "ELEVATED"
          : "NORMAL";

  const nextEscalationAt = firstFuture(facts.now, nextCandidates);
  return {
    score,
    level,
    reasons,
    escalationLevel: level === "CRITICAL" ? 2 : level === "HIGH" ? 1 : 0,
    ...(nextEscalationAt ? { nextEscalationAt } : {}),
  };
}

export type PriorityNotificationAudience = "RESPONSIBLE_OFFICER" | "NODAL_SUPERVISOR";

export function notificationAudience(result: PriorityResult): PriorityNotificationAudience[] {
  if (result.level === "CRITICAL") return ["RESPONSIBLE_OFFICER", "NODAL_SUPERVISOR"];
  if (result.level === "HIGH") return ["RESPONSIBLE_OFFICER"];
  return [];
}

export const PRIORITY_RANK: Record<PriorityLevel, number> = {
  NORMAL: 0,
  ELEVATED: 1,
  HIGH: 2,
  CRITICAL: 3,
};
