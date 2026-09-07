import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const answerRoute = read("src/app/api/support/answer/route.ts");
const requestsRoute = read("src/app/api/support/requests/route.ts");
const drawer = read("src/components/dashboard/support-dialog.tsx");
const sidebar = read("src/components/dashboard/sidebar.tsx");
const migration = read("supabase/migrations/20260907_os_support_requests.sql");
const answer = read("src/lib/support/answer.ts");

assert.match(answerRoute, /resolveWorkspaceContext[\s\S]*allowDevFallback: false/);
assert.match(answerRoute, /getWorkspaceOperatorProductStates/);
assert.match(answerRoute, /question\.length > 1000/);
assert.match(requestsRoute, /resolveWorkspaceContext[\s\S]*allowDevFallback: false/);
assert.match(requestsRoute, /os_support_requests/);
assert.match(requestsRoute, /getConnectorTruth/);
assert.match(requestsRoute, /notification_failed/);
assert.match(migration, /enable row level security/);
assert.match(migration, /char_length\(message\) between 1 and 5000/);
assert.match(drawer, /Quick help/);
assert.match(drawer, /Ask Auterim/);
assert.match(drawer, /Contact support/);
assert.match(drawer, /\/api\/support\/answer/);
assert.match(drawer, /\/api\/support\/requests/);
assert.match(sidebar, /openSupport/);
assert.match(answer, /Salesforce writes are not enabled/);
console.log("support smoke checks passed");
