import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for Operations Operator's completion
// pass: real Trello-based readiness gating, real workspace-scoped runtime
// signals (no hardcoded-false stub), and correct bundled Slack + Trello
// approval execution. Mirrors the style of
// tests/client-flow-operator-smoke.mjs and tests/microsoft-connector-smoke.mjs:
// no test runner, live DB, or live Trello/Slack/Anthropic call is used -
// every check is a regression guard against source-level contracts (no live
// Supabase/Trello/Slack credentials are usable from this environment for a
// real integration test).

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const readiness = read("src/lib/operators/readiness.ts");
const registry = read("src/lib/operators/registry.ts");
const scan = read("src/lib/operators/operations/scan.ts");
const aiDrafting = read("src/lib/operators/operations/ai-drafting.ts");
const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
const scanRoute = read("src/app/api/operators/operations/scan/route.ts");
const statusRoute = read("src/app/api/operators/operations/status/route.ts");

// ── A. hasWorkspaceScopedLogs is a real, workspace-filtered DB check, not a hardcoded false ──
assert.doesNotMatch(readiness, /hasWorkspaceScopedLogs:\s*false,?\s*\n?\s*\};/, "hasWorkspaceScopedLogs must never be a hardcoded false stub");
assert.match(readiness, /async function hasWorkspaceScopedLogs/, "readiness.ts must define a real hasWorkspaceScopedLogs check");
const hasWorkspaceScopedLogsBody = readiness.slice(readiness.indexOf("async function hasWorkspaceScopedLogs"), readiness.indexOf("async function getWorkspaceRuntimeSignals"));
assert.match(hasWorkspaceScopedLogsBody, /from\("os_operator_run_logs"\)/, "the real check must query os_operator_run_logs, the actual workspace-scoped (not null workspace_id) log table");
assert.match(hasWorkspaceScopedLogsBody, /\.eq\("workspace_id", workspaceId\)/, "the log check must filter by workspace_id at the DB level, never trust an unscoped fetch");
assert.doesNotMatch(hasWorkspaceScopedLogsBody, /from\("os_execution_logs"\)/, "must not use the legacy os_execution_logs table, which has no workspace_id column at all");

// ── B. hasWorkspaceApprovalActivity is filtered at the DB level, not fetched unscoped and matched client-side ──
const hasApprovalActivityBody = readiness.slice(readiness.indexOf("async function hasWorkspaceApprovalActivity"), readiness.indexOf("async function hasWorkspaceScopedLogs"));
assert.match(hasApprovalActivityBody, /\.eq\("workspace_id", workspaceId\)/, "approval activity must be filtered by workspace_id at the DB level");

// ── C. readiness.ts's operations branch gates on Trello (the real hard requirement), not an unused email connector ──
const operationsBranch = readiness.slice(readiness.indexOf('operator.key === "operations"'), readiness.indexOf("if (missingRequired.length > 0) {\n    return baseResult({\n      operator,\n      status: \"missing_connector\",\n      connectedRequired,\n      missingRequired,\n      entitlements,\n      reason: `${operator.name} is missing required connector truth.`"));
assert.doesNotMatch(operationsBranch, /connectedConnectorsWithCapability\("email\.send_after_approval", truth\)/, "operations readiness must not gate on an email connector - scan.ts never uses Gmail/Microsoft 365");
assert.match(operationsBranch, /Trello/, "operations readiness reason/copy must reference Trello, the real hard requirement");
assert.doesNotMatch(readiness.slice(readiness.indexOf('operator.key === "operations"'), readiness.indexOf('operator.key === "operations"') + 2000), /once execution is implemented/i, "the stale 'once execution is implemented' copy must be removed now that executeOperationsApproval is real");

// ── D. registry.ts: operations requires Trello (a connector that actually exists in connectors/registry.ts) ──
assert.match(registry, /"trello"/, "ConnectorKey must include trello so operators can honestly declare it as required/optional");
const operationsEntry = registry.slice(registry.indexOf('key: "operations"'), registry.indexOf('key: "marketing"'));
assert.match(operationsEntry, /requiredConnectors:\s*\["trello"\]/, "operations must declare trello (not gmail) as its required connector, matching scan.ts's real hard gate");
assert.match(operationsEntry, /optionalConnectors:\s*\["slack"/, "slack must stay optional - scan.ts degrades gracefully when Slack/its channel is not connected");

// ── E. scan.ts really is Trello-gated and degrades gracefully without Slack ──
assert.match(scan, /if \(!trelloConnected \|\| !boardId\)/, "scan.ts must hard-require Trello + a selected board before doing anything");
assert.match(scan, /const preparedSlackAction: PreparedAction \| null = slackConnected && slackChannelId/, "Slack action preparation must be optional/conditional, not required");
assert.match(scan, /if \(!preparedSlackAction && !preparedTrelloAction\) { bump\("not_actionable"\); continue; }/, "a signal with neither a Slack nor Trello action prepared must be skipped, not silently create an empty approval");

// ── F. executeOperationsApproval executes Slack-only, Trello-only, and both-actions approvals correctly ──
const validateOperationsPayloadBody = approveRoute.slice(approveRoute.indexOf("function validateOperationsPayload"), approveRoute.indexOf("function stringField"));
assert.match(validateOperationsPayloadBody, /if \(!slack && !trello\) details\.push/, "an approval with neither prepared action must be rejected as invalid, not silently accepted");
const executeOperationsApprovalBody = approveRoute.slice(approveRoute.indexOf("async function executeOperationsApproval"), approveRoute.indexOf("type OperationsContinuationPayload") === -1 ? approveRoute.indexOf("async function executeSlackApproval") : approveRoute.indexOf("async function executeSlackApproval"));
assert.match(executeOperationsApprovalBody, /if \(input\.payload\.preparedSlackAction && slackBlocked\)/, "Slack action must be live-policy-checked independently");
assert.match(executeOperationsApprovalBody, /if \(input\.payload\.preparedTrelloAction && trelloBlocked\)/, "Trello action must be live-policy-checked independently");
assert.match(executeOperationsApprovalBody, /sendSlackMessageAfterApproval/, "the Slack branch must actually send the message, not just log it");
assert.match(executeOperationsApprovalBody, /executePreparedActionAfterApproval\({ action: input\.payload\.preparedTrelloAction/, "the Trello branch must actually execute the prepared Trello action through the shared action layer");
assert.match(executeOperationsApprovalBody, /const anySucceeded = slackStatus === "sent" \|\| trelloStatus === "executed";/, "final status must reflect whichever action(s) actually ran, supporting Slack-only, Trello-only, or both");
assert.match(executeOperationsApprovalBody, /const finalStatus = anySucceeded \? \(anyFailed \|\| anyBlocked \? "partially_completed" : "approved"\) : \(anyFailed \|\| anyBlocked \? "failed" : "approved"\);/, "partial success (one action fails/blocks, the other succeeds) must be reported as partially_completed, not silently swallowed");

// ── G. identity/workspace security: the operations continuation is workspace-verified before executing ──
const operationsDispatch = approveRoute.slice(approveRoute.indexOf('continuationKind === "operations.execute_after_approval"'), approveRoute.indexOf('continuationKind === "shared_action.execute_after_approval"'));
assert.match(operationsDispatch, /operationsPayload\.workspaceId !== context\.workspaceId \|\| approvalRow\.workspace_id !== context\.workspaceId/, "operations approval execution must verify the continuation payload's workspaceId against the verified session workspace, never trust it blindly");

for (const routeSrc of [scanRoute, statusRoute]) {
  assert.match(routeSrc, /resolveWorkspaceContext/, "Operations routes must resolve workspace identity from a verified session, never trust client-supplied ids directly");
}

// ── H. ai-drafting.ts is honestly deterministic (no live model call), not falsely presented as an Anthropic call ──
assert.doesNotMatch(aiDrafting, /@anthropic-ai\/sdk/, "operations/ai-drafting.ts is a deterministic decision helper today - it must not silently claim to call Anthropic without actually doing so");
assert.match(aiDrafting, /Deterministic/i, "the deterministic nature of this decision helper must stay documented in the source, since the filename alone (ai-drafting.ts) is misleading");

console.log("Auterim Operations Operator smoke contracts passed.");
