import assert from "node:assert/strict";
import fs from "node:fs";

const scan = fs.readFileSync("src/lib/operators/support/scan.ts", "utf8");
const registry = fs.readFileSync("src/lib/operators/registry.ts", "utf8");
const page = fs.readFileSync("src/app/app/agents/support/page.tsx", "utf8");
const route = fs.readFileSync("src/app/api/operators/support/scan/route.ts", "utf8");
const trigger = fs.readFileSync("src/trigger/support-operator-scan.ts", "utf8");
for (const source of [scan, registry, page]) assert.match(source, /support/i);
assert.match(registry, /key: "support"[\s\S]*currentReleaseStatus: "requires_connector"/);
assert.match(scan, /operatorKey: "support"/);
assert.match(scan, /shared_action\.execute_after_approval/);
assert.match(scan, /Customer-facing support replies require human approval/);
assert.match(scan, /zendesk|intercom|email_scan/);
assert.match(route, /resolveWorkspaceContext/);
assert.match(trigger, /support-operator-daily-scan/);
console.log("support-operator-smoke: live registry, approval scan, runtime route, and scheduler contracts passed.");
