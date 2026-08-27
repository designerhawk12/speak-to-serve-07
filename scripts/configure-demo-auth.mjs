import { createClient } from "@supabase/supabase-js";

const knownDemoEmails = [
  "citizen@demo.cpgrams.in",
  "gro@demo.cpgrams.in",
  "nodal@demo.cpgrams.in",
  "appellate@demo.cpgrams.in",
];

const demoGroAccounts = [
  {
    email: "gro@demo.cpgrams.in",
    fullName: "Demo Pune GRO A",
    organizationCode: "ULB-PMC",
    locationTerms: ["Pune"],
  },
  {
    email: "gro.triage.pune.a@demo.cpgrams.in",
    fullName: "Demo Triage Pune GRO A",
    organizationCode: "DEMO-URBAN-TRIAGE",
    locationTerms: ["Pune"],
  },
  {
    email: "gro.triage.pune.b@demo.cpgrams.in",
    fullName: "Demo Triage Pune GRO B",
    organizationCode: "DEMO-URBAN-TRIAGE",
    locationTerms: ["Pune"],
  },
  {
    email: "gro.triage.bengaluru@demo.cpgrams.in",
    fullName: "Demo Triage Bengaluru GRO",
    organizationCode: "DEMO-URBAN-TRIAGE",
    locationTerms: ["Bengaluru", "Bangalore"],
  },
];

knownDemoEmails.push(...demoGroAccounts.map((account) => account.email));

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_AUTH_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_AUTH_PASSWORD.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" || process.env.DEMO_AUTH_CONFIRM !== "development") {
  console.error(
    "This development-only script requires DEMO_AUTH_CONFIRM=development and must not run with NODE_ENV=production.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 1000) break;
}

const { data: moh, error: mohError } = await admin
  .from("organizations")
  .select("id")
  .eq("code", "MOHUA")
  .single();
if (mohError) throw mohError;

const { error: demoOrganizationError } = await admin.from("organizations").upsert(
  {
    code: "DEMO-URBAN-TRIAGE",
    name: "[DEMO] Urban Services Triage",
    level: "central_department",
    parent_id: moh.id,
    state_name: null,
    is_appellate_office: false,
  },
  { onConflict: "code" },
);
if (demoOrganizationError) throw demoOrganizationError;

for (const account of demoGroAccounts) {
  if (users.some((user) => user.email === account.email)) continue;
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName },
  });
  if (error) throw error;
  users.push(data.user);
  console.log(`Provisioned development GRO ${account.email}.`);
}

const { data: admins, error: profilesError } = await admin
  .from("profiles")
  .select("id")
  .eq("role", "platform_admin");
if (profilesError) throw profilesError;

const adminIds = new Set((admins ?? []).map((profile) => profile.id));
const targets = users.filter(
  (user) => knownDemoEmails.includes(user.email ?? "") || adminIds.has(user.id),
);

for (const user of targets) {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Configured development password for ${user.email ?? user.id}.`);
}

const organizationCodes = [...new Set(demoGroAccounts.map((account) => account.organizationCode))];
const { data: organizations, error: organizationsError } = await admin
  .from("organizations")
  .select("id, code")
  .in("code", organizationCodes);
if (organizationsError) throw organizationsError;
const organizationByCode = new Map(
  (organizations ?? []).map((organization) => [organization.code, organization.id]),
);

for (const account of demoGroAccounts) {
  const user = users.find((candidate) => candidate.email === account.email);
  const organizationId = organizationByCode.get(account.organizationCode);
  if (!user || !organizationId)
    throw new Error(`Unable to provision assignment data for ${account.email}.`);
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      role: "gro",
      organization_id: organizationId,
      designation: "Development GRO",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  const { error: assignmentError } = await admin.from("officer_assignment_profiles").upsert(
    {
      officer_id: user.id,
      is_active: true,
      jurisdiction_state_names: [],
      jurisdiction_district_names: [],
      jurisdiction_location_terms: account.locationTerms,
    },
    { onConflict: "officer_id" },
  );
  if (assignmentError) throw assignmentError;
}

const matchedEmails = new Set(targets.map((user) => user.email));
for (const email of knownDemoEmails) {
  if (!matchedEmails.has(email)) console.warn(`Demo account not found: ${email}`);
}

console.log(`Configured ${targets.length} development demo account(s).`);
