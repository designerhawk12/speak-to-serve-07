import type { GrievanceInterpretation } from "./ai-contracts";

/** One centrally maintained presentation threshold; it does not make a routing decision. */
export const INTAKE_ROUTE_REVIEW_THRESHOLD = 0.65;

export type IntakeRouteAcceptance = "resolved" | "review" | "manual";

export function assessIntakeRoute(input: {
  interpretation: GrievanceInterpretation | null;
  categoryId: string | null;
  organizationId: string | null;
  fallbackUsed: boolean;
}): IntakeRouteAcceptance {
  if (input.fallbackUsed || !input.interpretation || !input.categoryId || !input.organizationId)
    return "manual";
  return input.interpretation.route_confidence < INTAKE_ROUTE_REVIEW_THRESHOLD
    ? "review"
    : "resolved";
}

/**
 * Re-validates the provider's IDs against the active taxonomy loaded by the
 * browser. A subcategory is optional; when present and active it is preferred.
 */
export function resolveActiveIntakeRoute(
  interpretation: GrievanceInterpretation,
  categories: { id: string; default_organization_id: string | null }[],
  organizations: { id: string }[],
): { categoryId: string | null; organizationId: string | null } {
  const subcategory = interpretation.suggested_subcategory_id
    ? categories.find((item) => item.id === interpretation.suggested_subcategory_id)
    : null;
  const category = interpretation.suggested_category_id
    ? categories.find((item) => item.id === interpretation.suggested_category_id)
    : null;
  const selectedCategory = subcategory ?? category ?? null;
  const directOrganization = interpretation.suggested_organization_id
    ? organizations.find((item) => item.id === interpretation.suggested_organization_id)
    : null;
  const defaultOrganization = selectedCategory?.default_organization_id
    ? organizations.find((item) => item.id === selectedCategory.default_organization_id)
    : null;
  return {
    categoryId: selectedCategory?.id ?? null,
    organizationId: directOrganization?.id ?? defaultOrganization?.id ?? null,
  };
}

export function intakeRouteNeedsReview(interpretation: GrievanceInterpretation | null): boolean {
  return (
    !interpretation ||
    interpretation.route_confidence < INTAKE_ROUTE_REVIEW_THRESHOLD ||
    !interpretation.suggested_organization_id ||
    !interpretation.suggested_category_id
  );
}

export function intakeFallbackMessage(): string {
  return "AI guidance is unavailable right now. You can continue by choosing the grievance type manually.";
}
