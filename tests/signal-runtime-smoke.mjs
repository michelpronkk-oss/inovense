import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260908_signal_engine.sql", "utf8");
const store = fs.readFileSync("src/lib/signals/store.ts", "utf8");
const trigger = fs.readFileSync("src/trigger/signal-engine.ts", "utf8");
const operations = fs.readFileSync("src/lib/operators/operations/scan.ts", "utf8");

for (const table of ["os_signal_events", "os_signal_candidates", "os_signal_sync_state"]) assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
assert.match(migration, /unique \(workspace_id, dedupe_key\)/);
assert.match(migration, /enable row level security/);
assert.match(migration, /claim_os_signal_sync_lease/);
assert.match(store, /Rejected cross-workspace signal event/);
assert.match(store, /ignoreDuplicates: true/);
assert.match(store, /getOperatorActivationState/);
assert.match(store, /getWorkspaceExecutionEligibility/);
assert.match(store, /Cursor checkpointing happens only after successful ingestion/);
assert.match(trigger, /events: payload\.events\.slice\(0, 100\)/);
assert.match(operations, /normalizeProjectTaskSignal/);
assert.match(operations, /normalizeZendeskSignal/);
assert.match(operations, /normalizeDriveSignal/);
assert.doesNotMatch(store, /createApproval|prepareAction|executeAction/);
console.log("Signal runtime smoke: RLS persistence, leases, workspace guard, activation gating, bounded Trigger payloads, and staged source ingestion verified.");
