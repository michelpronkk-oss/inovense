import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const store = read("src/lib/connectors/microsoft-subscriptions.ts");
const types = read("src/lib/connectors/microsoft-subscription-types.ts");
const webhook = read("src/app/api/connectors/microsoft/webhook/route.ts");
const lifecycle = read("src/app/api/connectors/microsoft/lifecycle/route.ts");
const eventTask = read("src/trigger/microsoft-event-process.ts");
const renewal = read("src/trigger/microsoft-subscription-renewal.ts");
const lifecycleTask = read("src/trigger/microsoft-subscription-lifecycle.ts");
const migration = read("supabase/migrations/20260916_microsoft_connector_lifecycle.sql");

assert.match(store, /MICROSOFT_OUTLOOK_RESOURCE = "me\/mailFolders\('Inbox'\)\/messages"/);
assert.match(store, /MICROSOFT_SUBSCRIPTION_CHANGE_TYPE = "created"/);
assert.match(store, /includeResourceData: false/);
assert.match(store, /lifecycleNotificationUrl/);
assert.match(store, /claim_os_microsoft_subscription_lease/);
assert.match(store, /reauthorize/);
assert.match(types, /status === "active"/);

assert.match(webhook, /validationToken/);
assert.match(webhook, /request\.text\(\)/);
assert.match(webhook, /constantTimeClientStateMatches/);
assert.match(webhook, /ingestProviderEvent/);
assert.match(webhook, /microsoftEventProcess\.trigger/);
assert.match(webhook, /status = 202/);
assert.match(lifecycle, /subscriptionRemoved/);
assert.match(lifecycle, /reauthorizationRequired/);
assert.match(lifecycle, /missed/);
assert.match(lifecycle, /microsoftSubscriptionLifecycle\.trigger/);
assert.match(eventTask, /\["webhook", "reconciliation"\]/);
assert.match(renewal, /cron: \{ pattern: "\*\/10 \* \* \* \*"/);
assert.match(renewal, /claimMicrosoftSubscriptionLease/);
assert.match(lifecycleTask, /dispatchReconciliation/);
assert.match(lifecycleTask, /listRecentMicrosoftMessages/);
assert.match(lifecycleTask, /listRecentChannelMessages/);

assert.match(migration, /create table if not exists public\.os_microsoft_oauth_states/);
assert.match(migration, /create table if not exists public\.os_microsoft_subscriptions/);
assert.match(migration, /unique \(workspace_id, capability, resource, change_type\)/);
assert.match(migration, /create or replace function public\.claim_os_microsoft_subscription_lease/);
assert.match(migration, /revoke all on public\.os_microsoft_subscriptions from anon, authenticated/);

console.log("Microsoft subscription and lifecycle smoke contracts passed.");
