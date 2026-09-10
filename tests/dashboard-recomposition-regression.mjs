import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regression coverage for the dashboard recomposition to the reference
// layout: Workforce activity chart, Workforce card, Needs your review card,
// Work in progress card. Real data only - no mock/fabricated business data,
// no parallel prototype dashboard, no weakened server-side approval/workflow
// logic. See src/components/dashboard/overview.tsx and
// src/lib/dashboard/overview.ts.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const dashboard = read("src/components/dashboard/overview.tsx");
const dashboardSource = read("src/lib/dashboard/overview.ts");
const approvalsPresentation = read("src/lib/approvals/presentation.ts");
const approvalsRoute = read("src/app/api/approvals/route.ts");
const workflowsPresentation = read("src/lib/workflows/presentation.ts");
const workflowsStage = read("src/lib/workflows/stage.ts");
const workflowsPage = read("src/app/app/workflows/page.tsx");

// ─────────────────────────────────────────────────────────────────────────
// A. Workforce activity chart - title, subtitle, legend, real series.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /Workforce activity<\/div>/, "the chart card title must be exact");
assert.match(dashboard, /Prepared against executed, last 7 days/, "the chart subtitle must be exact");
assert.match(dashboard, /<span className="t-meta">Prepared<\/span>/);
assert.match(dashboard, /<span className="t-meta">Executed<\/span>/);
assert.match(dashboard, /<span className="t-meta">Held at approval<\/span>/);
assert.match(dashboard, /const max = Math\.max\(\.\.\.summary\.daily\.flatMap/, "the chart scale must be derived from real activity data, never a fixed/fabricated max");
assert.doesNotMatch(dashboard, /dashboard-activity-counts/, "the old duplicate numeric summary row above the chart must be removed to match the reference proportions");
assert.match(dashboard, /item\.held <= 0\) return null/, "held markers must only render on days with real held-at-approval activity, never every day");

// ─────────────────────────────────────────────────────────────────────────
// B. Workforce card - all four canonical operators, real product-state
// labels, never filtered down to only the active/selected subset.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /const WORKFORCE_ORDER: ScanKey\[\] = \["revenue", "client_flow", "operations", "support"\]/, "the Workforce card must always show all four canonical operators");
assert.match(dashboard, /<div className="t-section" id="workforce-card-title">Workforce<\/div><Link className="btn btn-sm btn-ghost" href="\/agents">Manage<\/Link>/, "the Workforce card header must match the reference exactly");
assert.match(dashboard, /operatorMeta\[key\]\?\.tag \?\? item\.label/, "the operator descriptor must be a stable real capability tagline, not a live 'N pending · checked Xm ago' status line");
assert.match(dashboard, /<StatusBadge state={item\.state}>{item\.label}<\/StatusBadge>/, "the status pill must use the same canonical operatorProductState label everywhere else in the app, never re-derived");
assert.doesNotMatch(dashboard, /void runManualCheck/, "the dashboard Workforce card must not carry a manual-check action not present in the reference (it remains real and reachable from each operator's own page)");

// ─────────────────────────────────────────────────────────────────────────
// C. Needs your review - operator row, title, Why/Evidence/Policy/
// Consequence grid, action row. Real per-approval detail, not generic copy.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /<div className="t-section" id="needs-review-title">Needs your review<\/div><Link className="btn btn-sm btn-ghost" href="\/approvals">Open approvals<\/Link>/, "the review card header must match the reference exactly");
assert.match(dashboard, /<span className="badge amber">AWAITING APPROVAL<\/span>/);
assert.match(dashboard, /className="grid4"/, "Why/Evidence/Policy/Consequence must use the existing shared 4-column grid utility (already responsive), not a new one-off layout");
assert.match(dashboard, /<span className="t-meta">Why<\/span>/);
assert.match(dashboard, /<span className="t-meta">Evidence<\/span>/);
assert.match(dashboard, /<span className="t-meta">Policy<\/span>/);
assert.match(dashboard, /<span className="t-meta">Consequence<\/span>/);
assert.match(dashboard, /\{topApproval\.why /, "Why must read the real per-approval field");
assert.match(dashboard, /\{topApproval\.evidence /, "Evidence must read the real per-approval field");
assert.match(dashboard, /\{topApproval\.policy\}/, "Policy must read the real per-approval field");
assert.match(dashboard, /\{topApproval\.consequence /, "Consequence must read the real per-approval field");
assert.match(dashboard, /Approve and send/);
assert.match(dashboard, /topApproval\.canEditDraft \? "Edit draft" : "Open"/, "Edit draft must only be offered for approval kinds that actually support it (gmail\\/microsoft send-after-approval)");
assert.match(dashboard, /: "Reject"/);
assert.match(dashboard, /Nothing needs your review\./, "an honest empty state must exist - never a fabricated approval");
assert.doesNotMatch(dashboard, /Business context/, "the old Business context connector card is not part of the reference composition");
assert.doesNotMatch(dashboard, /<div className="t-section">Policy<\/div>/, "the old standalone Policy card is not part of the reference composition");
assert.doesNotMatch(dashboard, /Recent activity/, "the old Recent activity card is not part of the reference composition");

// ─────────────────────────────────────────────────────────────────────────
// D. Work in progress - real, active workflows, honest empty state, no
// fabricated rows.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /<div className="t-section" id="work-in-progress-title">Work in progress<\/div><Link className="btn btn-sm btn-ghost" href="\/workflows">All workflows<\/Link>/, "the work-in-progress card header must match the reference exactly");
assert.match(dashboard, /No active workflows right now\./, "an honest empty state must exist - never fabricated rows");
assert.match(dashboard, /item\.stage\.toUpperCase\(\)/, "the stage badge must come from the real workflow status mapping, not invented text");
assert.match(dashboard, /<ArrowIcon size=\{14\}/, "each row must end in a trailing chevron per the reference");
assert.match(dashboardSource, /workInProgress: workflowPresentations/, "work in progress must be built from the real workflow presentation list");
assert.match(dashboardSource, /!\["completed", "cancelled"\]\.includes\(workflow\.status\)/, "work in progress must exclude terminal workflows - it is an ACTIVE list");

// ─────────────────────────────────────────────────────────────────────────
// E. Real data plumbing: the dashboard reuses the SAME derivation the real
// /approvals and /workflows pages use - it does not invent a second,
// parallel copy of this logic.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboardSource, /from "@\/lib\/approvals\/presentation"/, "approval detail must come from the shared, reused derivation module");
assert.match(dashboardSource, /from "@\/lib\/workflows\/presentation"/, "work in progress must come from the shared, reused workflow presentation module");
assert.match(dashboardSource, /from "@\/lib\/workflows\/stage"/, "the stage badge mapping must be the shared, reused module");
assert.match(approvalsRoute, /from "@\/lib\/approvals\/presentation"/, "the real /approvals route must use the same shared module, not a second copy");
assert.doesNotMatch(approvalsRoute, /function approvalReason\(/, "approvalReason must no longer be locally redefined in the approvals route - it must be imported");
assert.doesNotMatch(approvalsRoute, /function expectedOutcome\(/, "expectedOutcome must no longer be locally redefined in the approvals route - it must be imported");
assert.match(workflowsPage, /from "@\/lib\/workflows\/stage"/, "the real /workflows page must use the same shared stage-mapping module the dashboard uses");
assert.doesNotMatch(workflowsPage, /function loopStageForStatus\(/, "loopStageForStatus must no longer be locally redefined in the workflows page - it must be imported");

// ─────────────────────────────────────────────────────────────────────────
// F. No mock/fabricated business data anywhere in the touched files - the
// reference screenshots' example names/data must never appear literally.
// ─────────────────────────────────────────────────────────────────────────
for (const fake of ["Northwind", "Elena Roos", "Vela Partners", "Atlas Studio", "northwind.co"]) {
  assert.doesNotMatch(dashboard, new RegExp(fake), `mock reference data "${fake}" must never be ported into the real dashboard`);
  assert.doesNotMatch(dashboardSource, new RegExp(fake), `mock reference data "${fake}" must never be ported into the real dashboard data layer`);
}
assert.doesNotMatch(dashboardSource, /Math\.random/, "no dashboard field may be randomly fabricated");

// ─────────────────────────────────────────────────────────────────────────
// G. Preserved production logic: real actions remain server-authoritative,
// unchanged by this presentation-only recomposition.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /void actOnApproval\(topApproval\.id, "approve"\)/, "Approve and send must remain the real, wired approval action");
assert.match(dashboard, /void actOnApproval\(topApproval\.id, "reject"\)/, "Reject must remain the real, wired approval action");
assert.match(dashboard, /fetch\(`\/api\/dashboard\/overview\?/, "the dashboard must still load through the real, workspace-scoped overview route");

console.log("Dashboard recomposition regression contracts passed.");
