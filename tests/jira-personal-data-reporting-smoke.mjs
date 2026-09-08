import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const source = fs.readFileSync("src/lib/connectors/jira-personal-data.ts", "utf8");
const scheduler = fs.readFileSync("src/trigger/jira-personal-data-reporting.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260908_jira_personal_data_reporting.sql", "utf8");
const jira = fs.readFileSync("src/lib/connectors/jira.ts", "utf8");
const disconnect = fs.readFileSync("src/app/api/connectors/disconnect/route.ts", "utf8");

assert.match(source, /JIRA_PERSONAL_DATA_REPORTING_URL = "https:\/\/api\.atlassian\.com\/app\/report-accounts\//);
assert.match(source, /JIRA_REPORT_BATCH_LIMIT = 90/);
assert.match(source, /provider_account_id/);
assert.match(source, /provider_email: null/);
assert.match(source, /status === "closed"/);
assert.match(source, /status === "updated"/);
assert.match(source, /Authorization: `Bearer \$\{token\}`/);
assert.doesNotMatch(source, /console\.(log|warn|error)\([^\n]*(response|body|text)/i);
assert.match(scheduler, /cron: \{ pattern: "17 3 \* \* \*", timezone: "UTC" \}/);
assert.match(scheduler, /concurrencyLimit: 1/);
assert.match(migration, /primary key \(workspace_id, account_id\)/i);
assert.match(migration, /check \(account_id <> 'unknown'\)/i);
assert.match(migration, /provider_email = null/);
assert.match(disconnect, /os_jira_personal_data_reports/);

const tmp = path.join("tests", ".tmp-jira-reporting");
fs.mkdirSync(tmp, { recursive: true });
try {
  const pure = source
    .replace(/^import[^\n]+\n/gm, "")
    .replace(/type SupabaseAdmin =[^\n]+\n/, "")
    .replace(/const fetchJiraIdentity[^\n]+\n/, "")
    .replace(/const resolveJiraAccessToken[^\n]+\n/, "")
    .replace(/const createSupabaseAdmin[^\n]+\n/, "");
  const stub = "const fetchJiraIdentity = async () => ({}); const resolveJiraAccessToken = async () => ''; const createSupabaseAdmin = () => ({});\n";
  const code = esbuild.transformSync(stub + pure, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "reporting.mjs");
  fs.writeFileSync(file, code);
  const mod = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);
  const rows = mod.dedupePersistedJiraAccounts([
    { workspaceId: "ws-a", accountId: "acct-1", dataUpdatedAt: "2026-01-02T00:00:00Z" },
    { workspaceId: "ws-a", accountId: "acct-1", dataUpdatedAt: "2026-01-03T00:00:00Z" },
    { workspaceId: "ws-b", accountId: "acct-1", dataUpdatedAt: "2026-01-04T00:00:00Z" },
    { workspaceId: "ws-a", accountId: "unknown", dataUpdatedAt: "2026-01-01T00:00:00Z" },
  ]);
  assert.deepEqual(rows, [
    { workspaceId: "ws-a", accountId: "acct-1", dataUpdatedAt: "2026-01-02T00:00:00Z" },
    { workspaceId: "ws-b", accountId: "acct-1", dataUpdatedAt: "2026-01-04T00:00:00Z" },
  ]);
  assert.equal(mod.batchJiraReportAccounts(Array.from({ length: 181 }, (_, i) => ({ workspaceId: "ws", accountId: `acct-${i}`, dataUpdatedAt: "2026-01-01T00:00:00Z" }))).length, 3);
  assert.equal(mod.batchJiraReportAccounts(Array.from({ length: 181 }, (_, i) => ({ workspaceId: "ws", accountId: `acct-${i}`, dataUpdatedAt: "2026-01-01T00:00:00Z" }))).every((batch) => batch.length <= 90), true);
  assert.deepEqual(mod.jiraReportBody([{ workspaceId: "ws", accountId: "acct-1", dataUpdatedAt: "2026-01-01T00:00:00Z" }]), { accounts: [{ accountId: "acct-1", updatedAt: "2026-01-01T00:00:00Z" }] });
  assert.equal(mod.cyclePeriodMs("86400"), 86400000);
  assert.equal(mod.cyclePeriodMs("invalid"), 7 * 24 * 60 * 60 * 1000);
  assert.deepEqual(mod.parseJiraReportResponse(200, JSON.stringify({ accounts: [{ accountId: "acct-1", status: "closed" }, { accountId: "acct-2", status: "updated" }] })), [{ accountId: "acct-1", status: "closed" }, { accountId: "acct-2", status: "updated" }]);
  assert.deepEqual(mod.parseJiraReportResponse(204, ""), []);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

assert.match(jira, /provider_account_id: input\.identity\?\.accountId/);
assert.match(jira, /provider_email: null/);
assert.doesNotMatch(jira, /fields=summary,description,status,priority,assignee,reporter/);
console.log("Jira personal-data reporting smoke: discovery, workspace dedupe, 90-account batches, safe body, cycle fallback, update/erase handling, and scheduler contracts verified.");
