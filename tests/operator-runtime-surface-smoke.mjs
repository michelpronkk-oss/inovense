import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const briefing = read("src/components/operators/workforce-briefing.tsx");
const activation = read("src/components/operators/activation-toggle.tsx");
const productState = read("src/lib/operators/product-state.ts");
const dashboard = read("src/components/dashboard/overview.tsx");
const client = read("src/app/app/agents/client-flow/page.tsx");
const operations = read("src/app/app/agents/operations/page.tsx");
const revenue = read("src/app/app/agents/revenue/page.tsx");

const visible = (source) => source.slice(source.indexOf("export default function"));
const revenueCompactStart = revenue.indexOf("  if (!showLegacyDiagnostics)");
const revenueLegacyStart = revenue.indexOf("\n  return (", revenueCompactStart);
const revenueCompact = revenue.slice(revenueCompactStart, revenueLegacyStart);
const clientVisible = visible(client);
const operationsVisible = visible(operations);

// 1. Healthy active operators resolve to the compact Active state.
assert.match(productState, /return hasOptionalDegradation \? "active_limited" : "active"/);
// 2. Optional degradation keeps the runtime active with limited context.
assert.match(productState, /active_limited: "Active · Limited context"/);
// 3. The remediation explanation has a single owner in the shared surface.
assert.equal((briefing.match(/\{action\.reason\}/g) ?? []).length, 1);
assert.equal((briefing.match(/\{action\.impact\}/g) ?? []).length, 1);
// 4. The page header owns the sole canonical status badge.
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.equal((source.match(/presentationState\.label/g) ?? []).length, 1);
assert.doesNotMatch(briefing, /product\?\.label/);
// 5. Runtime presentation contains no setup percentage.
assert.doesNotMatch(briefing, /readinessPercent/);
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.doesNotMatch(source, /readinessPercent/);
// 6. Active surfaces contain no onboarding-style almost-ready claim.
for (const source of [briefing, clientVisible, operationsVisible, revenueCompact]) assert.doesNotMatch(source, /almost ready/i);
// 7. Each live operator renders exactly one manual monitoring action.
for (const [name, source] of [["Client Flow", clientVisible], ["Operations", operationsVisible], ["Revenue", revenueCompact]]) {
  assert.equal((source.match(/Run manual check/g) ?? []).length, 1, `${name} must expose one manual check`);
}
// 8. Zero-work states use a compact line rather than a large empty grid.
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.match(source, /No issues need attention right now/);
assert.match(clientVisible, /operator-compact-empty/);
assert.match(operationsVisible, /operator-compact-empty/);
// 9. Optional context is expressed as capabilities.
for (const source of [client, operations, revenue]) assert.match(source, /getOperatorCapabilityCopy/);
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.match(source, /optionalContext\.join/);
// 10. The normal context surface does not map a growing provider dump.
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.doesNotMatch(source, /upgrades\.map|optionalUpsellConnectors\.map/);
// 11. Locked operators cannot render monitoring or current-work surfaces.
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.match(source, /showRuntime &&[\s\S]{0,1800}(Monitoring|operator-current-work)/);
// 12. Ready inactive operators use the activation control without runtime empty states.
assert.match(briefing, /Ready when you are/);
assert.match(activation, /Activate operator/);
assert.match(briefing, /const active = product\?\.lifecycle === "active"/);
// 13. Policy is translated into business language across all operators.
for (const source of [clientVisible, operationsVisible, revenueCompact]) assert.match(source, /Human review/);
assert.match(clientVisible, /Customer-facing messages/);
assert.match(operationsVisible, /Project updates/);
assert.match(revenueCompact, /CRM updates/);
// 14. Dashboard and detail surfaces continue to consume the shared truth model.
assert.match(dashboard, /item\.requiredActions\[0\]\.reason/);
for (const source of [client, operations, revenue]) assert.match(source, /OperatorWorkforceBriefing/);
// 15. Attention preserves exact reason, impact, label, and destination.
assert.match(briefing, /action\.reason/);
assert.match(briefing, /action\.impact/);
assert.match(briefing, /href=\{action\.href\}/);
assert.match(briefing, /\{action\.label\}/);
assert.match(briefing, /connectedCoreSystems\[0\]/);
// 16. Operations leads with the business capability; providers stay in Advanced.
assert.match(operationsVisible, /Monitors internal work, finds stalled tasks/);
assert.match(operationsVisible, /Advanced details[\s\S]*Project providers:/);
// 17. Revenue leads with commercial work rather than Gmail or HubSpot setup.
assert.match(revenueCompact, /Find opportunities and prepare follow-ups for approval/);
assert.doesNotMatch(revenueCompact.slice(0, revenueCompact.indexOf("Connection and policy details")), /Primary connection|Full CRM mode|Email-only mode/);
// 18. Technical internals are collapsed under native Advanced disclosures.
assert.match(clientVisible, /<details className="p operator-advanced"[\s\S]*readiness, schedule, skipped reasons, connector ids/);
assert.match(operationsVisible, /<details className="p operator-advanced"[\s\S]*schedule, provider state, readiness/);
assert.match(revenueCompact, /<details className="p operator-advanced"/);

console.log("operator-runtime-surface-smoke: 18 premium runtime surface contracts passed.");
