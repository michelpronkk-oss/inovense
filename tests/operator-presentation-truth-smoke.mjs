import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const state = read("src/lib/operators/product-state.ts");
const graph = read("src/lib/operators/connector-requirements.ts");
const dashboard = read("src/components/dashboard/overview.tsx");
const dashboardData = read("src/lib/dashboard/overview.ts");
const lifecycle = read("src/lib/dashboard/lifecycle.ts");
const briefing = read("src/components/operators/workforce-briefing.tsx");
const clientFlow = read("src/app/app/agents/client-flow/page.tsx");
const operations = read("src/app/app/agents/operations/page.tsx");
const support = read("src/app/app/agents/support/page.tsx");

assert.match(state, /needs_setup: "Available to unlock"/);
assert.match(state, /active_limited: "Active · Limited context"/);
assert.match(state, /return activated \? "needs_attention" : "needs_setup"/);
assert.match(state, /hasOptionalDegradation \? "active_limited" : "active"/);
assert.match(state, /lifecycle: "available_to_unlock" \| "ready_to_activate" \| "active" \| "paused" \| "blocked"/);
assert.match(state, /health: "healthy" \| "limited_context" \| "needs_attention" \| "billing_attention"/);
assert.match(state, /missingCoreCapabilities/);
assert.match(state, /missingOptionalCapabilities/);
assert.match(state, /requiredActions/);

assert.match(graph, /revenue:[\s\S]*required: \["email\.read", "email\.send_after_approval"\]/);
assert.match(graph, /client_flow:[\s\S]*required: \["email\.read", "email\.send_after_approval"\]/);
assert.match(graph, /operations:[\s\S]*required: \["pm\.tasks\.read"\]/);

assert.match(dashboard, /item\.requiredActions\[0\]\.reason/);
assert.match(dashboardData, /productStates: operatorProductStates/);
assert.match(lifecycle, /item\.state === "active_limited"/);

for (const [name, source] of [["Client Flow", clientFlow], ["Operations", operations]]) {
  assert.match(source, /OperatorWorkforceBriefing[\s\S]*onStateChange=/, `${name} must consume the shared presentation state`);
  assert.doesNotMatch(source, /almost ready|>Setup incomplete<|setup complete/, `${name} must not present onboarding progress in its primary UI`);
  assert.equal((source.match(/Run manual check/g) ?? []).length, 1, `${name} must render one manual check control`);
  assert.doesNotMatch(source, /<OperatorDegradedNotice/, `${name} attention must be part of the shared briefing`);
  assert.match(source, /recentPendingApprovals\?\.length \?\? 0\) > 0[\s\S]*btn btn-primary/, `${name} approval CTA must become primary only when work is waiting`);
}

assert.doesNotMatch(clientFlow, /Select Trello board\/list|Trello board and list selected/);
assert.match(briefing, /product\?\.state === "active_limited"/);
assert.match(briefing, /Core work continues/);
assert.match(state, /readiness\.operatorKey === "support"[\s\S]*readiness\.connectedRequiredConnectors/, "Support core context must come from its real OR-path readiness result");
assert.match(state, /state === "plan_required" \|\| state === "billing_attention" \|\| state === "suspended"[\s\S]*"blocked"/, "billing-gated operators must not present as active runtimes");
assert.match(briefing, /!active && !remediation && product\?\.nextAction/, "a plan-gated operator must expose its canonical next action");
assert.match(support, /Available via \$\{briefing\.connectedCoreSystems\.join/, "Support must name its live core provider instead of showing customer support as unavailable");

console.log("operator-presentation-truth-smoke: canonical state, capability, dashboard, and detail UX contracts passed.");
