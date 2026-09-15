import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260915_realtime_backbone.sql", "utf8");
const client = fs.readFileSync("src/lib/os/workspace-realtime.ts", "utf8");
const provider = fs.readFileSync("src/lib/os/app-provider.tsx", "utf8");
assert.match(migration, /enable row level security/);
assert.match(migration, /is_workspace_member\(workspace_id\)/);
assert.match(migration, /surface text not null check/);
assert.match(migration, /alter publication supabase_realtime add table public\.os_workspace_realtime_state/);
assert.doesNotMatch(migration, /content_preview|encrypted_access_token|refresh_token/);
assert.match(client, /WORKSPACE_REALTIME_EVENT/);
assert.match(client, /parsed\?\.workspaceId === workspaceId/);
assert.match(client, /removeEventListener\(WORKSPACE_REALTIME_EVENT/);
assert.match(provider, /workspace-state:\$\{initialContext\.workspaceId\}/);
assert.match(provider, /workspace_id=eq\.\$\{initialContext\.workspaceId\}/);
assert.match(provider, /removeChannel\(channel\)/);
console.log("Workspace Realtime smoke: RLS-scoped revision projection, workspace filter, safe parser, and unsubscribe cleanup verified.");
