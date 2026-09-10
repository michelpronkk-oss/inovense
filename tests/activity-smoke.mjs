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
const query = read("src/lib/activity/query.ts");
const normalize = read("src/lib/activity/normalize.ts");
const page = read("src/app/app/activity/page.tsx");
const dashboard = read("src/components/dashboard/overview.tsx");
const dashboardSource = read("src/lib/dashboard/overview.ts");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-activity-"));

try {
  assert.ok(navigation.indexOf('id: "activity"') < navigation.indexOf('id: "logs"'), "Activity belongs immediately above Execution logs in shared navigation");
  assert.match(navigation, /mobileMoreSections/, "desktop and mobile navigation share the same source");
  assert.ok(fs.existsSync(path.join(root, "src/app/app/activity/page.tsx")), "Activity is an authenticated app route");
  assert.match(route, /getVerifiedSupabaseUser/);
  assert.match(route, /requireWorkspaceMember/);
  assert.match(route, /resolveActiveWorkspaceId/);
  assert.match(query, /eq\("workspace_id", input\.workspaceId\)/, "every activity source is server-scoped to the verified workspace");
  assert.match(normalize, /never exposed here/, "technical log messages are not serialized into activity");
  assert.doesNotMatch(normalize, /row\.message|email_body|raw_payload|prompt/i, "activity must not expose raw customer or provider content");
  assert.match(normalize, /category === "operator_run"/);
  assert.match(normalize, /category === "approval"/);
  assert.match(normalize, /category === "execution"/);
  assert.match(normalize, /Action blocked by policy/);
  assert.match(normalize, /severity === "failure" \|\| item\.severity === "attention"/, "issues use only failed or attention states");
  assert.match(dashboard, /All activity/);
  assert.match(dashboard, /ActivityAvatar/);
  assert.match(dashboard, /Prepared/);
  assert.match(dashboard, /Held at approval/);
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
  });
  assert.equal(result.summary.runs, 1);
  assert.equal(result.summary.approvals, 1);
  assert.equal(result.summary.actions, 1);
  assert.equal(result.summary.prepared, 1, "dashboard preparation series is derived from real approval records");
  assert.equal(result.summary.executed, 1, "dashboard execution series is derived from completed actions");
  assert.equal(result.summary.held, 0, "only unresolved approvals appear in the held series");
  assert.equal(result.items.some((item) => /sent/i.test(item.description)), false, "email content/status detail stays out of the human feed");
  assert.equal(result.summary.daily.length, 7, "seven-day dashboard timeline has one truthful bucket per day");
  console.log("Activity navigation, workspace safety, normalization, and dashboard contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
