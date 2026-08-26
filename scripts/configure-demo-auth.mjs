import { createClient } from "@supabase/supabase-js";

const knownDemoEmails = [
  "citizen@demo.cpgrams.in",
  "gro@demo.cpgrams.in",
  "nodal@demo.cpgrams.in",
  "appellate@demo.cpgrams.in",
];

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_AUTH_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_AUTH_PASSWORD.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("This development-only script must not run with NODE_ENV=production.");
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

const { data: admins, error: profilesError } = await admin
  .from("profiles")
  .select("id")
  .eq("role", "platform_admin");
if (profilesError) throw profilesError;

const adminIds = new Set((admins ?? []).map((profile) => profile.id));
const targets = users.filter((user) => knownDemoEmails.includes(user.email ?? "") || adminIds.has(user.id));

for (const user of targets) {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Configured development password for ${user.email ?? user.id}.`);
}

const matchedEmails = new Set(targets.map((user) => user.email));
for (const email of knownDemoEmails) {
  if (!matchedEmails.has(email)) console.warn(`Demo account not found: ${email}`);
}

console.log(`Configured ${targets.length} development demo account(s).`);
