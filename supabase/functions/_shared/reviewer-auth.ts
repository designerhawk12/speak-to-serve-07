export const REVIEWER_EMAILS = [
  "citizen.1@demo-data.cpgrams.in",
  "citizen.2@demo-data.cpgrams.in",
  "gro.urban.pune.a@demo-data.cpgrams.in",
  "gro.urban.pune.b@demo-data.cpgrams.in",
  "gro.urban.bengaluru@demo-data.cpgrams.in",
  "gro.water.a@demo-data.cpgrams.in",
  "gro.water.b@demo-data.cpgrams.in",
  "gro.pension.a@demo-data.cpgrams.in",
  "gro.pension.b@demo-data.cpgrams.in",
  "nodal@demo-data.cpgrams.in",
  "appellate@demo-data.cpgrams.in",
] as const;

export interface ReviewerLoginRequest {
  email: string;
  code: string;
}

export function normalizeReviewerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) return null;
  return normalized;
}

export function validateReviewerLoginRequest(
  input: unknown,
  expectedCode: string,
): ReviewerLoginRequest | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const email = normalizeReviewerEmail(body["email"]);
  const code = typeof body["code"] === "string" ? body["code"] : "";
  if (!email || !/^\d{8}$/.test(code) || code !== expectedCode) return null;
  if (!(REVIEWER_EMAILS as readonly string[]).includes(email)) return null;
  return { email, code };
}

