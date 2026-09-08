import assert from "node:assert/strict";
import fs from "node:fs";

const helper = fs.readFileSync("src/lib/runtime/task-heartbeat.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260908_operational_task_heartbeats.sql", "utf8");
assert.match(helper, /last_started_at/);
assert.match(helper, /last_succeeded_at/);
assert.match(helper, /last_failed_at/);
assert.match(helper, /last_safe_error_code: "task_failed"/);
assert.match(helper, /throw error/);
assert.doesNotMatch(helper, /error\.message|access_token|refresh_token|raw_payload|request_body/);
assert.match(migration, /enable row level security/);
assert.doesNotMatch(migration, /create policy/i);
for (const file of ["workflow-recovery", "trial-lifecycle", "workspace-daily-brief", "revenue-operator-scan", "client-flow-operator-scan", "operations-operator-scan", "jira-personal-data-reporting"]) {
  const source = fs.readFileSync(`src/trigger/${file}.ts`, "utf8");
  assert.match(source, /withTaskHeartbeat/);
}
console.log("Task heartbeat smoke: payload-free fail-open telemetry, service-only table, and scheduled task coverage verified.");
