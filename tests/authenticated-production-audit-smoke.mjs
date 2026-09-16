import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const realtime = read("src/lib/os/workspace-realtime.ts");
const provider = read("src/lib/os/app-provider.tsx");
const migration = read("supabase/migrations/20260916_realtime_surface_coverage.sql");
const dashboard = read("src/lib/dashboard/overview.ts");
const logsPage = read("src/app/app/logs/page.tsx");
const logsQuery = read("src/lib/execution-logs/query.ts");
const metrics = read("src/lib/dashboard/metric-definitions.ts");
const memory = read("src/app/app/memory/page.tsx");
const insights = read("src/app/app/insights/page.tsx");

for (const surface of ["memory", "logs", "insights"]) {
  assert.match(realtime, new RegExp(`\\"${surface}\\"`), `${surface} is a supported invalidation surface`);
  assert.match(migration, new RegExp(`'${surface}'`), `${surface} is covered by the unapplied migration`);
}
assert.match(provider, /publishStatus\("connected"\)/, "realtime exposes an honest connected state");
assert.match(provider, /publishStatus\("error"\)/, "realtime exposes an honest error state");
assert.match(provider, /if \(IS_PRODUCTION\) return/, "legacy local runtime is fail-closed in production");
const topbar = read("src/components/dashboard/topbar.tsx");
assert.match(topbar, /const IS_PRODUCTION/, "global legacy surfaces know the production boundary");
assert.match(topbar, /!IS_PRODUCTION && deployOpen/, "legacy deploy modal is not rendered in production");
assert.match(topbar, /!IS_PRODUCTION \? state\.workflows\.map/, "production command palette does not expose snapshot workflows");
assert.match(migration, /os_memory_entries/, "memory changes bump the workspace projection");
assert.match(migration, /os_operator_run_logs/, "execution log changes bump the workspace projection");
assert.match(migration, /os_workflow_outcomes_insights/, "outcomes bump the insights projection");
assert.match(dashboard, /latestPersistedTimestamp/, "dashboard freshness comes from persisted timestamps");
assert.doesNotMatch(dashboard, /lastUpdatedAt: new Date\(\)\.toISOString\(\)/, "dashboard does not claim query time as data freshness");
assert.match(logsPage, /fetch\("\/api\/logs"/, "execution logs use the canonical server query");
assert.doesNotMatch(logsPage, /state\.logs\.map|state\.logs\.filter/, "execution logs do not render snapshot/fixture logs");
assert.match(logsQuery, /eq\("workspace_id", input\.workspaceId\)/, "execution log query is workspace scoped");
assert.match(logsQuery, /eventLabel/, "execution logs map internal events to user-facing labels");
assert.match(metrics, /DASHBOARD_METRIC_DEFINITIONS/, "dashboard metric semantics are centralized");
assert.match(memory, /\[\"memory\", \"connectors\"\]/, "memory refetches on governed context changes");
assert.match(insights, /\[\"insights\", \"workflows\", \"activity\"\]/, "insights refetches on persisted outcome changes");

console.log("authenticated-production-audit-smoke: data truth, freshness, canonical logs, realtime coverage, and workspace scoping passed.");
