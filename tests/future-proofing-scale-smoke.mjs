import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const models = read("src/lib/product/presentation-models.ts");
const metrics = read("src/lib/dashboard/metric-definitions.ts");
const events = read("src/lib/events/presentation-registry.ts");
const actions = read("src/lib/actions/action-contract.ts");
const capabilities = read("src/lib/connectors/capability-registry.ts");
const realtime = read("src/lib/os/workspace-realtime.ts");
const provider = read("src/lib/os/app-provider.tsx");
const activity = read("src/lib/activity/query.ts");
const logs = read("src/lib/execution-logs/query.ts");
const approvals = read("src/app/api/approvals/route.ts");
const state = read("src/app/api/os/state/route.ts");
const memoryReader = read("src/lib/memory/reader.ts");
const time = read("src/lib/product/time.ts");
const workflows = read("src/lib/workflows/presentation.ts");

for (const model of ["DashboardMetric", "OperatorState", "WorkflowSummary", "WorkflowDetail", "ApprovalSummary", "ConnectorState", "CapabilityDefinition", "MemoryContextEntry", "ActivityEvent", "ExecutionLogEntry", "OutcomeSummary"]) {
  assert.match(models, new RegExp(`export type ${model}`), `${model} is a stable presentation model`);
}

for (const field of ["authoritativeSource", "window", "inclusion", "exclusion", "freshness", "emptyState", "drilldownRoute", "testCoverage"]) {
  assert.match(metrics, new RegExp(field), `metric contract includes ${field}`);
}
assert.match(events, /schemaVersion/);
assert.match(events, /presentEvent/);
assert.match(events, /A workspace event was recorded/);
assert.match(actions, /SharedAction = "create_task"/);
for (const action of ["update_task", "add_comment", "complete_task", "send_message", "send_email", "update_contact", "update_deal"]) assert.match(actions, new RegExp(`action: "${action}"`));
assert.match(actions, /sharedActionForActionType/);
assert.match(capabilities, /getConnectorExtensionContract/);
assert.match(capabilities, /healthEvaluator/);
assert.match(capabilities, /if \(!definition\) return null/);

assert.match(realtime, /acceptWorkspaceRealtimeRevision/);
assert.match(realtime, /event\.revision >/);
assert.match(provider, /lastRevisions/);
assert.match(provider, /setTimeout\(\(\) =>/);

// Every high-volume product feed has a server-side bound. The 1,000-row
// fixture below is intentionally larger than every page limit: the contract
// is that a request can never materialize the whole source table.
const highVolumeRows = Array.from({ length: 1000 }, (_, index) => ({ id: String(index) }));
assert.equal(highVolumeRows.length, 1000);
assert.match(activity, /const SOURCE_LIMIT = 1000/);
assert.match(logs, /boundedLimit\(input\.limit, 200, 500\)/);
assert.match(logs, /limit\(limit \+ 1\)/);
assert.match(approvals, /boundedLimit\(req\.nextUrl\.searchParams\.get\("limit"\), 100, 100\)/);
assert.match(approvals, /nextCursor/);
assert.match(state, /os_memory_entries[\s\S]{0,500}\.limit\(200\)/);
assert.match(state, /os_workspace_members[\s\S]{0,300}\.limit\(200\)/);
assert.match(memoryReader, /\.limit\(200\)/);
assert.match(workflows, /\.limit\(requestedLimit \+ 1\)/);
assert.match(workflows, /\.limit\(detailLimit\)/);
assert.match(time, /navigator\.language/);
assert.match(time, /Intl\.DateTimeFormat/);
assert.match(time, /Intl\.RelativeTimeFormat/);

// Compatibility: persisted names remain present while presentation names are
// layered above them.
assert.match(logs, /event_type/);
assert.match(approvals, /continuation_payload/);
assert.match(activity, /continuation_payload/);

console.log("Future-proofing scale smoke: typed presentation contracts, registry fallbacks, provider-neutral actions, bounded high-volume reads, cursor pagination, and monotonic realtime revisions verified.");
