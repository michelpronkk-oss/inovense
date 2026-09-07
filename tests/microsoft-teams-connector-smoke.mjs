import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for the Microsoft Teams connector.
// Same style as tests/microsoft-connector-smoke.mjs and
// tests/salesforce-connector-smoke.mjs: no test runner, no live DB, no live
// Microsoft Graph call. Every check is a regression guard against the exact
// safety properties Teams must keep:
//
//   auth        - shared Microsoft OAuth, admin-only consent, signed state
//   scopes      - minimal delegated scopes, never inferred from mail access
//   health      - truthful ladder, no fake "Teams connected"
//   read        - bounded, sanitized, SSRF-safe, refresh/rate-limit bounded
//   write       - capability + eligibility + policy + approval + audit
//   truth       - live in the catalog/roadmap/system map, no fake claims

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const microsoft = read("src/lib/connectors/microsoft.ts");
const teams = read("src/lib/connectors/microsoft-teams.ts");
const teamsExecutor = read("src/lib/operators/executors/microsoft-teams.ts");
const teamsSignals = read("src/lib/signals/teams.ts");
const oauthState = read("src/lib/connectors/oauth-state.ts");
const authRoute = read("src/app/api/connectors/microsoft/auth/route.ts");
const callbackRoute = read("src/app/api/connectors/microsoft/callback/route.ts");
const settingsRoute = read("src/app/api/connectors/microsoft/teams/settings/route.ts");
const channelsRoute = read("src/app/api/connectors/microsoft/teams/channels/route.ts");
const disconnectRoute = read("src/app/api/connectors/disconnect/route.ts");
const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
const registry = read("src/lib/connectors/registry.ts");
const actionRegistry = read("src/lib/actions/registry.ts");
const truth = read("src/lib/connectors/truth.ts");
const evaluate = read("src/lib/policies/evaluate.ts");
const executionPolicy = read("src/lib/policies/execution-policy.ts");
const workspacePolicy = read("src/lib/policies/workspace-policy.ts");
const operationsScan = read("src/lib/operators/operations/scan.ts");
const clientFlowScan = read("src/lib/operators/client-flow/scan.ts");
const runOperator = read("src/lib/operators/runOperator.ts");
const connectorsPage = read("src/app/app/connectors/page.tsx");
const notifications = read("src/lib/notifications/workspace-notifications.ts");
const systemMap = read("src/lib/admin/system-map.ts");
const adminProduct = read("src/lib/admin/product.ts");
const roadmap = read("src/lib/product/roadmap.ts");
const supportAnswer = read("src/lib/support/answer.ts");
const requirements = read("src/lib/operators/connector-requirements.ts");
const availableActions = read("src/lib/operators/available-business-actions.ts");
const actionLabels = read("src/lib/operators/action-labels.ts");

const results = [];
function check(number, name, fn) {
  fn();
  results.push(number);
  console.log(`  ${number}. ${name}`);
}

// ── 45. AUTH ────────────────────────────────────────────────────────────

check(1, "Teams reuses the single Microsoft OAuth implementation", () => {
  assert.ok(!fs.existsSync(path.join(root, "src/app/api/connectors/teams")), "there must be no second Teams OAuth route tree");
  assert.ok(!fs.existsSync(path.join(root, "src/app/api/connectors/microsoft/teams/auth")), "Teams must not have its own authorize route");
  assert.match(authRoute, /searchParams\.get\("capability"\) === "teams" \? "teams" : "base"/, "Teams consent must be a scope profile on the existing Microsoft auth route");
  assert.doesNotMatch(teams, /login\.microsoftonline\.com/, "the Teams adapter must never build its own token endpoint");
  assert.doesNotMatch(teams, /client_secret/, "the Teams adapter must never touch OAuth client secrets");
  assert.match(teams, /connector_key", "microsoft"/, "Teams must read/write the shared Microsoft credential row, not a second one");
});

check(2, "Unauthenticated callers cannot start or change a Teams connection", () => {
  assert.match(authRoute, /resolveWorkspaceContext/, "the auth route must resolve identity from the verified session");
  assert.doesNotMatch(authRoute, /searchParams\.get\("userEmail"\)/, "identity must never come from a query parameter");
  assert.doesNotMatch(authRoute, /searchParams\.get\("userId"\)/, "identity must never come from a query parameter");
  assert.match(settingsRoute, /allowDevFallback: false/, "Teams settings must reject the unauthenticated dev fallback");
  assert.match(channelsRoute, /allowDevFallback: false/, "Teams discovery must reject the unauthenticated dev fallback");
});

check(3, "Member, reviewer and viewer roles cannot enable or modify Teams", () => {
  assert.match(authRoute, /requireWorkspaceRoleForIdentity\(\{ userId: context\.userId, userEmail \}, workspaceId, \["owner", "admin"\], supabase\)/, "granting Teams scopes must require owner/admin");
  assert.match(settingsRoute, /requireWorkspaceRoleForIdentity\([\s\S]{0,160}\["owner", "admin"\]/, "changing Teams settings must require owner/admin");
  assert.match(disconnectRoute, /requireWorkspaceAdmin/, "disconnecting Teams must require an admin");
});

check(4, "OAuth state is signed, provider-bound and carries the scope profile", () => {
  assert.match(oauthState, /scopeProfile\?: MicrosoftScopeProfileClaim/, "the signed state must carry the scope profile");
  assert.match(authRoute, /createMicrosoftOAuthState\(workspaceId, userEmail, scopeProfile\)/, "the scope profile must be bound into the signed state");
  assert.match(oauthState, /timingSafeEqual/, "state signatures must be compared in constant time");
  assert.match(callbackRoute, /parseMicrosoftOAuthState\(stateRaw\)/, "the callback must validate state first");
});

check(5, "A tampered or legacy state can never be read as Teams consent", () => {
  assert.match(oauthState, /if \(payload\.scopeProfile !== "teams"\) payload\.scopeProfile = "base";/, "unknown scope profiles must fall back to the narrower base profile");
  assert.match(callbackRoute, /const scopeProfile = state\.scopeProfile === "teams" \? "teams" : "base";/, "the callback must take the profile from the signed state only");
  assert.doesNotMatch(callbackRoute, /searchParams\.get\("capability"\)/, "the callback must never read the capability from the query string");
});

check(6, "Tokens are never serialized to the browser", () => {
  for (const [name, source] of [["settings route", settingsRoute], ["channels route", channelsRoute], ["connectors page", connectorsPage]]) {
    assert.doesNotMatch(source, /encrypted_access_token|encrypted_refresh_token|access_token|refresh_token/, `${name} must never expose token fields`);
  }
  assert.doesNotMatch(connectorsPage, /graph\.microsoft\.com/, "the browser must never call Microsoft Graph directly");
  assert.match(settingsRoute, /select\("scopes, metadata"\)/, "the settings route must only read non-secret credential columns");
});

check(7, "Teams scopes are tracked truthfully and merged, never assumed", () => {
  assert.match(microsoft, /export function mergeMicrosoftScopes/, "granted scopes must be merged, not replaced, across incremental consent");
  assert.match(callbackRoute, /existingScopes,\s*\n\s*existingMetadata,/, "the callback must preserve previously granted scopes and Teams settings");
  assert.match(teams, /export function getMicrosoftTeamsScopeState/, "a single truthful Teams scope-state resolver must exist");
  for (const scope of ["Team.ReadBasic.All", "Channel.ReadBasic.All", "ChannelMessage.Read.All", "ChannelMessage.Send"]) {
    assert.match(microsoft, new RegExp(scope.replace(/\./g, "\\.")), `Teams scope ${scope} must be declared`);
  }
  // Scope minimization: no chat, application-permission or org-wide scopes.
  for (const forbidden of ["Chat.Read", "Chat.ReadWrite", "ChatMessage.Send", "Group.ReadWrite.All", "Directory.Read.All", "TeamMember.ReadWrite.All", "Files.Read.All"]) {
    assert.doesNotMatch(microsoft, new RegExp(forbidden.replace(/\./g, "\\.")), `must never request ${forbidden}`);
    assert.doesNotMatch(teams, new RegExp(forbidden.replace(/\./g, "\\.")), `must never request ${forbidden}`);
  }
});

check(8, "Missing Teams consent never reports healthy", () => {
  assert.match(callbackRoute, /const teamsGranted = scopeProfile === "teams" && teamsScopeState\.readGranted;/, "Teams may only be enabled when Microsoft actually granted the read scopes");
  assert.match(truth, /status: "permission_required"/, "a distinct permission_required health state must exist");
  assert.match(truth, /if \(!input\.scopeState\.readGranted\) \{/, "missing Teams read scopes must short-circuit before healthy");
  assert.match(truth, /a healthy Microsoft 365 mail connection must never be reported as[\s\S]{0,40}a healthy Teams connection/, "the no-fake-Teams-connected rule must be documented at the truth source");
  assert.match(settingsRoute, /if \(!scopeState\.readGranted\) \{[\s\S]{0,320}teams_permission_required/, "Teams cannot be switched on from settings without real consent");
});

check(9, "Reconnect and re-consent reuse one connection without duplicate records", () => {
  assert.match(callbackRoute, /onConflict: "workspace_id,connector_key"/, "re-consent must upsert the same credential row");
  assert.match(microsoft, /export function microsoftProfileForStoredScopes/, "refresh must keep the Teams profile for a Teams-consented workspace");
  assert.match(microsoft, /refreshAccessToken\(refreshToken, microsoftProfileForStoredScopes\(credential\.scopes\)\)/, "refresh must not silently drop Teams access");
  assert.match(connectorsPage, /Reconnect Microsoft Teams/, "a re-consent control must exist in the UI");
});

// ── 46. READ ────────────────────────────────────────────────────────────

check(10, "Listing joined teams is implemented and delegated-scope bounded", () => {
  assert.match(teams, /export async function listJoinedTeams/);
  assert.match(teams, /\/me\/joinedTeams\?\$select=id,displayName,description/, "only the teams the signed-in user belongs to may be listed");
  assert.doesNotMatch(teams, /"\/teams\?/, "the whole tenant's teams must never be enumerated");
});

check(11, "Listing channels for one team is implemented", () => {
  assert.match(teams, /export async function listTeamChannels/);
  assert.match(teams, /\/channels\?\$select=id,displayName,membershipType,webUrl/);
  assert.match(teams, /encodeURIComponent\(id\)/, "team ids must be encoded into the path");
});

check(12, "Recent messages are normalized into a safe internal shape", () => {
  assert.match(teams, /export type SafeTeamsMessage = \{[\s\S]*?provider: "microsoft_teams";/);
  for (const field of ["teamId", "channelId", "messageId", "replyToId", "senderName", "occurredAt", "textPreview", "webUrl"]) {
    assert.match(teams, new RegExp(`${field}:`), `normalized message must expose ${field}`);
  }
  assert.doesNotMatch(teams, /rawBody|fullBody|body: raw/, "raw provider bodies must never be persisted or returned");
});

check(13, "HTML message content is sanitized to bounded plain text", () => {
  assert.match(teams, /function stripTeamsHtml/);
  assert.match(teams, /<script\[\\s\\S\]\*\?<\\\/script>/, "script blocks must be stripped");
  assert.match(teams, /export function toSafeTeamsText/);
  assert.match(teams, /TEAMS_MAX_TEXT_LENGTH = 600/, "message text must be length bounded");
  assert.match(teams, /export function toSafeTeamsWebUrl/, "links must be sanitized before they can be rendered");
  assert.match(teams, /if \(url\.protocol !== "https:"\) return null;/, "non-https links must be dropped");
});

check(14, "Pagination follows Graph nextLink within a bounded page budget", () => {
  assert.match(teams, /@odata\.nextLink/, "Graph pagination must be handled");
  assert.match(teams, /TEAMS_MAX_PAGES_PER_CHANNEL = 3/);
  assert.match(teams, /while \(next && pages < TEAMS_MAX_PAGES_PER_CHANNEL && messages\.length < top\)/, "paging must be bounded by both pages and message count");
});

check(15, "nextLink rejects any non-Microsoft-Graph host (SSRF safe)", () => {
  assert.match(teams, /export function isSafeGraphNextLink/);
  assert.match(teams, /url\.protocol === "https:" && url\.hostname\.toLowerCase\(\) === GRAPH_HOST/, "only the exact Graph host may be followed");
  assert.match(teams, /code: "teams_unsafe_pagination"/, "an unsafe link must produce an explicit refusal");
  assert.match(teams, /if \(absolute && !isSafeGraphNextLink\(pathOrUrl\)\)/, "the guard must run before the request is issued");
});

check(16, "A 401 refreshes once and retries once, then stops", () => {
  assert.match(teams, /if \(res\.status === 401 && !refreshed && context\.refresh\)/, "refresh must be attempted at most once");
  assert.match(teams, /refreshed = true;/);
  assert.match(teams, /code: "teams_reauth_required"/, "a second failure must surface as reauth required");
  assert.match(teams, /resolveMicrosoftAccessToken/, "refresh must reuse the shared Microsoft refresh helper");
});

check(17, "429 and 5xx retries are bounded and honor Retry-After", () => {
  assert.match(teams, /MAX_TRANSIENT_RETRIES = 2/);
  assert.match(teams, /function retryAfterMs/);
  assert.match(teams, /res\.headers\.get\("retry-after"\)/);
  assert.match(teams, /Math\.min\(seconds \* 1000, MAX_RETRY_AFTER_MS\)/, "Retry-After must be clamped");
  assert.match(teams, /\(res\.status === 429 \|\| res\.status >= 500\) && transientAttempts < MAX_TRANSIENT_RETRIES/);
});

check(18, "No unbounded history fetch; incremental cursors are used", () => {
  assert.match(teams, /TEAMS_MAX_MESSAGES_PER_CHANNEL = 50/);
  assert.match(teams, /sinceMessageId/, "a provider-id cursor must bound repeated scans");
  assert.match(teams, /export async function saveMicrosoftTeamsCursor/, "sync cursors must be persisted");
  assert.match(teams, /Only provider ids and[\s\S]{0,20}timestamps are stored - never message content/, "cursor storage must stay content free");
  assert.doesNotMatch(teams, /\$top=1000|\$top=500/, "no oversized page requests");
});

// ── 47. WRITE ───────────────────────────────────────────────────────────

check(19, "A Teams write requires the declared connector capability", () => {
  assert.match(teamsExecutor, /function assertTeamsWriteCapability/);
  assert.match(teamsExecutor, /connectorHasCapability\(MICROSOFT_TEAMS_CONNECTOR_KEY, "chat\.messages\.send_after_approval"\)/);
  assert.match(teamsExecutor, /assertTeamsWriteCapability\("teams\.send"\)/, "the send path must re-verify capability");
  assert.match(actionRegistry, /allowedExecutionAdapters: \["microsoft_teams"\]/, "only the Teams adapter may execute this action type");
});

check(20, "A Teams write requires workspace execution eligibility", () => {
  assert.match(approveRoute, /continuationKind === "teams\.send_after_approval"/);
  assert.match(
    approveRoute,
    /continuationKind === "teams\.send_after_approval"[\s\S]{0,1600}can_run_real_actions[\s\S]{0,400}Real execution requires an active plan/,
    "the Teams approval path must enforce the same billing gate as every other connector",
  );
  assert.match(executionPolicy, /getWorkspaceExecutionEligibility/, "the runtime engine must enforce eligibility centrally");
});

check(21, "A Teams write requires a live central policy decision", () => {
  assert.match(approveRoute, /buildPolicyInputFromContinuation\(\{ workspaceId: input\.payload\.workspaceId, kind: "teams\.send_after_approval", continuation \}\)/);
  assert.match(approveRoute, /if \(!policyDecision \|\| !policyInput\) \{[\s\S]{0,240}policy_unavailable/, "a missing policy decision must fail closed");
  assert.match(workspacePolicy, /if \(input\.kind === "teams\.send_after_approval"\)/);
  assert.match(workspacePolicy, /destinationType: provablyInternal \? "internal" : "external"/, "ambiguous Teams destinations must be classified external");
  assert.match(executionPolicy, /connector_not_ready/, "the engine must still require healthy, executable connector truth");
});

check(22, "Teams sends are approval-first and can never auto-execute", () => {
  assert.match(evaluate, /input\.actionType === "send_teams_message" \|\| input\.connectorKey === "microsoft_teams"/);
  assert.match(evaluate, /matchedRuleId: "teams_message\.approval_required"/);
  assert.doesNotMatch(evaluate, /decision: "allow_auto"[^}]*teams/i, "no Teams branch may return allow_auto");
  assert.match(actionRegistry, /actionType: "send_teams_message",[\s\S]{0,420}canAutoExecute: false/);
  assert.match(actionRegistry, /actionType: "send_teams_message",[\s\S]{0,420}approvalDefault: true/);
  assert.match(actionRegistry, /if \(action\.actionType === "send_teams_message"\) \{\s*\n\s*return true;/);
  assert.match(teamsExecutor, /export async function createTeamsSendApproval/, "operators may only create an approval");
  assert.match(teamsExecutor, /status: "pending"/);
});

check(23, "An authorized, approved Teams send executes through one audited path", () => {
  assert.match(approveRoute, /await sendTeamsChannelMessageAfterApproval\(/);
  assert.match(approveRoute, /event: "teams\.message_sent_after_approval"/, "the send must be recorded in execution logs");
  assert.match(approveRoute, /\/\/ Provider identifiers only - never the message body\.\s*\n\s*message: `Sent approved Microsoft Teams message to channel \$\{sent\.channelId\}`/, "execution logs must never contain the Teams message body");
  assert.match(teamsExecutor, /export async function sendTeamsChannelMessageAfterApproval/);
});

check(24, "An unauthorized or mis-targeted direct send fails", () => {
  assert.match(teamsExecutor, /export async function assertAllowedTeamsDestination/);
  assert.match(teamsExecutor, /teams_destination_not_allowed/, "a channel outside the configured destination must be rejected");
  assert.match(teamsExecutor, /assertAllowedTeamsDestination\(\{[\s\S]{0,220}\}\);\s*\n\s*\n\s*try \{/, "the send path must re-verify the destination before contacting Graph");
  assert.match(teams, /if \(!input\.connection\.scopeState\.sendGranted\)/, "the raw provider write must refuse without the send scope");
  assert.match(teams, /if \(input\.requireSendScope && !scopeState\.sendGranted\)|!scopeState\.readGranted \|\| \(input\.requireSendScope && !scopeState\.sendGranted\)/, "connection resolution must be able to demand the send scope");
  assert.match(teamsExecutor, /requireSendScope: true/, "the send path must resolve a send-scoped connection");
  assert.match(approveRoute, /teamsPayload\.workspaceId !== context\.workspaceId \|\| approvalRow\.workspace_id !== context\.workspaceId/, "cross-workspace Teams execution must be rejected");
});

check(25, "Duplicate Teams execution is prevented", () => {
  assert.match(approveRoute, /if \(continuation\.executionResult && typeof continuation\.executionResult === "object"\) \{\s*\n\s*return alreadyResolvedResponse\(input\.approvalRow\);/);
  assert.match(
    approveRoute,
    /executeTeamsApproval[\s\S]{0,4000}\.eq\("status", "pending"\)/,
    "the Teams approval must be claimed with a conditional status update",
  );
  assert.match(executionPolicy, /duplicate_execution/, "the durable execution intent must dedupe identical actions");
  assert.match(executionPolicy, /teamId: input\.teamId \?\? null/, "the Teams destination must be part of the action hash identity");
});

check(26, "Salesforce read-only truth is unaffected", () => {
  const salesforceEntry = registry.slice(registry.indexOf('connectorKey: "salesforce"'), registry.indexOf("stripe: {"));
  assert.match(salesforceEntry, /writeActions: \[\]/, "Salesforce must still declare zero write actions");
  assert.doesNotMatch(salesforceEntry, /\.write/, "Salesforce must still declare no write capability");
  assert.doesNotMatch(actionRegistry, /"salesforce"/, "Salesforce must still not be a registered write adapter");
  assert.match(truth, /connectorKey: "salesforce"[\s\S]{0,900}executable: false/, "Salesforce must remain non-executable");
});

check(27, "No provider write bypass exists anywhere", () => {
  assert.doesNotMatch(runOperator, /sendTeamsChannelMessage/, "operator runs must never send a Teams message directly");
  assert.doesNotMatch(operationsScan, /sendTeamsChannelMessage/, "the Operations scan must never send a Teams message directly");
  assert.doesNotMatch(clientFlowScan, /sendTeamsChannelMessage/, "the Client Flow scan must never send a Teams message directly");
  assert.doesNotMatch(settingsRoute, /sendTeamsChannelMessage/, "settings routes must never send a Teams message");
  assert.doesNotMatch(channelsRoute, /sendTeamsChannelMessage/, "read routes must never send a Teams message");
  assert.doesNotMatch(connectorsPage, /sendTeams/, "the browser must never reach a Teams write");
  // The raw Graph write may only be reached through the executor's guarded
  // wrapper, and that wrapper may only be called by the approval route.
  const sendCallSites = [teamsExecutor, approveRoute].filter((source) => /sendTeamsChannelMessageAfterApproval\(/.test(source));
  assert.equal(sendCallSites.length, 2, "only the executor definition and the approval route may reference the guarded send");
});

// ── 48. OPERATOR INTEGRATION ────────────────────────────────────────────

check(28, "Client Flow can consume Teams context when Teams is connected", () => {
  assert.match(clientFlowScan, /connector\.connectorKey === "microsoft_teams" && connector\.status === "healthy"/);
  assert.match(clientFlowScan, /getTeamsOperatorSignals\(\{ workspaceId, operatorKey: "client_flow", supabase \}\)/);
  assert.match(teamsSignals, /teams_follow_up_request/, "follow-up detection must exist");
});

check(29, "Operations can consume Teams context when Teams is connected", () => {
  assert.match(operationsScan, /const teamsConnected = teamsTruth\?\.status === "healthy";/);
  assert.match(operationsScan, /getTeamsOperatorSignals\(\{ workspaceId, operatorKey: "operations", supabase \}\)/);
  assert.match(teamsSignals, /teams_blocker/, "blocker detection must exist");
  assert.match(teamsSignals, /noiseMatches\.length === 0 && operationsMatches\.length >= 2/, "ordinary Teams chatter must not become operator work");
});

check(30, "Teams absence never breaks an operator", () => {
  assert.match(operationsScan, /if \(teamsConnected\) \{\s*\n\s*try \{/, "the Operations Teams read must be guarded");
  assert.match(clientFlowScan, /if \(teamsConnected\) \{\s*\n\s*try \{/, "the Client Flow Teams read must be guarded");
  assert.match(teamsExecutor, /Always resolves - never throws/, "the operator context helper must never throw");
  assert.match(teamsExecutor, /return \{ \.\.\.EMPTY_TEAMS_OPERATOR_CONTEXT, unavailableReason: reason \};/);
});

check(31, "Teams is an optional enhancement, never a hard requirement", () => {
  assert.match(requirements, /operatorKey: "operations",[\s\S]{0,700}required: \["pm\.tasks\.read"\],/, "Operations' hard requirement must stay Trello-shaped");
  assert.match(requirements, /operatorKey: "client_flow",[\s\S]{0,700}required: \["email\.read", "email\.send_after_approval"\],/, "Client Flow's hard requirement must stay email-shaped");
  assert.match(requirements, /optional: \["chat\.channels\.read", "chat\.messages\.read", "chat\.messages\.send_after_approval", "calendar\.events\.read"/, "Teams capabilities must be declared optional for Operations");
  assert.doesNotMatch(requirements, /required: \[[^\]]*chat\./, "no operator may hard-require a team-chat capability");
});

check(32, "Teams capability labels only appear when Teams is genuinely usable", () => {
  assert.match(availableActions, /"teams\.readChannelMessages": "microsoft_teams"/, "Teams actions must require the Teams connector, not merely a chat capability");
  assert.match(availableActions, /ACTIONS_REQUIRING_EXECUTABLE_CONNECTOR = new Set\(\["teams\.prepareMessage"\]\)/, "a Teams send claim must require an executable Teams connector");
  assert.match(availableActions, /if \(row\?\.executable !== true\) return false;/);
  assert.match(actionLabels, /"teams\.readChannelMessages": "Monitor Teams channel messages"/);
  assert.match(actionLabels, /"teams\.prepareMessage": "Send approved Teams messages"/);
});

check(33, "Support diagnostics understand every Teams state", () => {
  assert.match(supportAnswer, /normalized\.includes\("teams"\)/, "the support assistant must answer Teams questions");
  assert.match(supportAnswer, /needs its own Teams permissions/, "the answer must explain the permission boundary");
  assert.match(supportAnswer, /only after approval/, "the answer must state the approval boundary");
  assert.doesNotMatch(supportAnswer, /message body|raw message/, "support must never surface Teams message content");
  const supportRoute = read("src/app/api/support/requests/route.ts");
  assert.match(supportRoute, /connectors: connectors\.map\(\(row\) => \(\{ key: row\.connectorKey, status: row\.status \}\)\)/, "support diagnostics must carry every connector's truthful status, including Teams");
});

// ── 49. PRODUCT TRUTH ───────────────────────────────────────────────────

check(34, "Teams appears as an available, connectable connector", () => {
  assert.match(registry, /microsoft_teams: \{[\s\S]{0,900}status: "available"/);
  assert.match(registry, /connectorKey: "microsoft_teams", displayName: "Microsoft Teams", category: "team_chat", authType: "direct_oauth"/);
  assert.match(connectorsPage, /startMicrosoftTeamsConsent/, "the Connectors page must offer a Teams connect flow");
  assert.match(connectorsPage, /capability: "teams"/, "the connect flow must ask for the Teams scope profile");
});

check(35, "Teams is removed from the planned/next roadmap", () => {
  assert.match(roadmap, /name: "Microsoft Teams", type: "connector", status: "available"/);
  assert.equal(roadmap.split('name: "Microsoft Teams"').length - 1, 1, "Teams must appear exactly once in the roadmap");
  assert.doesNotMatch(registry, /microsoft_teams: \{[\s\S]{0,900}status: "coming_soon"/);
  assert.doesNotMatch(registry, /Planned via Microsoft Graph/, "the old planned Teams setup note must be gone");
});

check(36, "System Map marks Teams live with real dependency edges", () => {
  assert.match(systemMap, /REPRESENTED_CONNECTOR_KEYS = \[[^\]]*"microsoft_teams"/);
  assert.match(systemMap, /\["operator-operations", "connector-microsoft_teams"\]/);
  assert.match(systemMap, /\["operator-client_flow", "connector-microsoft_teams"\]/);
});

check(37, "Admin connector intelligence recognizes Teams without credentials", () => {
  assert.match(adminProduct, /MICROSOFT_TEAMS_CONNECTOR_KEY/, "admin must derive a real Teams connector state");
  assert.match(adminProduct, /permission_required/, "admin must be able to show the Teams permission state");
  assert.match(adminProduct, /select\("connector_key,status,workspace_id,scopes,metadata"\)/, "admin must only read non-secret credential columns");
  assert.doesNotMatch(adminProduct, /access_token|refresh_token|encrypted_/, "admin must never read credential values");
  assert.match(notifications, /connector_permission_required/, "a permission-required notification must exist");
});

check(38, "No unsupported Teams write capability is claimed", () => {
  const teamsEntry = registry.slice(registry.indexOf("microsoft_teams: {"), registry.indexOf("notion: {"));
  assert.doesNotMatch(teamsEntry, /delete|edit message|react|schedule|meeting/i, "Teams must not claim deletes, edits, reactions or meetings");
  assert.match(teamsEntry, /writeActions: \["Send approved Teams channel message"\]/, "exactly one implemented write action may be claimed");
  assert.doesNotMatch(teams, /"DELETE"|"PATCH"|"PUT"/, "the Teams adapter must only issue GET and POST");
});

check(39, "No fake attachment or chat capability", () => {
  // Everything before setupNotes: the declared capabilities and actions. The
  // setupNotes prose is allowed (and required) to name the boundary.
  const teamsEntry = registry.slice(registry.indexOf("microsoft_teams: {"), registry.indexOf("notion: {"));
  const teamsClaims = teamsEntry.slice(0, teamsEntry.indexOf("setupNotes:"));
  assert.doesNotMatch(teamsClaims, /attachment|upload|download/i, "attachments are explicitly out of scope in this pass");
  assert.doesNotMatch(teams, /hostedContents|\/chats\//, "1:1 and group chat reads must not be implemented");
  assert.match(registry, /Attachments, chats and message edits are not supported\./, "the catalog must state the boundary explicitly");
});

check(40, "Customer-facing Teams labels are sentence case", () => {
  const labels = [
    "Monitor Teams channel messages",
    "Send approved Teams messages",
    "Read joined teams",
    "Read channels",
    "Read recent channel messages",
    "Send approved Teams channel message",
  ];
  for (const label of labels) {
    assert.ok(actionLabels.includes(label) || registry.includes(label), `label "${label}" must exist in a real label source`);
    const words = label.split(" ").slice(1);
    for (const word of words) {
      const isProperNoun = ["Teams", "Auterim", "Microsoft"].includes(word);
      assert.ok(isProperNoun || word[0] !== word[0].toUpperCase() || /[^a-zA-Z]/.test(word[0]), `"${label}" must be sentence case`);
    }
  }
  assert.doesNotMatch(actionLabels, /"teams\.[a-zA-Z]+": "teams\./, "customer copy must never expose a raw capability or action key");
});

assert.deepEqual(results, Array.from({ length: 40 }, (_, index) => index + 1));
console.log("microsoft-teams-connector-smoke: all 40 contracts passed.");
