import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationDir = "supabase/migrations";
const migration = fs.readFileSync(path.join(migrationDir, "20260916_website_knowledge_sync.sql"), "utf8");
const executableMigration = migration.replace(/--.*$/gm, "");
const activityMigration = fs.readFileSync(path.join(migrationDir, "20260416_add_activity_events.sql"), "utf8");
const activityQuery = fs.readFileSync("src/lib/activity/query.ts", "utf8");

// The old table exists only as a legacy admin/prospect audit surface. Website
// Sync must not make it a migration dependency: current Product Activity is
// the workspace-scoped OS projection below.
assert.match(activityMigration, /create table if not exists public\.activity_events/);
assert.doesNotMatch(executableMigration, /activity_events/);
assert.doesNotMatch(activityQuery, /activity_events/);
for (const table of ["os_approvals", "os_operator_runs", "os_operator_run_logs", "os_workflow_runs", "os_workflow_outcomes"]) {
  assert.match(activityQuery, new RegExp(`from\\(\\"${table}\\"\\)`));
}

// Required base dependencies must fail clearly rather than being hidden by a
// permissive IF EXISTS guard. The Website objects are created only after this
// preflight and the migration is explicitly transactional.
assert.match(migration, /begin;[\s\S]*to_regclass\('public\.os_workspaces'\)/);
assert.match(migration, /to_regprocedure\('public\.set_updated_at\(\)'\)/);
assert.match(migration, /to_regprocedure\('public\.bump_os_workspace_realtime_surface\(\)'\)/);
assert.match(migration, /to_regclass\('public\.os_workspace_realtime_state'\)/);
assert.match(migration, /Realtime surface check to include memory/);
assert.match(migration, /commit;/);

const migrationNames = fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
const websiteIndex = migrationNames.indexOf("20260916_website_knowledge_sync.sql");
assert.ok(websiteIndex > migrationNames.indexOf("20260523_os_team_invites.sql"), "Website migration must follow workspace/function creation");
assert.ok(websiteIndex > migrationNames.indexOf("20260915_realtime_backbone.sql"), "Website migration must follow the Realtime helper creation");
assert.ok(websiteIndex > migrationNames.indexOf("20260916_realtime_surface_coverage.sql"), "Website migration must follow the memory Realtime surface extension");

// A prior SQL Editor run may have created all Website tables before failing at
// a later statement. Re-running must reconcile those same objects without
// duplicating the source foreign key or triggers.
assert.match(migration, /create table if not exists public\.os_website_sources/);
assert.match(migration, /where conrelid = 'public\.os_website_sources'::regclass/);
assert.match(migration, /drop trigger if exists trg_os_website_sources_updated_at/);
assert.match(migration, /create or replace function public\.claim_os_website_crawl_run/);
assert.match(migration, /create or replace function public\.release_os_website_crawl_run/);

console.log("Website Knowledge migration smoke contracts passed: canonical Activity dependency, ordering, transaction, preflight, and reconciliation.");
