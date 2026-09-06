import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const salesforce = read("src/lib/connectors/salesforce.ts");
const registry = read("src/lib/connectors/registry.ts");
const oauthState = read("src/lib/connectors/oauth-state.ts");
const auth = read("src/app/api/connectors/salesforce/auth/route.ts");
const callback = read("src/app/api/connectors/salesforce/callback/route.ts");
const disconnect = read("src/app/api/connectors/disconnect/route.ts");
const crm = read("src/lib/operators/revenue/crm.ts");
const salesforceRest = read("src/lib/connectors/salesforce-rest.ts");
const env = read(".env.example");

assert.match(registry, /salesforce: \{/);
assert.match(registry, /authType: "direct_oauth"/);
assert.match(registry, /status: "available", capabilities: \["crm\.contacts\.read", "crm\.deals\.read"\]/, "Salesforce must advertise real read capabilities and no write capabilities");
assert.doesNotMatch(registry.slice(registry.indexOf("salesforce: {"), registry.indexOf("stripe: {")), /crm\.contacts\.write|crm\.deals\.write|crm\.notes\.write|crm\.tasks\.write/, "Salesforce must not advertise any write capability in this pass");
assert.match(salesforce, /https:\/\/app\.auterim\.com\/api\/connectors\/salesforce\/callback/);
assert.doesNotMatch(salesforce, /\/app\/api\/connectors\/salesforce\/callback/);
assert.match(salesforce, /export function getSalesforceRedirectUri/);
assert.match(salesforce, /export function normalizeSalesforceInstanceUrl/);
assert.match(salesforce, /host\.endsWith\("\.salesforce\.com"\)/);
assert.match(salesforce, /host\.endsWith\("\.force\.com"\)/);
assert.match(salesforce, /encrypted_access_token: encryptToken/);
assert.match(salesforce, /encrypted_refresh_token: input\.token\.refresh_token \? encryptToken/);
assert.match(salesforce, /status: "needs_attention"/);
assert.match(oauthState, /createSalesforceOAuthState/);
assert.match(oauthState, /parseSalesforceOAuthState/);
assert.match(oauthState, /payload\.provider !== provider/);
assert.match(oauthState, /timingSafeEqual/);
assert.match(auth, /resolveWorkspaceContext/);
assert.doesNotMatch(auth, /searchParams\.get\("userEmail"\)/);
assert.doesNotMatch(auth, /searchParams\.get\("userId"\)/);
assert.match(callback, /parseSalesforceOAuthState/);
const callbackTry = callback.slice(callback.indexOf("try {"));
assert.ok(callbackTry.indexOf("parseSalesforceOAuthState") < callbackTry.indexOf("exchangeSalesforceCode"));
assert.match(callback, /onConflict: "workspace_id,connector_key"/);
assert.match(disconnect, /connectorKey === "salesforce"/);
assert.match(disconnect, /\.eq\("workspace_id", workspaceId\)[\s\S]*?\.eq\("connector_key", "salesforce"\)/);
assert.match(crm, /interface RevenueCrmAdapter/);
assert.match(crm, /const hubspotAdapter/);
assert.match(crm, /const salesforceAdapter/);
assert.match(crm, /status: "unsupported"/);

// Salesforce read-context implementation (this pass). Read-only: no
// Task/Note/Lead/Contact/Account/Opportunity mutation anywhere.
assert.match(crm, /supports: \(capability\) => SALESFORCE_READ_CAPABILITIES\.includes\(capability\)/, "salesforceAdapter must only ever advertise read capabilities");
assert.match(crm, /async findPersonByEmail\(workspaceId, email\) \{\s*\n\s*const credential = await getStoredSalesforceCredential/, "salesforceAdapter.findPersonByEmail must use the real Salesforce REST lookup");
assert.match(crm, /async getOpportunityContext\(workspaceId, person\)/, "salesforceAdapter must implement read-only company/opportunity context");
assert.match(crm, /async executeApprovedRevenueActions\(\) \{ return \{ status: "unsupported", provider: "salesforce", capability: "contact\.write" \}; \}/, "salesforceAdapter must never execute a Salesforce write");
assert.doesNotMatch(crm, /salesforceRequest\(.*"POST"|salesforceRequest\(.*"PATCH"|salesforceRequest\(.*"DELETE"/, "crm.ts must never issue a Salesforce mutation");

assert.match(salesforceRest, /export const SALESFORCE_API_VERSION/, "the Salesforce API version must be centralized in one constant");
assert.match(salesforceRest, /export function escapeSoqlString/);
assert.match(salesforceRest, /isAuthError\(error\)/, "the REST client must detect 401\\/INVALID_SESSION_ID to trigger a retry");
assert.match(salesforceRest, /forceRefreshSalesforceAccessToken/, "the REST client must retry exactly once via a forced refresh on an auth error");
assert.match(salesforceRest, /normalizeSalesforceInstanceUrl\(rawInstanceUrl\)/, "instanceUrl must be revalidated before every use as a fetch origin");
assert.match(salesforceRest, /FROM Contact WHERE Email = '\$\{safeEmail\}'/);
assert.match(salesforceRest, /FROM Lead WHERE Email = '\$\{safeEmail\}'/);
assert.match(salesforceRest, /IsClosed = false ORDER BY LastModifiedDate DESC/, "open opportunities must be selected deterministically, never a random pick");
const fetchCallSites = salesforceRest.match(/(?:return|await) fetch\(/g) ?? [];
assert.equal(fetchCallSites.length, 1, "salesforce-rest.ts must centralize all raw Salesforce fetch() calls in exactly one helper");
assert.match(salesforce, /export async function getStoredSalesforceCredential/);
assert.match(salesforce, /export async function forceRefreshSalesforceAccessToken/);

for (const name of ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REDIRECT_URI"]) assert.match(env, new RegExp(`^${name}=`, "m"));
assert.doesNotMatch(env, /NEXT_PUBLIC_SALESFORCE/);

console.log("Auterim Salesforce connector foundation smoke contracts passed.");
