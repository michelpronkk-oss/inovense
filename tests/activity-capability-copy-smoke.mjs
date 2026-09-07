import assert from "node:assert/strict";
import fs from "node:fs";

const capabilityLabels = fs.readFileSync("src/lib/operators/capability-labels.ts", "utf8");
const activity = fs.readFileSync("src/app/app/activity/page.tsx", "utf8");

assert.match(capabilityLabels, /"email\.read": "Inbound email monitoring"/);
assert.match(capabilityLabels, /"email\.send_after_approval": "Approval-gated email sending"/);
assert.match(capabilityLabels, /"email\.draft": "Follow-up drafting"/);
assert.match(capabilityLabels, /const label = capability\.replace/);
assert.match(capabilityLabels, /label\.charAt\(0\)\.toUpperCase\(\)/);
assert.match(activity, /Workforce history/);
assert.match(activity, /data\.summary\.total === 0 \? "No events recorded in this window"/);
assert.match(activity, /`\$\{data\.summary\.total\} event\$\{data\.summary\.total === 1 \? "" : "s"\} recorded in this window`/);
assert.doesNotMatch(activity, /recorded event\$\{/);
assert.match(activity, /key: "operator_run", label: "Runs"/);

console.log("Activity and capability copy checks passed: sentence case labels, separated history/count copy, pluralization, zero state, and stable internal identifiers.");
