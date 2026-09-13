import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const trigger = read("src/trigger/revenue-operator-scan.ts");
const manualRoute = read("src/app/api/operators/revenue/scan/route.ts");
const scan = read("src/lib/operators/revenue/scan.ts");
const status = read("src/app/api/operators/revenue/status/route.ts");
const revenue = read("src/app/app/agents/revenue/page.tsx");
const approvals = read("src/app/app/approvals/page.tsx");
const workflows = read("src/app/app/workflows/page.tsx");
const dashboard = read("src/components/dashboard/overview.tsx");
const activity = read("src/app/app/activity/page.tsx");

assert.match(trigger, /pattern: "0 \* \* \* \*"/, "Revenue must monitor automatically each hour");
assert.match(trigger, /scanRevenueOpportunities\(\{ workspaceId, sourceMode: "scheduled" \}\)/, "scheduled monitoring must use the canonical Revenue scanner");
assert.match(trigger, /scanRevenueOpportunities\(\{ workspaceId, sourceMode: "manual" \}\)/, "manual Trigger checks must use that same scanner");
assert.match(manualRoute, /scanRevenueOpportunities\([\s\S]*sourceMode: "manual"/, "app force-refresh must use the canonical scanner");
assert.match(scan, /consecutiveScheduledFailures: successful \? 0 : failed \? previousFailures \+ 1/, "only successful scheduled runs clear scheduled failure health");
assert.match(scan, /lastManualCheckAt: input\.lastRunAt/, "manual scans must be observed separately from scheduled monitoring");
assert.match(status, /getOperatorActivationState/, "paused state must reflect the explicit activation control");
assert.match(status, /"monitoring_issue"/, "scheduled failures must surface as a monitoring issue");
assert.match(status, /lastSuccessfulCheckAt/);
assert.match(status, /lastFailedCheckAt/);

assert.match(revenue, /window\.setInterval\(refresh, 15_000\)/, "Revenue should refresh without a browser reload");
assert.match(revenue, /Check now/);
assert.match(revenue, /No new Revenue work found/);
assert.match(revenue, /Technical details/);
assert.doesNotMatch(revenue, /scanSkippedSummary/, "raw skip reasons must not be the default manual-check result");
assert.match(approvals, /window\.setInterval\(refresh, 15_000\)/);
assert.match(workflows, /window\.setInterval\(refresh, 15_000\)/);
assert.match(dashboard, /setInterval\(refreshWhenVisible, 30_000\)/);
assert.match(activity, /setInterval\(\(\) => void refresh\(\), 30_000\)/);

console.log("Revenue monitoring UX smoke: shared scanner, hourly monitoring, honest health, human scan results, and live surface refresh passed.");
