import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface PublicTrackingMilestone {
  occurredAt: string;
  stage: string;
}

export interface PublicGrievanceTracking {
  registrationNumber: string;
  category: string | null;
  administrativeStage: string;
  organizationName: string | null;
  submittedAt: string | null;
  lastUpdatedAt: string | null;
  milestones: PublicTrackingMilestone[];
  resolutionStatus: string;
  appealStatus: string;
}

export interface PublicAppealTracking {
  referenceNumber: string;
  appealStage: string;
  appellateOrganizationName: string | null;
  filedAt: string | null;
  lastUpdatedAt: string | null;
  milestones: PublicTrackingMilestone[];
}

function isRecord(value: Json | null): value is Record<string, Json> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function milestones(value: Json | undefined): PublicTrackingMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json>;
    const occurredAt = stringOrNull(record["occurred_at"]);
    const stage = stringOrNull(record["stage"]);
    return occurredAt && stage ? [{ occurredAt, stage }] : [];
  });
}

/** Parses only the fixed, safe public RPC contract; private keys are ignored. */
export function parsePublicGrievanceTracking(value: Json | null): PublicGrievanceTracking | null {
  if (!isRecord(value) || value["found"] !== true) return null;
  const registrationNumber = stringOrNull(value["registration_number"]);
  const administrativeStage = stringOrNull(value["administrative_stage"]);
  const resolutionStatus = stringOrNull(value["resolution_status"]);
  const appealStatus = stringOrNull(value["appeal_status"]);
  if (!registrationNumber || !administrativeStage || !resolutionStatus || !appealStatus)
    return null;
  return {
    registrationNumber,
    administrativeStage,
    resolutionStatus,
    appealStatus,
    category: stringOrNull(value["category"]),
    organizationName: stringOrNull(value["organization_name"]),
    submittedAt: stringOrNull(value["submitted_at"]),
    lastUpdatedAt: stringOrNull(value["last_updated_at"]),
    milestones: milestones(value["milestones"]),
  };
}

export function parsePublicAppealTracking(value: Json | null): PublicAppealTracking | null {
  if (!isRecord(value) || value["found"] !== true) return null;
  const referenceNumber = stringOrNull(value["reference_number"]);
  const appealStage = stringOrNull(value["appeal_stage"]);
  if (!referenceNumber || !appealStage) return null;
  return {
    referenceNumber,
    appealStage,
    appellateOrganizationName: stringOrNull(value["appellate_organization_name"]),
    filedAt: stringOrNull(value["filed_at"]),
    lastUpdatedAt: stringOrNull(value["last_updated_at"]),
    milestones: milestones(value["milestones"]),
  };
}

export async function publicTrackGrievance(
  registrationNumber: string,
): Promise<PublicGrievanceTracking | null> {
  const { data, error } = await supabase.rpc("public_track_grievance", {
    p_registration_number: registrationNumber,
  });
  if (error) throw new Error("Public tracking is temporarily unavailable. Please try again.");
  return parsePublicGrievanceTracking(data);
}

export async function publicTrackAppeal(
  referenceNumber: string,
): Promise<PublicAppealTracking | null> {
  const { data, error } = await supabase.rpc("public_track_appeal", {
    p_reference_number: referenceNumber,
  });
  if (error)
    throw new Error("Public appeal tracking is temporarily unavailable. Please try again.");
  return parsePublicAppealTracking(data);
}
