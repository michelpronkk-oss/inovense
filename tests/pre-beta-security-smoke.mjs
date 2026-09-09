import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const draft = read("src/app/api/connectors/gmail/draft/route.ts");
assert.match(draft, /getVerifiedSupabaseUser/);
assert.match(draft, /\.eq\("user_id", user\.id\)/);
assert.match(draft, /\.eq\("active", true\)/);
assert.match(draft, /\.neq\("status", "pending"\)/);
assert.match(draft, /status: 429/);
assert.doesNotMatch(draft, /userEmail\?: string/);

const webhook = read("src/app/api/billing/dodo/webhook/route.ts");
assert.match(webhook, /isDodoWebhookTimestampFresh/);
assert.match(webhook, /Webhook body is too large/);
assert.match(webhook, /Malformed webhook payload/);
assert.match(webhook, /warning_unknown_event_type/);
assert.match(webhook, /Unknown event type ignored/);
assert.doesNotMatch(webhook, /Failed to persist billing event:.*insertEvent\.error\.message/);

const dodo = read("src/lib/billing/dodo.ts");
assert.match(dodo, /Math\.abs\(nowMs \/ 1000 - seconds\) <= 5 \* 60/);

const headers = read("next.config.ts");
for (const header of ["X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy", "Referrer-Policy", "Permissions-Policy"]) {
  assert.match(headers, new RegExp(header));
}

const contact = read("src/app/api/contact/route.ts");
assert.match(contact, /requestBodyWithinLimit/);
assert.match(contact, /status: 429/);
assert.doesNotMatch(contact, /console\.log\("\[contact\]"/);
assert.match(read("src/app/api/admin/system-map/route.ts"), /requireInternalAdmin/);
const inspector = read("src/lib/agents/lead-research/site-inspector.ts");
assert.match(inspector, /node:dns\/promises/);
assert.match(inspector, /Private or local network URLs are not supported/);
assert.match(inspector, /redirect: "manual"/);
assert.match(inspector, /MAX_REDIRECTS = 3/);

console.log("pre-beta-security-smoke: all focused security checks passed.");
