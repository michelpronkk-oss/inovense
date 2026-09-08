import assert from "node:assert/strict";
import fs from "node:fs";
const approvals = fs.readFileSync("src/app/app/approvals/page.tsx", "utf8");
const api = fs.readFileSync("src/app/api/approvals/route.ts", "utf8");
assert.match(api, /workflowObjective/); assert.match(api, /workflowStepOrder/);
assert.match(approvals, /Workflow action/); assert.match(approvals, /Step \$\{workflow\.stepOrder\} of \$\{workflow\.stepCount\}/);
assert.doesNotMatch(approvals, /workflow builder/i);
console.log("Workflow UI smoke: workflow-linked canonical approvals render objective, ordered step context, and no builder controls.");
