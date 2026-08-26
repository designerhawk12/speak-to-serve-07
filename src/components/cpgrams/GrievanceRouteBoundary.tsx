import type { ReactNode } from "react";

/** Renders either the grievance detail leaf or the currently matched child route. */
export function GrievanceRouteBoundary({
  isDetailRoute,
  detail,
  nestedRoute,
}: {
  isDetailRoute: boolean;
  detail: ReactNode;
  nestedRoute: ReactNode;
}) {
  return isDetailRoute ? detail : nestedRoute;
}
