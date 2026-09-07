import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const adapter = read("src/lib/connectors/asana.ts");
const registry = read("src/lib/connectors/registry.ts");
const oauthState = read("src/lib/connectors/oauth-state.ts");
const truth = read("src/lib/connectors/truth.ts");
const auth = read("src/app/api/connectors/asana/auth/route.ts");
const callback = read("src/app/api/connectors/asana/callback/route.ts");
const taskRoute = read("src/app/api/connectors/asana/tasks/[taskGid]/route.ts");

assert.match(adapter, /ASANA_REDIRECT_URI = "https:\/\/app\.auterim\.com\/api\/connectors\/asana\/callback"/);
assert.match(adapter, /encryptToken\(input\.token\.access_token\)/);
assert.match(adapter, /refreshAsanaAccessToken/);
assert.match(adapter, /limit=100/);
assert.match(adapter, /getAsanaTask/);
assert.match(taskRoute, /getAsanaTask/);
assert.match(registry, /connectorKey: "asana"[\s\S]*authType: "direct_oauth"/);
assert.match(registry, /connectorKey: "asana"[\s\S]*status: "available"/);
assert.match(oauthState, /DirectOAuthProvider = "microsoft" \| "salesforce" \| "asana"/);
assert.match(auth, /requireWorkspaceAdmin/);
assert.match(callback, /parseProviderOAuthState\("asana"/);
assert.match(callback, /toStoredAsanaCredential/);
assert.match(truth, /connectorKey: "asana"/);
console.log("Asana connector smoke checks passed: direct OAuth, signed state, encrypted storage, bounded reads, registry availability, and truthful health are wired.");
