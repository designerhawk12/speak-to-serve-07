import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAppealWorkspace,
  getAuthorizedAppeals,
  getAuthorizedGrievancePage,
  getAuthorizedGrievances,
  getCitizenGrievances,
  getGrievanceWorkspace,
  getIssueClusters,
  getIntakeTaxonomy,
  getOfficeAnalytics,
  getPlatformAdminOverview,
  getNotifications,
  getProfile,
  markGrievanceOpened,
} from "./data-access";
import type { OfficerQueueFilters } from "./data-access";

export const cpgramsQueryKeys = {
  profile: (userId: string) => ["cpgrams", "profile", userId] as const,
  citizenGrievances: (userId: string) => ["cpgrams", "citizen-grievances", userId] as const,
  authorizedGrievances: ["cpgrams", "authorized-grievances"] as const,
  authorizedGrievancePage: (filters: OfficerQueueFilters) =>
    ["cpgrams", "authorized-grievance-page", filters] as const,
  grievance: (id: string) => ["cpgrams", "grievance", id] as const,
  notifications: (userId: string) => ["cpgrams", "notifications", userId] as const,
  authorizedAppeals: ["cpgrams", "authorized-appeals"] as const,
  appeal: (id: string) => ["cpgrams", "appeal", id] as const,
  issueClusters: ["cpgrams", "issue-clusters"] as const,
  officeAnalytics: ["cpgrams", "office-analytics"] as const,
  platformAdminOverview: ["cpgrams", "platform-admin-overview"] as const,
  intakeTaxonomy: ["cpgrams", "intake-taxonomy"] as const,
};

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: cpgramsQueryKeys.profile(userId ?? "unavailable"),
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useCitizenGrievancesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: cpgramsQueryKeys.citizenGrievances(userId ?? "unavailable"),
    queryFn: () => getCitizenGrievances(userId!),
    enabled: Boolean(userId),
  });
}

export function useAuthorizedGrievancesQuery() {
  return useQuery({
    queryKey: cpgramsQueryKeys.authorizedGrievances,
    queryFn: getAuthorizedGrievances,
  });
}

export function useAuthorizedGrievancePageQuery(filters: OfficerQueueFilters) {
  return useQuery({
    queryKey: cpgramsQueryKeys.authorizedGrievancePage(filters),
    queryFn: () => getAuthorizedGrievancePage(filters),
    placeholderData: (previous) => previous,
    enabled: Boolean(filters.currentUserId),
  });
}

export function useGrievanceWorkspaceQuery(id: string) {
  return useQuery({
    queryKey: cpgramsQueryKeys.grievance(id),
    queryFn: () => getGrievanceWorkspace(id),
  });
}

export function useMarkGrievanceOpenedMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markGrievanceOpened(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(id) }),
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.authorizedGrievances }),
      ]);
    },
  });
}

export function useNotificationsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: cpgramsQueryKeys.notifications(userId ?? "unavailable"),
    queryFn: () => getNotifications(userId!),
    enabled: Boolean(userId),
  });
}

export function useAuthorizedAppealsQuery() {
  return useQuery({ queryKey: cpgramsQueryKeys.authorizedAppeals, queryFn: getAuthorizedAppeals });
}

export function useAppealWorkspaceQuery(id: string) {
  return useQuery({ queryKey: cpgramsQueryKeys.appeal(id), queryFn: () => getAppealWorkspace(id) });
}

export function useIssueClustersQuery() {
  return useQuery({ queryKey: cpgramsQueryKeys.issueClusters, queryFn: getIssueClusters });
}

export function useOfficeAnalyticsQuery() {
  return useQuery({ queryKey: cpgramsQueryKeys.officeAnalytics, queryFn: getOfficeAnalytics });
}

export function usePlatformAdminOverviewQuery() {
  return useQuery({
    queryKey: cpgramsQueryKeys.platformAdminOverview,
    queryFn: getPlatformAdminOverview,
  });
}

export function useIntakeTaxonomyQuery() {
  return useQuery({
    queryKey: cpgramsQueryKeys.intakeTaxonomy,
    queryFn: getIntakeTaxonomy,
    staleTime: 5 * 60_000,
  });
}

export function queryErrorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown data-access error occurred.";
}
