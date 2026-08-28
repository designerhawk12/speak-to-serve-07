import { createClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS, DEMO_CASES } from "./demo-data-manifest";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const reviewerOtp = process.env.REVIEWER_DEMO_OTP ?? "24682468";

if (!supabaseUrl || !publishableKey)
  throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.");

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

async function reviewerSession(email: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/reviewer-auth`, {
    method: "POST",
    headers: { apikey: publishableKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: reviewerOtp }),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok || typeof body["access_token"] !== "string" || typeof body["refresh_token"] !== "string")
    throw new Error(`Reviewer authentication failed for ${email} with HTTP ${response.status}.`);
  return {
    access_token: body["access_token"],
    refresh_token: body["refresh_token"],
  };
}

async function authenticatedClient(account: DemoAccount) {
  const client = createClient(supabaseUrl!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessionData, error: sessionError } = await client.auth.setSession(
    await reviewerSession(account.email),
  );
  if (sessionError || !sessionData.user || !sessionData.session)
    throw new Error(`Unable to establish reviewer session for ${account.email}.`);

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, role, email, organization_id")
    .eq("id", sessionData.user.id)
    .single();
  if (profileError || !profile || profile.role !== account.role)
    throw new Error(`Profile/role verification failed for ${account.email}.`);
  return { client, userId: sessionData.user.id, profile };
}

const invalidResponse = await fetch(`${supabaseUrl}/functions/v1/reviewer-auth`, {
  method: "POST",
  headers: { apikey: publishableKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "not-a-reviewer@example.in", code: reviewerOtp }),
});
if (invalidResponse.status !== 401) throw new Error("Unknown reviewer identity was not rejected safely.");
const invalidBody = (await invalidResponse.json()) as Record<string, unknown>;
if ("access_token" in invalidBody || "refresh_token" in invalidBody)
  throw new Error("Rejected reviewer response exposed session tokens.");

const verified: Array<{ email: string; role: string; visibleCases: number }> = [];
const sessions = new Map<string, Awaited<ReturnType<typeof authenticatedClient>>>();
for (const account of DEMO_ACCOUNTS) {
  const authenticated = await authenticatedClient(account);
  sessions.set(account.email, authenticated);

  let visibleCases = 0;
  if (account.role === "citizen") {
    const { data, error } = await authenticated.client
      .from("grievances")
      .select("id, citizen_id")
      .in("id", DEMO_CASES.map((item) => item.id));
    if (error || (data ?? []).some((item) => item.citizen_id !== authenticated.userId))
      throw new Error(`Citizen ownership verification failed for ${account.email}.`);
    visibleCases = data?.length ?? 0;
  } else if (account.role === "gro") {
    const { data, error } = await authenticated.client
      .from("officer_case_queue")
      .select("id, assigned_officer_id")
      .eq("assigned_officer_id", authenticated.userId)
      .in("id", DEMO_CASES.map((item) => item.id));
    if (error || (data ?? []).some((item) => item.assigned_officer_id !== authenticated.userId))
      throw new Error(`Assigned GRO queue verification failed for ${account.email}.`);
    visibleCases = data?.length ?? 0;
  } else if (account.role === "nodal") {
    const { data, error } = await authenticated.client
      .from("grievances")
      .select("id")
      .in("id", DEMO_CASES.map((item) => item.id));
    if (error || data?.length !== DEMO_CASES.length)
      throw new Error("Nodal subtree did not contain the complete reviewer case pack.");
    visibleCases = data.length;
  } else {
    const [grievances, appeals] = await Promise.all([
      authenticated.client
        .from("grievances")
        .select("id")
        .in("id", DEMO_CASES.map((item) => item.id)),
      authenticated.client.from("appeals").select("grievance_id"),
    ]);
    if (grievances.error || appeals.error)
      throw new Error("Appellate reviewer scope could not be verified.");
    const appealIds = new Set((appeals.data ?? []).map((item) => item.grievance_id));
    if ((grievances.data ?? []).some((item) => !appealIds.has(item.id)))
      throw new Error("Appellate scope exposed an ordinary grievance without an appeal.");
    visibleCases = grievances.data?.length ?? 0;
  }

  verified.push({ email: account.email, role: account.role, visibleCases });
}

const groA = sessions.get("gro.urban.pune.a@demo-data.cpgrams.in")!;
const groB = sessions.get("gro.urban.pune.b@demo-data.cpgrams.in")!;
const { data: groACases, error: groAError } = await groA.client
  .from("officer_case_queue")
  .select("id")
  .eq("assigned_officer_id", groA.userId)
  .limit(1);
if (groAError || !groACases?.[0]) throw new Error("GRO A has no assigned reviewer case.");
const { data: groBNormalQueue, error: groBError } = await groB.client
  .from("officer_case_queue")
  .select("id")
  .eq("assigned_officer_id", groB.userId)
  .eq("id", groACases[0].id);
if (groBError || (groBNormalQueue?.length ?? 0) !== 0)
  throw new Error("GRO A's case appeared in GRO B's normal assigned queue.");

console.log(
  JSON.stringify(
    {
      projectRef: new URL(supabaseUrl).hostname.split(".")[0],
      mockReviewerAuth: "verified",
      invalidIdentity: "generic rejection verified",
      accountsVerified: verified.length,
      citizensVerified: verified.filter((item) => item.role === "citizen").length,
      casePackCount: DEMO_CASES.length,
      groAssignedQueues: Object.fromEntries(
        verified.filter((item) => item.role === "gro").map((item) => [item.email, item.visibleCases]),
      ),
      nodalVisibleCases: verified.find((item) => item.role === "nodal")?.visibleCases,
      appellateAppealContexts: verified.find((item) => item.role === "appellate")?.visibleCases,
      crossGroNormalQueueIsolation: "verified",
    },
    null,
    2,
  ),
);

