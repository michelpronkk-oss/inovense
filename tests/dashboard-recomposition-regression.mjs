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
const workforceChart = read("src/components/dashboard/workforce-activity-chart.tsx");
const approvalsPresentation = read("src/lib/approvals/presentation.ts");
const approvalsRoute = read("src/app/api/approvals/route.ts");
const workflowsPresentation = read("src/lib/workflows/presentation.ts");
const workflowsStage = read("src/lib/workflows/stage.ts");
const workflowsPage = read("src/app/app/workflows/page.tsx");

// ─────────────────────────────────────────────────────────────────────────
// A. Workforce activity chart - title, subtitle, legend, real series.
// Rebuilt as a real Recharts composition (workforce-activity-chart.tsx) in
// place of the original hand-rolled SVG polyline; these assertions guard
// the same intent (real data, no fabricated scale/duplicate summary row,
// honest legend) against the new implementation.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /Workforce activity<\/div>/, "the chart card title must be exact");
assert.match(dashboard, /Prepared work, confirmed execution, and items held for approval\./, "the chart subtitle must be exact and must not repeat the range control's own text");
assert.match(dashboard, /WorkforceActivityChart/, "the dashboard renders the real chart component");
assert.match(workforceChart, /label: "Prepared"/);
assert.match(workforceChart, /label: "Executed"/);
assert.match(workforceChart, /label: "Held at approval"/);
assert.match(workforceChart, /Math\.max\(1, \.\.\.data\.flatMap/, "the chart scale must be derived from real activity data, never a fixed/fabricated max");
assert.doesNotMatch(dashboard, /dashboard-activity-counts/, "the old duplicate numeric summary row above the chart must be removed to match the reference proportions");
assert.match(workforceChart, /dataKey="held"/, "held is plotted directly from the real per-day bucket, never a fabricated series");
assert.doesNotMatch(workforceChart, /Math\.random|faker|generateMock/i, "no randomized or fabricated point ever enters the chart");

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
// C. Needs your review - a compact triage row per pending approval, matched
// to the exact density/classes of a Work in progress row (.rows/.row/.grow/
// .ttl/.sub/.rt). The dashboard is triage, not the decision surface: no
// Why/Evidence/Policy/Consequence breakdown and no Approve/Edit/Reject
// actions here - a reviewer must see the actual prepared draft before
// acting, which only /approvals provides. See src/app/app/approvals/*.
// ─────────────────────────────────────────────────────────────────────────
assert.match(dashboard, /<div className="t-section" id="needs-review-title">Needs your review<\/div><Link className="btn btn-sm btn-ghost" href="\/approvals">Open approvals<\/Link>/, "the review card header must match the reference exactly");
assert.match(dashboard, /function NeedsYourReview/, "Needs your review must be its own component, reusable and testable like WorkInProgress");
assert.match(dashboard, /const items = overview\.approvals\.latest;/, "every pending approval in the real latest list must render as a row, not just the single newest one");
assert.match(dashboard, /<Link key={item\.id} href={item\.href} className="row link">/, "each approval must render with the exact same .row.link primitive Work in progress uses - not a bespoke card");
assert.match(dashboard, /<span className="ttl">{item\.title}<\/span>/, "the row title must read the real per-approval title");
assert.match(dashboard, /{titleCase\(item\.operatorKey\)} Operator · {timeAgo\(item\.createdAt\)}/, "the row's one metadata line must be operator + real age, matching Work in progress's own sub-line convention");
assert.match(dashboard, /<span className="badge amber">{item\.riskLevel \?/, "the row must show a risk or approval-required badge, using the same .badge amber vocabulary as the rest of the dashboard");
assert.match(dashboard, /"AWAITING APPROVAL"/, "the fallback badge label must remain honest when no risk level is available");
assert.match(dashboard, /Nothing needs your review\./, "an honest empty state must exist - never a fabricated approval");
assert.doesNotMatch(dashboard, /className="grid4"/, "the dashboard must no longer render the full Why\\/Evidence\\/Policy\\/Consequence breakdown - that detail now lives only on \\/approvals");
assert.doesNotMatch(dashboard, /Approve and send/, "Approve and send must not be actionable from the dashboard overview - a reviewer must see the prepared draft on \\/approvals before sending");
assert.doesNotMatch(dashboard, /"Edit draft"/, "Edit draft must not be offered from the dashboard overview");
assert.doesNotMatch(dashboard, />Reject</, "Reject must not be actionable from the dashboard overview");
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
// G. Preserved production logic: the dashboard no longer acts on approvals
// itself (moved to /approvals, see below), but it must still route a
// reviewer to the real per-approval href, and must still load through the
// real, workspace-scoped overview route.
// ─────────────────────────────────────────────────────────────────────────
assert.doesNotMatch(dashboard, /actOnApproval/, "the dashboard must no longer call the approve/reject action itself - Approve and send, Edit draft, and Reject now live only on /approvals");
assert.match(dashboard, /href={item\.href}/, "each compact review row must still link to the approval's real href");
assert.match(dashboard, /fetch\(`\/api\/dashboard\/overview\?/, "the dashboard must still load through the real, workspace-scoped overview route");

// Approve and send, Edit draft, and Reject must remain real and wired -
// just on /approvals, where the reviewer can see the actual prepared draft
// first, per this recomposition's explicit design decision.
const approvalsPage = read("src/app/app/approvals/page.tsx");
const approvalDecisionSummary = read("src/app/app/approvals/ApprovalDecisionSummary.tsx");
assert.match(approvalsPage, /actOnApproval\(item, "approve"\)/, "Approve and send must remain the real, wired approval action on /approvals");
assert.match(approvalsPage, /actOnApproval\(item, "reject", rejectReason\)/, "Reject must remain the real, wired approval action on /approvals");
assert.match(approvalDecisionSummary, /approval-approve-btn/, "the primary approve action must remain visually dominant on /approvals");
assert.match(approvalDecisionSummary, /approval-edit-btn/, "Edit draft must remain available on /approvals");
assert.match(approvalDecisionSummary, /approval-reject-btn/, "Reject must remain available on /approvals");

console.log("Dashboard recomposition regression contracts passed.");
