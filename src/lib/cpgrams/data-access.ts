import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  resolutionConfirmDebug,
  resolutionConfirmError,
  safeResolutionErrorContext,
} from "./resolution-debug";
import { queueRange } from "./officer-assignment";

type Tables = Database["public"]["Tables"];
export type TableRow<Name extends keyof Tables> = Tables[Name]["Row"];

export type ProfileRow = TableRow<"profiles">;
export type GrievanceRow = TableRow<"grievances">;
export type GrievancePriorityRow = TableRow<"grievance_priorities">;
export type CaseEventRow = TableRow<"case_events">;
export type DocumentRow = TableRow<"documents">;
export type DocumentRequestRow = TableRow<"document_requests">;
export type DocumentRequestItemRow = TableRow<"document_request_items">;
export type ClarificationRequestRow = TableRow<"clarification_requests">;
export type MessageRow = TableRow<"messages">;
export type ResolutionRow = TableRow<"resolutions">;
export type FeedbackRow = TableRow<"feedback">;
export type AppealRow = TableRow<"appeals">;
export type AppealEventRow = TableRow<"appeal_events">;
export type NotificationRow = TableRow<"notifications">;
export type IssueClusterRow = TableRow<"issue_clusters">;
export type IssueClusterMemberRow = TableRow<"issue_cluster_members">;
export type AiRunRow = TableRow<"ai_runs">;
export type OrganizationRow = TableRow<"organizations">;
export type GrievanceCategoryRow = TableRow<"grievance_categories">;

export interface IntakeTaxonomy {
  organizations: OrganizationRow[];
  categories: GrievanceCategoryRow[];
}

export interface GrievanceCollection {
  grievances: GrievanceRow[];
  organizations: Record<string, OrganizationRow>;
  categories: Record<string, GrievanceCategoryRow>;
  appealsByGrievance: Record<string, AppealRow[]>;
  requestsByGrievance: Record<string, DocumentRequestRow[]>;
  requestItemsByRequest: Record<string, DocumentRequestItemRow[]>;
  clarificationsByGrievance: Record<string, ClarificationRequestRow[]>;
  prioritiesByGrievance: Record<string, GrievancePriorityRow>;
}

export type OfficerQueueAssigneeFilter = "all" | "mine" | "other" | "unassigned";

export interface OfficerQueueFilters {
  page: number;
  pageSize: number;
  search?: string;
  priority?: Database["public"]["Enums"]["priority_level"];
  administrativeState?: Database["public"]["Enums"]["administrative_state"];
  organizationId?: string;
  location?: string;
  assignee?: OfficerQueueAssigneeFilter;
  currentUserId: string;
  appealAttention?: boolean;
}

export interface AuthorizedGrievancePage extends GrievanceCollection {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GrievanceWorkspace {
  grievance: GrievanceRow;
  organization: OrganizationRow | null;
  category: GrievanceCategoryRow | null;
  events: CaseEventRow[];
  documents: DocumentRow[];
  documentRequests: DocumentRequestRow[];
  documentRequestItems: DocumentRequestItemRow[];
  clarificationRequests: ClarificationRequestRow[];
  messages: MessageRow[];
  resolutions: ResolutionRow[];
  feedback: FeedbackRow[];
  appeals: AppealRow[];
  priority: GrievancePriorityRow | null;
}

export interface AppealCollection {
  appeals: AppealRow[];
  grievances: Record<string, GrievanceRow>;
  organizations: Record<string, OrganizationRow>;
}

export interface AppealWorkspace {
  appeal: AppealRow;
  appealEvents: AppealEventRow[];
  grievanceWorkspace: GrievanceWorkspace;
}

export interface IssueClusterCollection {
  clusters: IssueClusterRow[];
  organizations: Record<string, OrganizationRow>;
  categories: Record<string, GrievanceCategoryRow>;
  membersByCluster: Record<string, IssueClusterMemberRow[]>;
  grievancesById: Record<string, GrievanceRow>;
  appealsByGrievance: Record<string, AppealRow[]>;
}

export interface OfficeAnalyticsData {
  collection: GrievanceCollection;
  events: CaseEventRow[];
}

/** Read-only platform reference and audit surfaces. RLS determines audit visibility. */
export interface PlatformAdminOverview {
  organizations: OrganizationRow[];
  categories: GrievanceCategoryRow[];
  aiRuns: AiRunRow[];
}

function throwIfError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function groupBy<T>(rows: T[], key: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((groups, row) => {
    const groupKey = key(row);
    (groups[groupKey] ??= []).push(row);
    return groups;
  }, {});
}

function indexBy<T>(rows: T[], key: (row: T) => string): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [key(row), row]));
}

async function getOrganizations(
  ids: Array<string | null>,
): Promise<Record<string, OrganizationRow>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (uniqueIds.length === 0) return {};
  const { data, error } = await supabase.from("organizations").select("*").in("id", uniqueIds);
  throwIfError(error, "Unable to load organizations");
  return indexBy(data ?? [], (row) => row.id);
}

async function getCategories(
  ids: Array<string | null>,
): Promise<Record<string, GrievanceCategoryRow>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (uniqueIds.length === 0) return {};
  const { data, error } = await supabase
    .from("grievance_categories")
    .select("*")
    .in("id", uniqueIds);
  throwIfError(error, "Unable to load grievance categories");
  return indexBy(data ?? [], (row) => row.id);
}

async function enrichGrievances(grievances: GrievanceRow[]): Promise<GrievanceCollection> {
  const grievanceIds = grievances.map((row) => row.id);
  const organizationsPromise = getOrganizations(grievances.map((row) => row.organization_id));
  const categoriesPromise = getCategories(grievances.map((row) => row.category_id));

  if (grievanceIds.length === 0) {
    const [organizations, categories] = await Promise.all([
      organizationsPromise,
      categoriesPromise,
    ]);
    return {
      grievances,
      organizations,
      categories,
      appealsByGrievance: {},
      requestsByGrievance: {},
      requestItemsByRequest: {},
      clarificationsByGrievance: {},
      prioritiesByGrievance: {},
    };
  }

  const [
    organizations,
    categories,
    appealsResult,
    requestsResult,
    clarificationsResult,
    prioritiesResult,
  ] = await Promise.all([
    organizationsPromise,
    categoriesPromise,
    supabase
      .from("appeals")
      .select("*")
      .in("grievance_id", grievanceIds)
      .order("filed_at", { ascending: false }),
    supabase
      .from("document_requests")
      .select("*")
      .in("grievance_id", grievanceIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("clarification_requests")
      .select("*")
      .in("grievance_id", grievanceIds)
      .order("requested_at", { ascending: false }),
    supabase.from("grievance_priorities").select("*").in("grievance_id", grievanceIds),
  ]);
  throwIfError(appealsResult.error, "Unable to load grievance appeals");
  throwIfError(requestsResult.error, "Unable to load document requests");
  throwIfError(clarificationsResult.error, "Unable to load clarification requests");
  throwIfError(prioritiesResult.error, "Unable to load grievance priorities");
  const requestIds = (requestsResult.data ?? []).map((request) => request.id);
  let requestItems: DocumentRequestItemRow[] = [];
  if (requestIds.length > 0) {
    const { data, error } = await supabase
      .from("document_request_items")
      .select("*")
      .in("request_id", requestIds)
      .order("created_at", { ascending: true });
    throwIfError(error, "Unable to load document request items");
    requestItems = data ?? [];
  }

  return {
    grievances,
    organizations,
    categories,
    appealsByGrievance: groupBy(appealsResult.data ?? [], (row) => row.grievance_id),
    requestsByGrievance: groupBy(requestsResult.data ?? [], (row) => row.grievance_id),
    requestItemsByRequest: groupBy(requestItems, (row) => row.request_id),
    clarificationsByGrievance: groupBy(clarificationsResult.data ?? [], (row) => row.grievance_id),
    prioritiesByGrievance: indexBy(prioritiesResult.data ?? [], (row) => row.grievance_id),
  };
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  throwIfError(error, "Unable to load profile");
  return data;
}

/** Public reference taxonomy used only after a citizen has described the issue. */
export async function getIntakeTaxonomy(): Promise<IntakeTaxonomy> {
  const pageSize = 500;
  async function loadAllActiveOrganizations(): Promise<OrganizationRow[]> {
    const records: OrganizationRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .order("id")
        .range(from, from + pageSize - 1);
      throwIfError(error, "Unable to load government organizations");
      records.push(...(data ?? []));
      if ((data?.length ?? 0) < pageSize) return records;
    }
  }

  async function loadAllActiveCategories(): Promise<GrievanceCategoryRow[]> {
    const records: GrievanceCategoryRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("grievance_categories")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .order("id")
        .range(from, from + pageSize - 1);
      throwIfError(error, "Unable to load grievance categories");
      records.push(...(data ?? []));
      if ((data?.length ?? 0) < pageSize) return records;
    }
  }

  const [organizations, categories] = await Promise.all([
    loadAllActiveOrganizations(),
    loadAllActiveCategories(),
  ]);
  return { organizations, categories };
}

export interface SubmitNewGrievanceInput {
  citizenId: string;
  submissionKey: string;
  originalText: string;
  shortTitle: string;
  requestedOutcome: string;
  urgency: Database["public"]["Enums"]["urgency_level"];
  categoryId: string | null;
  organizationId: string | null;
  location: string;
  originalLanguage: string;
  categorySlaDays?: number;
}

/**
 * Inserts once per citizen submission key. A database trigger records the
 * immutable GRIEVANCE_SUBMITTED event, including during retries.
 */
export async function submitNewGrievance(input: SubmitNewGrievanceInput): Promise<GrievanceRow> {
  const submittedAt = new Date();
  const slaDueAt =
    input.categorySlaDays == null
      ? null
      : new Date(submittedAt.getTime() + input.categorySlaDays * 86_400_000).toISOString();
  const values: Database["public"]["Tables"]["grievances"]["Insert"] = {
    citizen_id: input.citizenId,
    submission_key: input.submissionKey,
    original_text: input.originalText,
    original_language: input.originalLanguage,
    short_title: input.shortTitle,
    requested_outcome: input.requestedOutcome || null,
    urgency: input.urgency,
    category_id: input.categoryId,
    organization_id: input.organizationId,
    location_text: input.location || null,
    appellate_organization_id: "d3000000-0000-4000-8000-000000000005",
    administrative_state: "SUBMITTED",
    outcome_state: "UNKNOWN",
    citizen_confirmation_state: "NOT_REQUESTED",
    submitted_at: submittedAt.toISOString(),
    sla_due_at: slaDueAt,
  };
  const { data, error } = await supabase
    .from("grievances")
    .insert(values)
    .select("*")
    .maybeSingle();
  if (!error && data) return data;
  if (error?.code !== "23505")
    throw new Error(`Unable to submit grievance: ${error?.message ?? "No grievance row returned"}`);

  const { data: existing, error: existingError } = await supabase
    .from("grievances")
    .select("*")
    .eq("citizen_id", input.citizenId)
    .eq("submission_key", input.submissionKey)
    .maybeSingle();
  throwIfError(existingError, "Unable to restore submitted grievance");
  if (!existing)
    throw new Error("Your submission may have been received, but it could not be restored safely.");
  return existing;
}

export async function getCitizenGrievances(userId: string): Promise<GrievanceCollection> {
  const { data, error } = await supabase
    .from("grievances")
    .select("*")
    .eq("citizen_id", userId)
    .order("submitted_at", { ascending: false });
  throwIfError(error, "Unable to load your grievances");
  return enrichGrievances(data ?? []);
}

/** RLS defines the signed-in officer's organization/tree/appellate case scope. */
export async function getAuthorizedGrievances(): Promise<GrievanceCollection> {
  const { data, error } = await supabase
    .from("grievances")
    .select("*")
    .order("submitted_at", { ascending: false });
  throwIfError(error, "Unable to load authorized grievances");
  return enrichGrievances(data ?? []);
}

/** Bounded, query-filtered queue. The security-invoker view preserves the
 * underlying grievance and priority RLS policies. */
export async function getAuthorizedGrievancePage(
  filters: OfficerQueueFilters,
): Promise<AuthorizedGrievancePage> {
  const { pageSize, page, from, to } = queueRange(filters.page, filters.pageSize);
  let query = supabase.from("officer_case_queue").select("*", { count: "exact" });

  const search = filters.search?.trim().toLocaleLowerCase();
  if (search) query = query.ilike("search_text", `%${search}%`);
  if (filters.priority) query = query.eq("priority_level", filters.priority);
  if (filters.administrativeState)
    query = query.eq("administrative_state", filters.administrativeState);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.location?.trim())
    query = query.ilike("location_text", `%${filters.location.trim()}%`);
  if (filters.assignee === "mine") query = query.eq("assigned_officer_id", filters.currentUserId);
  if (filters.assignee === "unassigned") query = query.is("assigned_officer_id", null);
  if (filters.assignee === "other")
    query = query
      .not("assigned_officer_id", "is", null)
      .neq("assigned_officer_id", filters.currentUserId);
  if (filters.appealAttention) query = query.eq("has_appeal_attention", true);

  const { data, error, count } = await query
    .order("priority_score", { ascending: false })
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);
  throwIfError(error, "Unable to load the authorized case page");

  const grievances = (data ?? []).map((queueRow) => {
    const {
      category_name: _categoryName,
      organization_name: _organizationName,
      priority_level: _priorityLevel,
      priority_reasons: _priorityReasons,
      priority_score: _priorityScore,
      waiting_on_citizen: _waitingOnCitizen,
      last_meaningful_government_action_at: _lastMeaningfulAction,
      search_text: _searchText,
      has_appeal_attention: _hasAppealAttention,
      ...grievance
    } = queueRow;
    return grievance as GrievanceRow;
  });
  const collection = await enrichGrievances(grievances);
  const totalCount = count ?? 0;
  return {
    ...collection,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/** Supervisory metrics use the same RLS-authorized case collection as the office queue. */
export async function getOfficeAnalytics(): Promise<OfficeAnalyticsData> {
  const collection = await getAuthorizedGrievances();
  const grievanceIds = collection.grievances.map((grievance) => grievance.id);
  if (grievanceIds.length === 0) return { collection, events: [] };

  const { data, error } = await supabase
    .from("case_events")
    .select("*")
    .in("grievance_id", grievanceIds)
    .order("created_at", { ascending: true });
  throwIfError(error, "Unable to load authorized case events for analytics");
  return { collection, events: data ?? [] };
}

export async function getGrievanceWorkspace(
  grievanceId: string,
): Promise<GrievanceWorkspace | null> {
  const grievanceResult = await supabase
    .from("grievances")
    .select("*")
    .eq("id", grievanceId)
    .maybeSingle();
  throwIfError(grievanceResult.error, "Unable to load grievance");
  if (!grievanceResult.data) return null;

  const [
    organizations,
    categories,
    events,
    documents,
    requests,
    clarifications,
    messages,
    resolutions,
    feedback,
    appeals,
    priority,
  ] = await Promise.all([
    getOrganizations([grievanceResult.data.organization_id]),
    getCategories([grievanceResult.data.category_id]),
    supabase
      .from("case_events")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_requests")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("clarification_requests")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("resolutions")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("feedback")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("appeals")
      .select("*")
      .eq("grievance_id", grievanceId)
      .order("filed_at", { ascending: false }),
    supabase.from("grievance_priorities").select("*").eq("grievance_id", grievanceId).maybeSingle(),
  ]);
  throwIfError(events.error, "Unable to load case events");
  throwIfError(documents.error, "Unable to load documents");
  throwIfError(requests.error, "Unable to load document requests");
  throwIfError(clarifications.error, "Unable to load clarification requests");
  throwIfError(messages.error, "Unable to load messages");
  throwIfError(resolutions.error, "Unable to load resolutions");
  throwIfError(feedback.error, "Unable to load feedback");
  throwIfError(appeals.error, "Unable to load appeals");
  throwIfError(priority.error, "Unable to load grievance priority");

  const requestIds = (requests.data ?? []).map((request) => request.id);
  let documentRequestItems: DocumentRequestItemRow[] = [];
  if (requestIds.length > 0) {
    const itemsResult = await supabase
      .from("document_request_items")
      .select("*")
      .in("request_id", requestIds)
      .order("created_at", { ascending: true });
    throwIfError(itemsResult.error, "Unable to load document request items");
    documentRequestItems = itemsResult.data ?? [];
  }

  return {
    grievance: grievanceResult.data,
    organization: grievanceResult.data.organization_id
      ? (organizations[grievanceResult.data.organization_id] ?? null)
      : null,
    category: grievanceResult.data.category_id
      ? (categories[grievanceResult.data.category_id] ?? null)
      : null,
    events: events.data ?? [],
    documents: uniqueDocuments(documents.data ?? []),
    documentRequests: requests.data ?? [],
    documentRequestItems,
    clarificationRequests: clarifications.data ?? [],
    messages: messages.data ?? [],
    resolutions: resolutions.data ?? [],
    feedback: feedback.data ?? [],
    appeals: appeals.data ?? [],
    priority: priority.data,
  };
}

/** Records the first authorized officer view once; repeated calls are idempotent. */
export async function markGrievanceOpened(grievanceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("officer_mark_grievance_opened", {
    p_grievance_id: grievanceId,
  });
  throwIfError(error, "Unable to record that the case was opened");
  if (!data)
    throw new Error("Unable to record that the case was opened: no timestamp was returned.");
  return data;
}

export interface CitizenDocumentUploadInput {
  grievanceId: string;
  userId: string;
  file: File;
  requestItemId?: string;
  docKind?: string;
  /** Reuse this key when retrying the same user action. Request items use their
   * stable ID automatically, so rapid clicks and interrupted retries converge. */
  uploadIdempotencyKey?: string;
}

export function storageObjectAlreadyExists(
  error: {
    message?: string | undefined;
    error?: string | undefined;
    statusCode?: string | number | undefined;
    status?: number | undefined;
  } | null,
): boolean {
  if (!error) return false;
  return (
    error.statusCode === 409 ||
    error.status === 409 ||
    /already exists|already_exists|resourcealreadyexists/i.test(
      `${error.error ?? ""} ${error.message ?? ""}`,
    )
  );
}

export function uniqueDocuments(documents: DocumentRow[]): DocumentRow[] {
  const seen = new Set<string>();
  return documents.filter((document) => {
    if (seen.has(document.id)) return false;
    seen.add(document.id);
    return true;
  });
}

/**
 * Uploads a private object under a stable action key, then atomically records the
 * metadata, requested-item relation, completion state, and immutable event. No
 * service-role access or Storage overwrite is used.
 */
export async function uploadCitizenDocument({
  grievanceId,
  userId,
  file,
  requestItemId,
  docKind,
  uploadIdempotencyKey,
}: CitizenDocumentUploadInput): Promise<DocumentRow> {
  if (file.size === 0) throw new Error("Choose a non-empty file to upload.");
  if (file.size > 6 * 1024 * 1024)
    throw new Error("Files larger than 6 MB are not supported in this upload flow.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "document";
  const idempotencyKey = requestItemId ?? uploadIdempotencyKey ?? crypto.randomUUID();
  const storagePath = `${userId}/${grievanceId}/${idempotencyKey}-${safeName}`;
  const uploadOptions = { upsert: false, ...(file.type ? { contentType: file.type } : {}) };
  const { data: storageData, error: storageError } = await supabase.storage
    .from("grievance-documents")
    .upload(storagePath, file, uploadOptions);
  if (storageError && !storageObjectAlreadyExists(storageError)) {
    throwIfError(storageError, "Unable to upload file");
  }
  const persistedPath = storageData?.path ?? storagePath;

  const { data: documentId, error: finalizeError } = await supabase.rpc(
    "citizen_finalize_document_upload",
    {
      p_grievance_id: grievanceId,
      p_storage_path: persistedPath,
      p_file_name: file.name,
      p_mime_type: file.type || "",
      p_size_bytes: file.size,
      p_upload_idempotency_key: idempotencyKey,
      ...(requestItemId ? { p_request_item_id: requestItemId } : {}),
      p_doc_kind: docKind ?? "citizen_evidence",
    },
  );
  throwIfError(finalizeError, "Unable to record uploaded document");
  if (!documentId)
    throw new Error("Unable to record uploaded document: no document ID was returned.");

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();
  throwIfError(documentError, "Unable to load the recorded document");
  if (!document) throw new Error("Unable to load the recorded document.");
  return document;
}

export interface OfficerChecklistItem {
  label: string;
  description: string;
  isRequired: boolean;
}

export async function requestOfficerDocuments(input: {
  grievanceId: string;
  instructions: string;
  dueAt: string | null;
  items: OfficerChecklistItem[];
}): Promise<string> {
  const { data, error } = await supabase.rpc("officer_request_documents", {
    p_grievance_id: input.grievanceId,
    p_instructions: input.instructions,
    p_due_at: input.dueAt as string,
    p_items: input.items.map((item) => ({
      label: item.label,
      description: item.description,
      is_required: item.isRequired,
    })),
  });
  throwIfError(error, "Unable to request documents");
  if (!data) throw new Error("Unable to request documents: request ID was not returned.");
  return data;
}

export async function requestOfficerClarification(
  grievanceId: string,
  instructions: string,
): Promise<void> {
  const { error } = await supabase.rpc("officer_request_clarification", {
    p_grievance_id: grievanceId,
    p_instructions: instructions,
  });
  throwIfError(error, "Unable to request clarification");
}

export async function respondToCitizenClarification(input: {
  clarificationRequestId: string;
  response: string;
  documentId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("citizen_respond_to_clarification", {
    p_clarification_request_id: input.clarificationRequestId,
    p_response: input.response,
    ...(input.documentId ? { p_document_id: input.documentId } : {}),
  });
  throwIfError(error, "Unable to save your clarification response");
}

export interface CitizenReminderStatus {
  eligible: boolean;
  waitingOnCitizen: boolean;
  lastReminderAt: string | null;
  nextReminderAt: string | null;
  recentReminderCount: number;
  priorityContribution: number;
  priorityContributionCap: number;
  reason: string | null;
}

function parseCitizenReminderStatus(value: unknown): CitizenReminderStatus {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    eligible: record["eligible"] === true,
    waitingOnCitizen: record["waiting_on_citizen"] === true,
    lastReminderAt:
      typeof record["last_reminder_at"] === "string" ? record["last_reminder_at"] : null,
    nextReminderAt:
      typeof record["next_reminder_at"] === "string" ? record["next_reminder_at"] : null,
    recentReminderCount:
      typeof record["recent_reminder_count"] === "number" ? record["recent_reminder_count"] : 0,
    priorityContribution:
      typeof record["priority_contribution"] === "number" ? record["priority_contribution"] : 0,
    priorityContributionCap:
      typeof record["priority_contribution_cap"] === "number"
        ? record["priority_contribution_cap"]
        : 0,
    reason: typeof record["reason"] === "string" ? record["reason"] : null,
  };
}

export async function getCitizenReminderStatus(
  grievanceId: string,
): Promise<CitizenReminderStatus> {
  const { data, error } = await supabase.rpc("citizen_reminder_status", {
    p_grievance_id: grievanceId,
  });
  throwIfError(error, "Unable to check reminder availability");
  return parseCitizenReminderStatus(data);
}

export async function sendCitizenReminder(
  grievanceId: string,
  message: string,
): Promise<CitizenReminderStatus> {
  const { data, error } = await supabase.rpc("citizen_send_reminder", {
    p_grievance_id: grievanceId,
    p_message: message,
  });
  throwIfError(error, "Unable to send reminder");
  return parseCitizenReminderStatus(data);
}

export async function addOfficerInterimUpdate(input: {
  grievanceId: string;
  actionCompleted: string;
  currentBlocker: string;
  expectedNextStep: string;
  expectedDate: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("officer_add_interim_update", {
    p_grievance_id: input.grievanceId,
    p_action_completed: input.actionCompleted,
    p_current_blocker: input.currentBlocker,
    p_expected_next_step: input.expectedNextStep,
    p_expected_date: input.expectedDate as string,
  });
  throwIfError(error, "Unable to add interim update");
  if (!data) throw new Error("Unable to add interim update: record ID was not returned.");
  return data;
}

export async function transferOfficerGrievance(input: {
  grievanceId: string;
  organizationId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc("officer_transfer_grievance", {
    p_grievance_id: input.grievanceId,
    p_organization_id: input.organizationId,
    p_reason: input.reason,
  });
  throwIfError(error, "Unable to transfer grievance");
}

export async function flagOfficerWrongRoute(input: {
  grievanceId: string;
  reason: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("officer_flag_wrong_route", {
    p_grievance_id: input.grievanceId,
    p_reason: input.reason,
  });
  throwIfError(error, "Unable to flag grievance for transfer");
  if (!data) throw new Error("Unable to flag grievance for transfer: deadline was not returned.");
  return data;
}

export async function submitOfficerResolution(input: {
  grievanceId: string;
  actionTaken: string;
  outcomeAchieved: string;
  citizenNextStep: string;
  narrative: string;
  partialReason: string;
  evidenceReference: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("officer_submit_resolution", {
    p_grievance_id: input.grievanceId,
    p_action_taken: input.actionTaken,
    p_outcome_achieved: input.outcomeAchieved,
    p_citizen_next_step: input.citizenNextStep,
    p_resolution_narrative: input.narrative,
    p_partial_or_unresolved_reason: input.partialReason,
    p_evidence_reference: input.evidenceReference,
  });
  throwIfError(error, "Unable to submit resolution");
  if (!data) throw new Error("Unable to submit resolution: record ID was not returned.");
  return data;
}

export async function closeOfficerGrievance(grievanceId: string): Promise<void> {
  const { error } = await supabase.rpc("officer_close_grievance", {
    p_grievance_id: grievanceId,
  });
  throwIfError(error, "Unable to close case");
}

/** Officer evidence uses a new private object path and remains subject to Storage and table RLS. */
export async function uploadOfficerEvidence(input: {
  grievanceId: string;
  userId: string;
  file: File;
  citizenVisible: boolean;
}): Promise<DocumentRow> {
  if (input.file.size === 0) throw new Error("Choose a non-empty file to upload.");
  if (input.file.size > 6 * 1024 * 1024)
    throw new Error("Files larger than 6 MB are not supported in this upload flow.");
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "evidence";
  const storagePath = `${input.userId}/${input.grievanceId}/${crypto.randomUUID()}-${safeName}`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from("grievance-documents")
    .upload(storagePath, input.file, {
      upsert: false,
      ...(input.file.type ? { contentType: input.file.type } : {}),
    });
  throwIfError(uploadError, "Unable to upload evidence");
  if (!uploaded) throw new Error("Unable to upload evidence: Storage did not return a path.");
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      grievance_id: input.grievanceId,
      uploaded_by: input.userId,
      storage_path: uploaded.path,
      file_name: input.file.name,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      doc_kind: "government_evidence",
      citizen_visible: input.citizenVisible,
    })
    .select("*")
    .single();
  if (documentError || !document) {
    await supabase.storage.from("grievance-documents").remove([uploaded.path]);
    throw new Error(
      `Unable to record evidence: ${documentError?.message ?? "No document row returned"}`,
    );
  }
  const { error: eventError } = await supabase.from("case_events").insert({
    grievance_id: input.grievanceId,
    actor_id: input.userId,
    actor_type: "officer",
    event_type: "EVIDENCE_ATTACHED",
    title: "Government evidence attached",
    description: input.file.name,
    citizen_visible: input.citizenVisible,
  });
  if (eventError)
    throw new Error(
      `Evidence uploaded, but the case history could not be updated: ${eventError.message}`,
    );
  return document;
}

export type CitizenResolutionConfirmation =
  "CONFIRMED_RESOLVED" | "PARTIALLY_RESOLVED" | "NOT_RESOLVED";

export async function confirmCitizenResolution(input: {
  grievanceId: string;
  confirmation: CitizenResolutionConfirmation;
  whatWasFixed: string;
  whatRemainsUnresolved: string;
  requestedCorrection: string;
  evidenceDocumentId: string | null;
}): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    resolutionConfirmError("08", "authenticated session check failed", {
      grievanceId: input.grievanceId,
      confirmation: input.confirmation,
      ...safeResolutionErrorContext(sessionError),
    });
    throw new Error(
      "Unable to record your resolution confirmation: your session is unavailable. Sign in and try again.",
    );
  }
  resolutionConfirmDebug("08", "RPC starting", {
    grievanceId: input.grievanceId,
    confirmation: input.confirmation,
    authUserId: sessionData.session.user.id,
    hasEvidence: Boolean(input.evidenceDocumentId),
  });
  const { data, error } = await supabase.rpc("citizen_confirm_resolution", {
    p_grievance_id: input.grievanceId,
    p_confirmation: input.confirmation,
    p_what_was_fixed: input.whatWasFixed,
    p_what_remains_unresolved: input.whatRemainsUnresolved,
    p_requested_correction: input.requestedCorrection,
    p_evidence_document_id: input.evidenceDocumentId as string,
  });
  if (error) {
    resolutionConfirmError("09", "RPC returned an error", {
      grievanceId: input.grievanceId,
      confirmation: input.confirmation,
      ...safeResolutionErrorContext(error),
    });
    throw new Error(`Unable to record your resolution confirmation: ${error.message}`);
  }
  resolutionConfirmDebug("09", "RPC returned successfully", {
    grievanceId: input.grievanceId,
    confirmation: input.confirmation,
    responseReceived: data === null || data === undefined,
  });
}

export async function createCitizenAppeal(input: {
  grievanceId: string;
  grounds: string;
  requestedRelief: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("citizen_create_appeal", {
    p_grievance_id: input.grievanceId,
    p_grounds: input.grounds,
    p_requested_relief: input.requestedRelief,
  });
  throwIfError(error, "Unable to file appeal");
  if (!data) throw new Error("Unable to file appeal: reference was not returned.");
  return data;
}

export async function recordAppellateDecision(input: {
  appealId: string;
  decisionSummary: string;
  decisionReasons: string;
}): Promise<void> {
  const { error } = await supabase.rpc("appellate_record_appeal_decision", {
    p_appeal_id: input.appealId,
    p_decision_summary: input.decisionSummary,
    p_decision_reasons: input.decisionReasons,
  });
  throwIfError(error, "Unable to record the appeal decision");
}

export async function requestAppealOfficeReply(input: {
  appealId: string;
  instructions: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("appellate_request_office_reply", {
    p_appeal_id: input.appealId,
    p_instructions: input.instructions,
  });
  throwIfError(error, "Unable to request an office reply");
  if (!data) throw new Error("Unable to request an office reply: message ID was not returned.");
  return data;
}

export async function replyToAppeal(input: { appealId: string; reply: string }): Promise<string> {
  const { data, error } = await supabase.rpc("officer_reply_to_appeal", {
    p_appeal_id: input.appealId,
    p_reply: input.reply,
  });
  throwIfError(error, "Unable to send the office reply");
  if (!data) throw new Error("Unable to send the office reply: message ID was not returned.");
  return data;
}

/**
 * Creates a short-lived URL only after the caller can read the document row
 * through RLS. Rendering code must open its browser tab synchronously from the
 * click, then navigate that tab to this URL; opening only after this await can
 * be blocked as a pop-up.
 */
export async function createAuthorizedDocumentUrl(documentId: string): Promise<string> {
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, file_name")
    .eq("id", documentId)
    .maybeSingle();
  throwIfError(documentError, "Unable to access document");
  if (!document)
    throw new Error("This document is unavailable or you are not authorised to open it.");
  const { data, error } = await supabase.storage
    .from("grievance-documents")
    .createSignedUrl(document.storage_path, 60);
  throwIfError(error, "Unable to create a secure document link");
  if (!data?.signedUrl)
    throw new Error("A secure document link could not be created. Please try again.");
  return data.signedUrl;
}

export async function getNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  throwIfError(error, "Unable to load notifications");
  return data ?? [];
}

/** RLS limits appeal rows to the signed-in user's authorized scope. */
export async function getAuthorizedAppeals(): Promise<AppealCollection> {
  const { data, error } = await supabase
    .from("appeals")
    .select("*")
    .order("filed_at", { ascending: false });
  throwIfError(error, "Unable to load authorized appeals");
  const appeals = data ?? [];
  if (appeals.length === 0) return { appeals, grievances: {}, organizations: {} };

  const grievanceIds = [...new Set(appeals.map((appeal) => appeal.grievance_id))];
  const grievanceResult = await supabase.from("grievances").select("*").in("id", grievanceIds);
  throwIfError(grievanceResult.error, "Unable to load appeal grievances");
  const grievances = grievanceResult.data ?? [];
  return {
    appeals,
    grievances: indexBy(grievances, (row) => row.id),
    organizations: await getOrganizations(appeals.map((row) => row.appellate_organization_id)),
  };
}

export async function getAppealWorkspace(appealId: string): Promise<AppealWorkspace | null> {
  const appealResult = await supabase.from("appeals").select("*").eq("id", appealId).maybeSingle();
  throwIfError(appealResult.error, "Unable to load appeal");
  if (!appealResult.data) return null;

  const [appealEvents, grievanceWorkspace] = await Promise.all([
    supabase
      .from("appeal_events")
      .select("*")
      .eq("appeal_id", appealId)
      .order("created_at", { ascending: true }),
    getGrievanceWorkspace(appealResult.data.grievance_id),
  ]);
  throwIfError(appealEvents.error, "Unable to load appeal events");
  if (!grievanceWorkspace) throw new Error("The grievance linked to this appeal is unavailable.");
  return { appeal: appealResult.data, appealEvents: appealEvents.data ?? [], grievanceWorkspace };
}

/** The route guard controls capabilities; RLS remains the final data boundary. */
export async function getIssueClusters(): Promise<IssueClusterCollection> {
  const { data, error } = await supabase
    .from("issue_clusters")
    .select("*")
    .order("case_count", { ascending: false });
  throwIfError(error, "Unable to load issue clusters");
  const clusters = data ?? [];
  if (clusters.length === 0) {
    return {
      clusters,
      organizations: {},
      categories: {},
      membersByCluster: {},
      grievancesById: {},
      appealsByGrievance: {},
    };
  }

  const clusterIds = clusters.map((cluster) => cluster.id);
  const [organizations, categories, membersResult] = await Promise.all([
    getOrganizations(clusters.map((cluster) => cluster.organization_id)),
    getCategories(clusters.map((cluster) => cluster.category_id)),
    supabase.from("issue_cluster_members").select("*").in("cluster_id", clusterIds),
  ]);
  throwIfError(membersResult.error, "Unable to load issue cluster members");
  const members = membersResult.data ?? [];
  const grievanceIds = [...new Set(members.map((member) => member.grievance_id))];
  if (grievanceIds.length === 0) {
    return {
      clusters,
      organizations,
      categories,
      membersByCluster: {},
      grievancesById: {},
      appealsByGrievance: {},
    };
  }

  const [grievancesResult, appealsResult] = await Promise.all([
    supabase.from("grievances").select("*").in("id", grievanceIds),
    supabase.from("appeals").select("*").in("grievance_id", grievanceIds),
  ]);
  throwIfError(grievancesResult.error, "Unable to load accessible cluster grievances");
  throwIfError(appealsResult.error, "Unable to load accessible cluster appeals");
  return {
    clusters,
    organizations,
    categories,
    membersByCluster: groupBy(members, (member) => member.cluster_id),
    grievancesById: indexBy(grievancesResult.data ?? [], (grievance) => grievance.id),
    appealsByGrievance: groupBy(appealsResult.data ?? [], (appeal) => appeal.grievance_id),
  };
}

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverview> {
  const [organizations, categories, aiRuns] = await Promise.all([
    supabase.from("organizations").select("*").order("name"),
    supabase.from("grievance_categories").select("*").order("name"),
    supabase.from("ai_runs").select("*").order("created_at", { ascending: false }).limit(25),
  ]);
  throwIfError(organizations.error, "Unable to load organizations");
  throwIfError(categories.error, "Unable to load categories");
  throwIfError(aiRuns.error, "Unable to load AI run audit records");
  return {
    organizations: organizations.data ?? [],
    categories: categories.data ?? [],
    aiRuns: aiRuns.data ?? [],
  };
}
