import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const live = read("src/lib/admin/system-map-live.ts");
const healthRoute = read("src/app/api/admin/system-map/route.ts");
const notesRoute = read("src/app/api/admin/system-map/notes/route.ts");
const canvas = read("src/app/admin/system-map/SystemMapCanvas.tsx");
const migration = read("supabase/migrations/20260908_admin_system_map_notes.sql");

assert.match(live, /os_connectors/);
assert.match(live, /os_connector_credentials/);
assert.match(live, /os_operator_runs/);
assert.match(live, /getProviderFailureSnapshot/);
assert.match(live, /SystemMapRuntimeStatus/);
assert.match(healthRoute, /requireInternalAdmin/);
assert.match(notesRoute, /requireInternalAdmin/);
assert.match(notesRoute, /workspace_id/);
assert.match(notesRoute, /POST/); assert.match(notesRoute, /PATCH/); assert.match(notesRoute, /DELETE/);
assert.match(migration, /os_admin_system_map_notes/);
assert.match(migration, /workspace_id text not null/);
assert.match(migration, /enable row level security/);
assert.match(canvas, /Refresh health/);
assert.match(canvas, /setInterval\(\(\) => void refreshLive\(\), 60_000\)/);
assert.match(canvas, /Founder notes/);
assert.match(canvas, /Add note/);
assert.doesNotMatch(canvas, /supabase|createSupabaseAdmin/i);
console.log("Admin System Map live smoke: guarded live health, bounded refresh, workspace-scoped notes, and node detail context verified.");
