import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const auth = read("src/app/api/connectors/slack/auth/route.ts");
const callback = read("src/app/api/connectors/slack/callback/route.ts");
const slack = read("src/lib/connectors/slack.ts");
const legacy = read("src/lib/connectors/legacy-nango.ts");
const truth = read("src/lib/connectors/truth.ts");

assert.match(auth, /buildSlackAuthorizationUrl/);
assert.match(auth, /createProviderOAuthState\("slack"/);
assert.match(auth, /requireWorkspaceAdmin/);
assert.match(callback, /exchangeSlackCode/);
assert.match(callback, /toStoredSlackCredential/);
assert.match(callback, /os_connector_credentials/);
assert.match(callback, /clearLegacyNangoConnection/);
assert.match(slack, /resolveAccessTokenWithRefreshLock/);
assert.match(slack, /chat:write/);
assert.match(legacy, /legacy Nango/);
assert.match(truth, /connectorKey === SLACK_CONNECTOR_KEY/);
assert.match(truth, /source: slackRow \? "native"/);
console.log("Slack direct OAuth smoke contracts passed.");
