import assert from "node:assert/strict";
import fs from "node:fs";
// The workflow-note rendering lives in ApprovalExpandedReview.tsx (extracted
// out of page.tsx during the approvals queue/review componentization); the
// "no workflow builder" guard still applies to the whole approvals surface.
const approvalsReview = fs.readFileSync("src/app/app/approvals/ApprovalExpandedReview.tsx", "utf8");
const approvalsPage = fs.readFileSync("src/app/app/approvals/page.tsx", "utf8");
const api = fs.readFileSync("src/app/api/approvals/route.ts", "utf8");
assert.match(api, /workflowObjective/); assert.match(api, /workflowStepOrder/);
assert.match(approvalsReview, /Workflow action/); assert.match(approvalsReview, /Step \$\{workflow\.stepOrder\} of \$\{workflow\.stepCount\}/);
assert.doesNotMatch(approvalsPage, /workflow builder/i);
assert.doesNotMatch(approvalsReview, /workflow builder/i);
console.log("Workflow UI smoke: workflow-linked canonical approvals render objective, ordered step context, and no builder controls.");
