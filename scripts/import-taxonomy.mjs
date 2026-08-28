import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const confirmation = "development";
const fileArgument = process.argv.find((argument) => argument.startsWith("--file="));

if (
  process.env.NODE_ENV === "production" ||
  process.env.TAXONOMY_IMPORT_CONFIRM !== confirmation ||
  process.env.TAXONOMY_IMPORT_TARGET !== "development"
) {
  throw new Error(
    "Taxonomy import is development-only. Set TAXONOMY_IMPORT_TARGET=development and TAXONOMY_IMPORT_CONFIRM=development; never import unreviewed data into production.",
  );
}

if (!fileArgument) {
  throw new Error("Provide a reviewed JSON file with --file=path/to/taxonomy.json.");
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

const payload = JSON.parse(await readFile(fileArgument.slice("--file=".length), "utf8"));
if (
  typeof payload?.source_label !== "string" ||
  !Array.isArray(payload.organizations) ||
  !Array.isArray(payload.categories)
) {
  throw new Error(
    "The file must declare source_label plus organizations and categories arrays. Do not represent mock data as official government reference data.",
  );
}

const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const organization of payload.organizations) {
  if (typeof organization?.code !== "string" || typeof organization?.name !== "string") {
    throw new Error("Each organization requires a stable code and a name.");
  }
}
for (const category of payload.categories) {
  if (typeof category?.code !== "string" || typeof category?.name !== "string") {
    throw new Error("Each category requires a stable code and a name.");
  }
}

// Parent references must already exist or appear earlier in their respective
// array. This keeps the import explicit and auditable instead of guessing a tree.
const { error: organizationError } = await client
  .from("organizations")
  .upsert(payload.organizations, { onConflict: "code" });
if (organizationError) throw new Error(`Organization import failed: ${organizationError.message}`);

const { error: categoryError } = await client
  .from("grievance_categories")
  .upsert(payload.categories, { onConflict: "code" });
if (categoryError) throw new Error(`Category import failed: ${categoryError.message}`);

console.log(
  `Imported ${payload.organizations.length} organizations and ${payload.categories.length} categories from ${payload.source_label}.`,
);
