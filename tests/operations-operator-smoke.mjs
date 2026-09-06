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
const trelloExecutor = read("src/lib/operators/executors/trello.ts");
const trigger = read("src/trigger/operations-operator-scan.ts");

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

// ── I. Trello executor fetches idMembers/labels/badges in the same list-cards call, plus a signal-gated comment read ──
assert.match(trelloExecutor, /fields=name,desc,due,dueComplete,dateLastActivity,idList,url,shortUrl,closed,idMembers,labels,badges/, "listTrelloCardsDetailed must widen its fields to include idMembers/labels/badges in the same call, not a separate round-trip");
assert.match(trelloExecutor, /export async function listRecentTrelloCardComments/, "a separate, cheap comment-read function must exist for signal-gated blocker-reason lookups");

// ── J. scan.ts really uses the widened fields for no-owner, escalation-label, and checklist-based detection ──
assert.match(scan, /detectEscalationLabels\(card\.labels\)\.length > 0\) return "escalation_label"/, "escalation labels must be checked first and win over other signal types");
assert.match(scan, /card\.idMembers\.length === 0/, "no-owner detection must use the real idMembers field, not be absent");
assert.match(scan, /checklistIncomplete && activity !== null && activity > STUCK_DAYS\) return "checklist_stalled"/, "checklist-based staleness must be checked before the generic stuck/no-activity fallback");

// ── K. card-level dedupe reactivates on a severity/blocker band change instead of hard-suppressing forever ──
assert.match(scan, /const legacyDedupeKey = `operations:trello:card:\$\{card\.id\}:\$\{signalType\}`;/, "the dedupe key must still be derivable from card+signal for backward compatibility");
assert.match(scan, /const dedupeKey = `\$\{legacyDedupeKey\}:\$\{decision\.severity\}:/, "the dedupe key must include the computed severity band so a worsened/changed situation can reactivate");
assert.match(scan, /if \(legacyReason === "existing_pending_approval"\) \{ bump\(legacyReason\); continue; \}/, "an unresolved legacy-format approval for the same card+signal must still hard-block a duplicate, even across the dedupe scheme change");

// ── L. a genuinely low-severity or externally-blocked signal is a deliberate, logged no-action outcome, not silence ──
assert.match(scan, /bestNextAction === "observe_low_severity" \|\| decision\.bestNextAction === "wait_external_dependency"/, "observe/wait outcomes must be handled as an explicit branch");
assert.match(scan, /eventType: "operations\.scan\.no_action"/, "the deliberate no-action outcome must still be logged, mirroring Revenue's defer_low_priority pattern");

// ── M. Trigger.dev daily scan is a real per-workspace fanout, not one hardcoded workspace ──
assert.doesNotMatch(trigger, /TODO: multi-workspace fanout/, "the fanout TODO must be resolved, not left in place");
assert.match(trigger, /async function listEligibleOperationsWorkspaceIds/, "a real workspace discovery function must exist");
assert.match(trigger, /getOperatorReadiness\(\{ workspaceId, operatorKey: "operations" \}\)/, "fanout eligibility must reuse the same readiness check the manual scan route trusts, not a separate ad hoc check");
assert.match(trigger, /for \(const workspaceId of discovery\.workspaceIds\) \{\s*\n\s*\/\/ Each workspace is isolated/, "each workspace in the fanout must be isolated so one failure cannot abort the others");
assert.match(trigger, /try \{\s*\n\s*const result = await scanOperationsSignals\(\{ workspaceId, sourceMode: "scheduled" \}\);/, "each workspace scan must be individually try/caught inside the fanout loop");
assert.match(trigger, /workspacesNeedingAttention/, "failed workspaces must be surfaced explicitly, not swallowed");

console.log("Auterim Operations Operator smoke contracts passed.");
