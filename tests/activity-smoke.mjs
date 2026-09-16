import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const navigation = read("src/lib/app-navigation.ts");
const route = read("src/app/api/activity/route.ts");
const dashboardRoute = read("src/app/api/dashboard/activity/route.ts");
const query = read("src/lib/activity/query.ts");
const normalize = read("src/lib/activity/normalize.ts");
const page = read("src/app/app/activity/page.tsx");
const dashboard = read("src/components/dashboard/overview.tsx");
const dashboardSource = read("src/lib/dashboard/overview.ts");
const workforceChart = read("src/components/dashboard/workforce-activity-chart.tsx");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-activity-"));

try {
  assert.ok(navigation.indexOf('id: "activity"') < navigation.indexOf('id: "logs"'), "Activity belongs immediately above Execution logs in shared navigation");
  assert.match(navigation, /mobileMoreSections/, "desktop and mobile navigation share the same source");
  assert.ok(fs.existsSync(path.join(root, "src/app/app/activity/page.tsx")), "Activity is an authenticated app route");
  assert.match(route, /getVerifiedSupabaseUser/);
  assert.match(route, /requireWorkspaceMember/);
assert.match(route, /resolveActiveWorkspaceId/);
assert.match(dashboardRoute, /getVerifiedSupabaseUser/);
assert.match(dashboardRoute, /requireWorkspaceMember/);
assert.match(dashboardRoute, /isWorkforceActivityRange/);
assert.doesNotMatch(dashboardRoute, /searchParams\.get\("workspaceId"\)/, "dashboard chart range never trusts a browser workspace id");
  assert.match(query, /eq\("workspace_id", input\.workspaceId\)/, "every activity source is server-scoped to the verified workspace");
  assert.match(normalize, /never exposed here/, "technical log messages are not serialized into activity");
  assert.doesNotMatch(normalize, /row\.message|email_body|raw_payload|prompt/i, "activity must not expose raw customer or provider content");
  assert.match(normalize, /category === "operator_run"/);
  assert.match(normalize, /category === "approval"/);
  assert.match(normalize, /category === "execution"/);
  assert.match(normalize, /category: "outcome"/);
  assert.match(normalize, /Action blocked by policy/);
  assert.match(normalize, /severity === "failure" \|\| item\.severity === "attention"/, "issues use only failed or attention states");
  // The dashboard's Workforce Activity chart is a real, connector/approval-
  // derived summary of the same activity model (not a duplicate feed) - the
  // dashboard intentionally no longer embeds its own scrollable "Recent
  // activity" list/avatar row (see the dashboard recomposition to the
  // Workforce activity / Workforce / Needs your review / Work in progress
  // reference layout); the full activity feed remains reachable at its own
  // real, separate page (asserted above), still linked from the shared nav.
  assert.match(dashboard, /WorkforceActivityChart/, "the dashboard renders the real chart component, not an inline placeholder");
  assert.match(workforceChart, /label: "Prepared"/);
  assert.match(workforceChart, /label: "Held at approval"/);
  assert.match(workforceChart, /label: "Executed"/);
  assert.doesNotMatch(dashboard, /Open logs/);
  assert.match(dashboardSource, /normalizeWorkforceActivity/, "dashboard uses the shared activity definition");
  assert.match(dashboardSource, /activitySummary/);
  assert.match(page, /Show more/);
  assert.match(page, /ActivityAvatar/);
  assert.match(page, /No workforce activity yet/);
  assert.ok(fs.existsSync(path.join(root, "src/app/app/logs/page.tsx")), "Execution Logs remains a separate technical surface");

  const source = normalize.replace(/import type .*?;\r?\n/gm, "");
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmpDir, "normalize.mjs");
  fs.writeFileSync(file, code);
  const mod = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);
  const result = mod.normalizeWorkforceActivity({
    rangeStart: "2026-09-01T00:00:00.000Z", rangeEnd: "2026-09-07T23:59:59.000Z",
    runs: [{ id: "run-1", operator_key: "revenue", status: "completed", created_at: "2026-09-07T10:00:00.000Z" }],
    approvals: [{ id: "approval-1", agent_id: "revenue", status: "approved", created_at: "2026-09-07T11:00:00.000Z", resolved_at: "2026-09-07T11:30:00.000Z", continuation_payload: { executionResult: { gmailStatus: "sent" } } }],
    logs: [],
    outcomes: [{ id: "outcome-1", operator_key: "support", workflow_id: "wf-1", outcome_type: "support_reply_received", attribution_level: "observed", observed_at: "2026-09-07T12:00:00.000Z" }],
  });
  assert.equal(result.summary.runs, 1);
  assert.equal(result.summary.approvals, 1);
  assert.equal(result.summary.actions, 1);
  assert.equal(result.summary.prepared, 1, "dashboard preparation series is derived from real approval records");
  assert.equal(result.summary.executed, 1, "dashboard execution series is derived from completed actions");
  assert.equal(result.summary.held, 0, "only unresolved approvals appear in the held series");
  assert.equal(result.items.some((item) => item.category === "outcome"), true, "observed business outcomes remain distinct from execution activity");
  assert.equal(result.items.some((item) => /sent/i.test(item.description)), false, "email content/status detail stays out of the human feed");
  assert.equal(result.summary.daily.length, 7, "seven-day dashboard timeline has one truthful bucket per day");

  // Workforce activity chart: bucket correctness, timezone safety, and dedup.
  const day1 = "2026-09-01"; const day7 = "2026-09-07";
  const chart = mod.normalizeWorkforceActivity({
    rangeStart: `${day1}T00:00:00.000Z`, rangeEnd: `${day7}T23:59:59.000Z`,
    runs: [],
    approvals: [
      // Pending (held) approval created just before midnight UTC - must land
      // in day1's bucket, not drift into day2 under a non-UTC interpretation.
      { id: "held-1", agent_id: "revenue", status: "pending", created_at: `${day1}T23:59:00.000Z` },
      // Approved-and-executed approval just after midnight UTC on day7.
      { id: "exec-1", agent_id: "support", status: "approved", created_at: `${day7}T00:05:00.000Z`, resolved_at: `${day7}T00:05:00.000Z`, continuation_payload: { executionResult: { gmailStatus: "sent" } } },
      // The exact same row reference appearing twice, as a defensive
      // duplicate-provider-event/retry simulation - must not double count.
      { id: "exec-1", agent_id: "support", status: "approved", created_at: `${day7}T00:05:00.000Z`, resolved_at: `${day7}T00:05:00.000Z`, continuation_payload: { executionResult: { gmailStatus: "sent" } } },
    ],
    logs: [], outcomes: [],
  });
  assert.equal(chart.summary.daily.length, 7, "missing days in the range still produce zero-filled buckets");
  assert.equal(chart.summary.daily.filter((day) => day.prepared === 0 && day.executed === 0 && day.held === 0).length, 5, "the five days with no activity are honest zero buckets, not omitted");
  const bucketDay1 = chart.summary.daily.find((day) => day.day === day1);
  const bucketDay7 = chart.summary.daily.find((day) => day.day === day7);
  assert.equal(bucketDay1?.held, 1, "a 23:59 UTC event lands in its own UTC day, not the next one");
  assert.equal(bucketDay1?.prepared, 1, "a held approval also counts as prepared work");
  assert.equal(bucketDay7?.executed, 1, "a 00:05 UTC event lands on that day, not the previous one");
  assert.equal(chart.summary.executed, 1, "a duplicated source row for the same approval id is not double-counted");
  assert.equal(chart.summary.prepared, 2, "prepared totals reflect each distinct approval once, regardless of a duplicated row");
  assert.equal(chart.summary.held, 1, "held totals only count approvals still pending, distinct from executed work");

  console.log("Activity navigation, workspace safety, normalization, and dashboard contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
