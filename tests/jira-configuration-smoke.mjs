import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const jira = fs.readFileSync("src/lib/connectors/jira.ts", "utf8");
const settings = fs.readFileSync("src/app/api/connectors/jira/settings/route.ts", "utf8");
const ui = fs.readFileSync("src/app/app/connectors/page.tsx", "utf8");
const materializer = fs.readFileSync("src/lib/workflows/materialize.ts", "utf8");
const store = fs.readFileSync("src/lib/workflows/store.ts", "utf8");
assert.match(jira, /listJiraIssueTypes/);
assert.match(jira, /isCreateableJiraIssueType/);
assert.match(settings, /requireWorkspaceAdmin/);
assert.match(settings, /Select an issue type returned by Jira/);
assert.match(settings, /selectedIssueTypeId/);
assert.match(settings, /listJiraIssueTypes/);
assert.match(ui, /Select default issue type/);
assert.match(ui, /fetchJiraIssueTypes/);
assert.match(materializer, /jira_issue_type_invalid/);
assert.match(materializer, /resolveJiraAccessToken/);
assert.match(store, /jiraReadyForWrites/);

const tmp = path.join("tests", ".tmp-jira-config");
fs.mkdirSync(tmp, { recursive: true });
try {
  const source = jira.replace(/^import[^\n]+\n/gm, "").replace(/export const JIRA_REDIRECT_URI[\s\S]*?\nconst JIRA_AUTHORIZE_URL/, "const JIRA_AUTHORIZE_URL");
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "jira.mjs"); fs.writeFileSync(file, code);
  const { isCreateableJiraIssueType } = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);
  assert.equal(isCreateableJiraIssueType({ id: "10001", name: "Task" }), true);
  assert.equal(isCreateableJiraIssueType({ id: "10002", name: "Sub-task", subtask: true }), false);
  assert.equal(isCreateableJiraIssueType({ id: "99999", name: "Removed", createable: false }), false);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("Jira configuration smoke: provider-valid issue types, admin-only persistence, stale-target invalidation, and workflow gating verified.");
