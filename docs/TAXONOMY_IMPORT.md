# Development taxonomy import

The intake UI reads active organizations and grievance categories from the connected Supabase project. It does not contain an alternative hard-coded government directory.

The current connected seed is intentionally small: 7 active organizations (5 nested) and 4 active categories (2 nested), as checked on 2026-08-28. These are development/demo reference records, not a claim of complete official all-India taxonomy coverage.

To load a reviewed broader verified or clearly labeled mock dataset into a development project, use:

```powershell
$env:TAXONOMY_IMPORT_TARGET = "development"
$env:TAXONOMY_IMPORT_CONFIRM = "development"
npm run demo:taxonomy:import -- --file=path/to/reviewed-taxonomy.json
```

The JSON file must be reviewed before use and contain a truthful `source_label`, plus parent-first `organizations` and `categories` arrays. Each row needs its stable `code` and `name`; hierarchy, activity, default organization, SLA, and other existing database fields may be included when applicable. Parent references must already exist or occur earlier in the corresponding array.

The command rejects production mode and requires explicit development confirmation. It uses a server-side administrative key only in the local development script; never expose that key to the browser. The script does not invent official department names, create a new Supabase project, or alter the schema/RLS contracts.
