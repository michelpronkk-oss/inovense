import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the direct-OAuth Microsoft 365
// connector. Mirrors the style of tests/auth-security-smoke.mjs: no test
// runner, live DB, or live Microsoft/Graph endpoint is used - every check is
// a regression guard against the exact behaviors the task spec requires
// (redirect URI integrity, tenant strategy, state/CSRF, token
// storage/refresh/rotation, and the approval boundary between read and
// write Graph actions).

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const microsoftConnector = read("src/lib/connectors/microsoft.ts");
const refreshLock = read("src/lib/connectors/refresh-lock.ts");
const oauthState = read("src/lib/connectors/oauth-state.ts");
const authRoute = read("src/app/api/connectors/microsoft/auth/route.ts");
const callbackRoute = read("src/app/api/connectors/microsoft/callback/route.ts");
const microsoftExecutor = read("src/lib/operators/executors/microsoft.ts");
const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
const runOperator = read("src/lib/operators/runOperator.ts");
const registry = read("src/lib/connectors/registry.ts");
const truth = `${read("src/lib/connectors/truth-server.ts")}\n${read("src/lib/connectors/salesforce-truth.ts")}`;
const readiness = read("src/lib/operators/readiness.ts");
const disconnectRoute = read("src/app/api/connectors/disconnect/route.ts");
const subscriptionStore = read("src/lib/connectors/microsoft-subscriptions.ts");
const subscriptionTypes = read("src/lib/connectors/microsoft-subscription-types.ts");
const webhookRoute = read("src/app/api/connectors/microsoft/webhook/route.ts");
const lifecycleRoute = read("src/app/api/connectors/microsoft/lifecycle/route.ts");

// ── A. Authorization URL contract: client_id, tenant=organizations default,
//       exact redirect_uri source, exact scopes, state ──────────────────
assert.match(microsoftConnector, /client_id: clientId/, "authorize URL must include client_id");
assert.match(microsoftConnector, /required\("MICROSOFT_CLIENT_ID"\)/, "client_id must come from MICROSOFT_CLIENT_ID env var");
assert.match(microsoftConnector, /return "organizations";/, "tenant segment must use the organizations endpoint");
assert.doesNotMatch(microsoftConnector, /login\.microsoftonline\.com\/common/, "must never hard-code the common endpoint");
assert.doesNotMatch(microsoftConnector, /login\.microsoftonline\.com\/consumers/, "must never hard-code the consumers endpoint");
assert.match(microsoftConnector, /MICROSOFT_OAUTH_SCOPES = \[\.\.\.MICROSOFT_OPENID_SCOPES, \.\.\.MICROSOFT_GRAPH_SCOPES\]/, "authorize request must build scopes from the declared scope list");
for (const scope of ["openid", "profile", "offline_access", "User.Read", "Mail.Read", "Mail.Send"]) {
  assert.match(microsoftConnector, new RegExp(scope.replace(".", "\\.")), `required scope ${scope} must be requested`);
}
assert.doesNotMatch(microsoftConnector, /Calendars\.ReadWrite/, "the Microsoft connector must not request Calendar permission");
assert.doesNotMatch(registry, /microsoft:[\s\S]{0,1200}calendar\.events/, "the Microsoft catalog entry must not advertise Calendar capabilities");
// No broader/application-permission scopes.
for (const forbidden of ["Mail.ReadWrite.All", "Mail.Send.Shared", "Directory.Read.All", "User.ReadWrite.All"]) {
  assert.doesNotMatch(microsoftConnector, new RegExp(forbidden.replace(/\./g, "\\.")), `must never request ${forbidden}`);
}
// The authorize/exchange scope param is now built from a named scope profile
// ("base" = Outlook Mail, "teams" = base + delegated Teams
// scopes for incremental consent), never a literal string. Both profiles are
// still derived from the declared scope arrays above.
assert.match(microsoftConnector, /scope: microsoftScopesForProfile\(profile\)\.join\(" "\)/, "authorize/exchange scope param must be built from the declared scope profile, not a literal string");
assert.match(microsoftConnector, /export function microsoftScopesForProfile/, "a single scope-profile resolver must exist");
assert.match(microsoftConnector, /return profile === "teams" \? MICROSOFT_TEAMS_OAUTH_SCOPES : MICROSOFT_OAUTH_SCOPES;/, "the base profile must never include Teams scopes");
assert.match(microsoftConnector, /MICROSOFT_TEAMS_OAUTH_SCOPES = \[\.\.\.MICROSOFT_OAUTH_SCOPES, \.\.\.MICROSOFT_TEAMS_GRAPH_SCOPES\]/, "the Teams profile must extend, never replace, the base Microsoft scopes");
assert.match(microsoftConnector, /\n\s+state,\n/, "authorize URL must include the CSRF state parameter");
assert.match(microsoftConnector, /code_challenge_method: "S256"/, "authorization code flow must use PKCE S256");
assert.match(authRoute, /createPkceCodeVerifier/);
assert.match(authRoute, /persistMicrosoftOAuthState/);
assert.match(callbackRoute, /consumeMicrosoftOAuthState/);
assert.match(callbackRoute, /codeVerifier/);

// ── B. Callback uses the exact same redirect URI as the authorize step ───
assert.match(microsoftConnector, /export function getMicrosoftRedirectUri/, "a single redirect URI resolver must exist");
const authUrlUsesRedirect = /buildMicrosoftAuthUrl[\s\S]*?getMicrosoftRedirectUri\(\)/.test(microsoftConnector);
const tokenExchangeUsesRedirect = /exchangeCodeForTokens[\s\S]*?getMicrosoftRedirectUri\(\)/.test(microsoftConnector);
assert.ok(authUrlUsesRedirect, "buildMicrosoftAuthUrl must call getMicrosoftRedirectUri()");
assert.ok(tokenExchangeUsesRedirect, "exchangeCodeForTokens must call getMicrosoftRedirectUri()");
assert.match(microsoftConnector, /CANONICAL_MICROSOFT_REDIRECT_PATH = "\/api\/connectors\/microsoft\/callback"/, "canonical redirect path must match the production route exactly");
assert.match(microsoftConnector, /url\.hostname === "app\.auterim\.com" && url\.pathname === CANONICAL_MICROSOFT_REDIRECT_PATH/, "production redirect URI must be validated against the exact host+path");
assert.doesNotMatch(microsoftConnector, /window\.location\.(href|hostname|origin)/, "redirect URI must never be derived from window.location");
assert.doesNotMatch(microsoftConnector, /req\.headers\.get\("host"\)/, "redirect URI must never be derived from the request host");
assert.doesNotMatch(microsoftConnector, /import\s*\{[^}]*getAppUrl/, "redirect URI must never be derived from getAppUrl() - only MICROSOFT_REDIRECT_URI");

// ── C. Invalid/missing state rejected ─────────────────────────────────────
assert.match(oauthState, /export function createMicrosoftOAuthState/);
assert.match(oauthState, /export function parseMicrosoftOAuthState/);
assert.match(oauthState, /timingSafeEqual/, "OAuth state signatures must be compared in constant time");
assert.match(oauthState, /export function createPkceCodeChallenge/);
assert.match(oauthState, /export function hashOAuthState/);
assert.match(oauthState, /if \(payload\.provider !== "microsoft"\) throw new Error\("OAuth state provider mismatch"\);/, "Microsoft state must reject state minted for a different provider");
assert.match(oauthState, /if \(Date\.now\(\) > payload\.exp\) throw new Error\("OAuth state expired"\);/);
assert.match(callbackRoute, /parseMicrosoftOAuthState\(stateRaw\)/, "callback must validate state before any token exchange");
// State parsing must happen inside the try block, before exchangeCodeForTokens.
const callbackTryBlock = callbackRoute.slice(callbackRoute.indexOf("try {"));
assert.ok(
  callbackTryBlock.indexOf("parseMicrosoftOAuthState") < callbackTryBlock.indexOf("exchangeCodeForTokens"),
  "state must be validated before the code is exchanged"
);

// ── D/E/F. Successful code exchange, /me identity, tenant id capture ─────
assert.match(microsoftConnector, /export async function exchangeCodeForTokens/);
assert.match(microsoftConnector, /grant_type: "authorization_code"/);
assert.match(microsoftConnector, /export async function fetchMicrosoftProfile/);
assert.match(microsoftConnector, /export function decodeIdTokenClaims/);
assert.match(microsoftConnector, /tid\?: string;/, "id_token claims must capture the tenant id (tid)");
assert.match(callbackRoute, /decodeIdTokenClaims\(tokenData\.id_token\)/);
assert.match(callbackRoute, /tenantId: idClaims\.tid/, "the actual customer tenant id must be stored, not assumed");
assert.match(microsoftConnector, /connector_key: "microsoft"/);
assert.match(microsoftConnector, /provider_email: input\.providerEmail/);
assert.match(microsoftConnector, /provider_account_id: input\.providerAccountId/);

// ── G/H. Refresh flow + rotation + revoked/expired handling ───────────────
assert.match(microsoftConnector, /export async function refreshAccessToken/);
assert.match(microsoftConnector, /grant_type: "refresh_token"/);
assert.match(microsoftConnector, /export async function resolveMicrosoftAccessToken/);
// Rotation is now persisted by the shared distributed refresh lock, which
// re-encrypts the rotated token under a credential_version compare-and-swap so
// a stale worker can never overwrite a newer one. The old token is discarded;
// a provider that returns none keeps the existing, still-valid token.
assert.match(microsoftConnector, /resolveAccessTokenWithRefreshLock/, "Microsoft's rotating refresh tokens must be coordinated across workers");
assert.match(microsoftConnector, /connectorKey: "microsoft"/, "the refresh lease must be scoped to the Microsoft credential");
assert.match(microsoftConnector, /refreshToken: refreshed\.refresh_token \?\? null/, "a rotated refresh token must be handed to the lock helper for persistence");
assert.match(refreshLock, /encrypted_refresh_token: refreshed\.refreshToken \? encryptToken\(refreshed\.refreshToken\) : latest\.encrypted_refresh_token \?\? null/, "the new refresh token must be re-encrypted and stored");
assert.match(refreshLock, /\.eq\("credential_version", expectedVersion\)/, "a stale worker must never overwrite a newer rotated refresh token");
assert.match(microsoftConnector, /export function isMicrosoftReauthRequiredError/);
assert.match(microsoftConnector, /status: "needs_attention"/, "a dead refresh token must mark the connector needs_attention");
assert.match(microsoftConnector, /inFlightRefreshes/, "concurrent refresh calls for the same workspace must be deduped");
assert.match(microsoftConnector, /class MicrosoftReauthRequiredError extends Error/);

// ── I. Cross-workspace access rejected ────────────────────────────────────
assert.doesNotMatch(authRoute, /searchParams\.get\("userEmail"\)/, "the Microsoft auth route must never trust a caller-supplied userEmail");
assert.doesNotMatch(authRoute, /searchParams\.get\("userId"\)/, "the Microsoft auth route must never trust a caller-supplied userId");
assert.match(authRoute, /resolveWorkspaceContext/, "the Microsoft auth route must resolve workspace membership from the verified session");
assert.match(authRoute, /createMicrosoftOAuthState\(workspaceId, userEmail, scopeProfile\)/, "state must bind the verified workspace and the server-decided scope profile, not client-supplied values");
assert.match(approveRoute, /microsoftPayload\.workspaceId !== context\.workspaceId \|\| approvalRow\.workspace_id !== context\.workspaceId/, "cross-workspace approval execution must be rejected");

// ── J/L. Read actions require no approval ─────────────────────────────────
assert.match(microsoftConnector, /export async function listRecentMicrosoftMessages/);
assert.doesNotMatch(microsoftExecutor, /listRecentMicrosoftMessagesForWorkspace[\s\S]{0,400}os_approvals/, "reading recent mail must never create an approval");

// ── K. Mail.Send stays policy/approval controlled ─────────────────────────
assert.match(microsoftExecutor, /export async function createMicrosoftSendApproval/);
assert.match(microsoftExecutor, /kind: "microsoft\.send_after_approval"/);
assert.match(microsoftExecutor, /export async function sendMicrosoftMessageAfterApproval/);
// runOperator must only ever create an approval for Microsoft sends - it must
// never call the actual Graph send function directly.
assert.doesNotMatch(runOperator, /sendMicrosoftMessageAfterApproval/, "runOperator must never send Microsoft mail directly - only create an approval");
assert.match(runOperator, /createMicrosoftSendApproval/);
// The only caller of sendMicrosoftMessageAfterApproval must be the approval
// execution path.
assert.match(approveRoute, /await sendMicrosoftMessageAfterApproval\(/);
assert.match(approveRoute, /continuationKind === "microsoft\.send_after_approval"/);

// ── M. Outlook/Teams subscriptions stay durable and authenticated ─────────
assert.match(subscriptionStore, /MICROSOFT_OUTLOOK_RESOURCE = "me\/mailFolders\('Inbox'\)\/messages"/);
assert.match(subscriptionStore, /changeType: MICROSOFT_SUBSCRIPTION_CHANGE_TYPE/);
assert.match(subscriptionStore, /includeResourceData: false/);
assert.match(subscriptionStore, /lifecycleNotificationUrl/);
assert.match(subscriptionStore, /status: "needs_attention"/);
assert.match(subscriptionStore, /claim_os_microsoft_subscription_lease/);
assert.match(subscriptionStore, /reauthorize/);
assert.match(subscriptionTypes, /subscriptionMetadata/);
assert.match(webhookRoute, /validationToken/);
assert.match(webhookRoute, /timingSafeEqual|constantTimeClientStateMatches/);
assert.match(webhookRoute, /ingestProviderEvent/);
assert.match(webhookRoute, /202/);
assert.match(lifecycleRoute, /reauthorizationRequired/);
assert.match(lifecycleRoute, /subscriptionRemoved/);
assert.match(lifecycleRoute, /missed/);

// ── N. Disconnect/reconnect ────────────────────────────────────────────────
assert.match(disconnectRoute, /connectorKey === "microsoft"/, "disconnect route must support the microsoft connector key");
assert.match(disconnectRoute, /\.eq\("connector_key", "microsoft"\)/);
assert.match(authRoute, /buildMicrosoftAuthUrl\(state, scopeProfile, codeChallenge\)/, "reconnect re-initiates the same OAuth flow with the same scope profile and PKCE");
assert.match(callbackRoute, /onConflict: "workspace_id,connector_key"/, "reconnect must upsert (replace) the existing credential, not duplicate it");

// ── Registry / readiness / truth wiring ───────────────────────────────────
assert.match(registry, /microsoft: \{/, "the microsoft connector must exist in the catalog");
assert.match(registry, /authType: "direct_oauth"/);
assert.doesNotMatch(registry, /outlook: \{/, "the old Nango-based outlook catalog entry must be removed");
assert.match(truth, /connectorKey: "microsoft"/);
assert.match(readiness, /GENERIC_TRUTH_CONNECTORS: ConnectorKey\[\] = \[[^\]]*"microsoft"[^\]]*\]/, "microsoft must remain one of the connectors readiness.ts can check truth for (see connectorConnected)");

// ── Env validation / safe failure ─────────────────────────────────────────
assert.match(microsoftConnector, /export function getMicrosoftConfigStatus/);
assert.match(authRoute, /getMicrosoftConfigStatus/);
assert.doesNotMatch(authRoute, /console\.error\([^)]*MICROSOFT_CLIENT_SECRET/i, "missing-config logging must never include secret values");

console.log("Auterim Microsoft 365 connector smoke contracts passed.");
