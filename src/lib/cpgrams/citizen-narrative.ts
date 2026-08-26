import type { CaseEventRow, GrievanceRow } from "./data-access";
import type { CitizenActionPresentation } from "./citizen-case";

export interface CitizenCaseNarrative {
  whereIsMyCase: string;
  whatHasHappened: string;
  whatIsHappeningNow: string;
  blocker: string;
  whatHappensNext: string;
  whatYouNeedToDo: string;
}

/**
 * Plain-language presentation derived only from persisted case facts. It must
 * never infer an unrecorded government action or merge the two outcome lanes.
 */
export function buildCitizenCaseNarrative({
  grievance,
  organizationName,
  events,
  action,
}: {
  grievance: GrievanceRow;
  organizationName: string | null | undefined;
  events: CaseEventRow[];
  action: CitizenActionPresentation;
}): CitizenCaseNarrative {
  const latestEvent = [...events]
    .filter((event) => event.citizen_visible)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  const administrativeState = grievance.administrative_state
    .replaceAll("_", " ")
    .toLocaleLowerCase();
  const governmentState = `The government workflow currently records this case as ${administrativeState}.`;
  const citizenState =
    grievance.citizen_confirmation_state === "CONFIRMED_RESOLVED"
      ? "You have confirmed that the problem is resolved."
      : grievance.citizen_confirmation_state === "PARTIALLY_RESOLVED"
        ? "You have recorded that the problem is only partly resolved."
        : grievance.citizen_confirmation_state === "NOT_RESOLVED"
          ? "You have recorded that the problem remains unresolved."
          : "You have not yet confirmed whether the real-world problem is resolved.";

  return {
    whereIsMyCase: organizationName
      ? `The current recorded owner is ${organizationName}.`
      : "A current government organization has not yet been recorded for this case.",
    whatHasHappened: latestEvent
      ? `Latest recorded update: ${latestEvent.title}${latestEvent.description ? `. ${latestEvent.description}` : "."}`
      : "No citizen-visible case event has been recorded yet.",
    whatIsHappeningNow: `${governmentState} ${citizenState}`,
    blocker: action.requiresAction ? action.description : "No blocker has been recorded.",
    whatHappensNext: action.requiresAction
      ? "After the requested information or confirmation is recorded, the next government update will appear in the case timeline."
      : "The next recorded government update will appear in the case timeline.",
    whatYouNeedToDo: action.requiresAction
      ? action.description
      : "No action is required from you right now.",
  };
}
