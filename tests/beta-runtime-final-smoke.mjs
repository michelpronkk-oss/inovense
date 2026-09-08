import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Final controlled-beta runtime pass.
//
// Real domain logic (signal engine, workflow planner, policy engine, support
// diagnosis) executes here. Provider and database boundaries are mocked. The
// remaining checks are source contracts over the runtime surfaces that cannot
// execute in a plain Node process: Trigger.dev task configuration, RLS policy
// text, and the approval execution route.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-beta-runtime-final");
const results = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function check(number, name, fn) {
  return Promise.resolve(fn()).then(() => {
    results.push(number);
    console.log(`  ${number}. ${name}`);
  });
}

function buildModule(relSourcePath, replacements = [], optionalReplacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find this exact snippet in ${relSourcePath}:\n${search}`);
    source = source.split(search).join(replace);
  }
  for (const [search, replace] of optionalReplacements) {
    source = source.split(search).join(replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return pathToFileURL(tmpFile).href;
}

const triggerFiles = () => fs.readdirSync(path.join(root, "src/trigger")).filter((file) => file.endsWith(".ts"));

/** Source with comments removed, so a doc comment describing a rule is not mistaken for breaking it. */
function codeOnly(file) {
  return read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

async function main() {
  try {
    // ── Real domain modules ──────────────────────────────────────────────
    const registryUrl = buildModule("src/lib/connectors/registry.ts");
    const capabilitiesUrl = buildModule("src/lib/connectors/capabilities.ts", [], [['from "@/lib/connectors/registry";', `from "${registryUrl}";`]]);
    const actionsUrl = buildModule("src/lib/actions/registry.ts");
    const engineUrl = buildModule("src/lib/workflows/engine.ts", [], [
      ['from "@/lib/actions/registry";', `from "${actionsUrl}";`],
      ['from "@/lib/connectors/capabilities";', `from "${capabilitiesUrl}";`],
    ]);
    const { planCandidateWorkflow, deriveWorkflowStatus, conservativeAttribution } = await import(engineUrl);
    const { routeSignalEvent } = await import(buildModule("src/lib/signals/engine.ts"));
    const { evaluatePolicy } = await import(buildModule("src/lib/policies/evaluate.ts"));
    const { describeInactionReasons } = await import(buildModule("src/lib/support/diagnosis.ts", [], [
      ['import "server-only";', ""],
      ['import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";', "const getConnectorTruth = async () => [];"],
      ['import { getOperatorActivationState } from "@/lib/operators/activation";', "const getOperatorActivationState = async () => null;"],
      ['import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";', "const getWorkspaceExecutionEligibility = async () => ({ eligible: true });"],
      ['import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";', "const loadPolicyWorkspaceSettings = async () => ({ emergencyStopEnabled: false });"],
      ['import { getProviderFailureSnapshot } from "@/lib/runtime/provider-health";', "const getProviderFailureSnapshot = async () => ({ degradedConnectors: [], reconnectRequiredConnectors: [] });"],
      ['import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };"],
    ]));
    const { answerSupportQuestion, isInactionQuestion } = await import(buildModule("src/lib/support/answer.ts", [], [
      ['import { ROADMAP_ITEMS } from "@/lib/product/roadmap";', "const ROADMAP_ITEMS = [];"],
      ['import type { InactionReason } from "@/lib/support/diagnosis";', ""],
      ['import { SUPPORT_HELP, findSupportHelp } from "@/lib/support/knowledge";', "const SUPPORT_HELP = []; const findSupportHelp = () => [];"],
    ]));

    const policy = (overrides = {}) => ({
      autonomyMode: "guarded", emergencyStopEnabled: false, customerEmailMode: "approval_required",
      internalSlackNotificationsAllowed: true, dailyBriefAllowed: true, connectorHealthChecksAllowed: true,
      lowRiskProjectToolCommentsAllowed: true, crmWritesRequireApproval: true, projectToolWritesRequireApproval: true,
      customerFacingActionsRequireApproval: true, maxAutonomousActionsPerHour: 10, maxAutonomousActionsPerDay: 50, ...overrides,
    });
    const live = { canRunRealActions: true, billingStatus: "active" };

    // ── 1. Controlled-beta end-to-end scenarios ──────────────────────────

    await check(1, "Client flow: a Zendesk escalation becomes a bounded, fully gated plan", () => {
      const routed = routeSignalEvent({
        id: "sig-1", workspaceId: "ws-1", source: "zendesk", connectorKey: "zendesk", provider: "zendesk",
        sourceType: "ticket", sourceId: "ticket-42", eventType: "zendesk.ticket.updated",
        observedAt: new Date().toISOString(), occurredAt: new Date().toISOString(),
        actor: "customer@example.com", subject: "Urgent: outage is unacceptable, we cannot proceed",
        snippet: "This is an escalation, the outage is unacceptable and we cannot proceed.", dedupeKey: "zendesk:ticket-42",
      });
      const candidate = routed.candidates.find((item) => item.operatorKey === "client_flow");
      assert.ok(candidate, "an escalation must reach Client Flow");
      const plan = planCandidateWorkflow({
        candidate: { ...candidate, priority: 90, signalType: "escalation" }, signalId: "sig-1",
        context: { activeOperatorKeys: ["client_flow"], connectedConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executableConnectorKeys: ["jira", "microsoft_teams", "zendesk"], executionEligible: true },
      });
      assert.ok(plan, "an eligible escalation must produce a plan");
      assert.deepEqual(plan.steps.map((step) => step.id), ["pm-follow-up", "internal-escalation", "customer-response"]);
      assert.ok(plan.steps.every((step) => step.approvalRequired), "every step in a customer escalation stays approval gated");
      assert.equal(plan.steps.find((step) => step.id === "customer-response").risk, "high");
      assert.equal(deriveWorkflowStatus(plan.steps), "planned");
    });

    await check(2, "Operations: a delivery blocker becomes a tracked recovery plan", () => {
      const plan = planCandidateWorkflow({
        candidate: { workspaceId: "ws-1", operatorKey: "operations", signalType: "blocked_work", priority: 80, confidence: "high", source: "jira", sourceId: "REC-7", dedupeKey: "operations:jira:REC-7" },
        signalId: "sig-2",
        context: { activeOperatorKeys: ["operations"], connectedConnectorKeys: ["jira", "slack"], executableConnectorKeys: ["jira", "slack"], executionEligible: true },
      });
      assert.ok(plan);
      assert.equal(plan.objective, "Recover delivery risk");
      assert.ok(plan.steps.every((step) => step.approvalRequired));
    });

    await check(3, "Revenue: commercial intent needs a verified email connector and stays gated", () => {
      const base = { workspaceId: "ws-1", operatorKey: "revenue", signalType: "commercial_intent", priority: 80, confidence: "high", source: "gmail", sourceId: "msg-1", dedupeKey: "revenue:gmail:msg-1" };
      const withEmail = planCandidateWorkflow({ candidate: base, signalId: "sig-3", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["gmail"], executableConnectorKeys: ["gmail"], executionEligible: true } });
      assert.equal(withEmail.steps[0].actionType, "send_email");
      assert.equal(withEmail.steps[0].approvalRequired, true);
      assert.equal(withEmail.steps[0].risk, "high");
      const withoutEmail = planCandidateWorkflow({ candidate: base, signalId: "sig-3", context: { activeOperatorKeys: ["revenue"], connectedConnectorKeys: ["jira"], executableConnectorKeys: ["jira"], executionEligible: true } });
      assert.equal(withoutEmail, null, "no email connector means no plan, never a guess");
    });

    await check(4, "Sending is an execution fact, never an outcome", () => {
      assert.equal(conservativeAttribution({ hasObservedProviderState: false, hasLinkedAction: true, hasDeterministicProviderRelation: true }), null);
      assert.equal(conservativeAttribution({ hasObservedProviderState: true, hasLinkedAction: true, hasDeterministicProviderRelation: true }), "direct");
      assert.equal(read("src/lib/workflows/outcome-observers.ts").includes("export function observeRevenueFollowUp"), true);
      assert.match(read("src/lib/workflows/store.ts"), /if \(!input\.evidenceRefs\.length\) throw new Error\("Outcome evidence is required\."\)/);
    });

    // ── 2. Emergency stop and billing regression ─────────────────────────

    await check(5, "Emergency stop blocks every write action in every autonomy mode", () => {
      const actions = [
        { actionType: "send_email", connectorKey: "gmail", destinationType: "customer", riskLevel: "high" },
        { actionType: "send_slack_message", connectorKey: "slack", destinationType: "internal", riskLevel: "low" },
        { actionType: "send_teams_message", connectorKey: "microsoft_teams", destinationType: "internal", riskLevel: "medium" },
        { actionType: "create_jira_issue", connectorKey: "jira", destinationType: "project_tool", riskLevel: "medium" },
        { actionType: "add_task_comment", connectorKey: "trello", destinationType: "project_tool", riskLevel: "low" },
        { actionType: "reply_zendesk_ticket", connectorKey: "zendesk", destinationType: "customer", riskLevel: "high" },
      ];
      for (const mode of ["manual", "approval_first", "guarded", "autonomous"]) {
        for (const action of actions) {
          const decision = evaluatePolicy({ workspaceId: "ws-1", operatorKey: "operations", confidence: "high", ...action }, policy({ autonomyMode: mode, emergencyStopEnabled: true }), live);
          assert.equal(decision.decision, "blocked", `${action.actionType} in ${mode} must be blocked by emergency stop`);
          assert.equal(decision.canExecuteNow, false);
        }
      }
    });

    await check(6, "An already granted approval is re-evaluated live before any write", () => {
      const approve = read("src/app/api/approvals/[id]/approve/route.ts");
      assert.match(approve, /LIVE policy re-evaluation \(emergency stop \/ tightened policy can block\)/);
      const evaluations = approve.match(/await evaluateExecutionPolicy\(/g) ?? [];
      assert.ok(evaluations.length >= 4, "every execution branch must re-evaluate policy at approval time");
      assert.match(approve, /blocked_by_policy/);
    });

    await check(7, "Losing execution eligibility blocks execution, in policy and in recovery", () => {
      const ineligible = { canRunRealActions: false, billingStatus: "canceled" };
      for (const mode of ["approval_first", "guarded", "autonomous"]) {
        const decision = evaluatePolicy(
          { workspaceId: "ws-1", operatorKey: "revenue", actionType: "send_email", connectorKey: "gmail", destinationType: "customer", riskLevel: "high", confidence: "high" },
          policy({ autonomyMode: mode }), ineligible,
        );
        assert.notEqual(decision.decision, "allow_auto", `${mode} must never auto-execute for an ineligible workspace`);
        assert.equal(decision.canExecuteNow, false);
      }
      assert.match(read("src/lib/policies/execution-policy.ts"), /if \(!eligibility\.eligible\) return deny\(input\.policyInput, "workspace_execution_ineligible"/);
      assert.match(read("src/lib/workflows/recovery.ts"), /blockReason: "workspace_execution_ineligible"/);
    });

    await check(8, "State stays recoverable when eligibility returns", () => {
      const recovery = read("src/lib/workflows/recovery.ts");
      assert.match(recovery, /nextStatus: "blocked"/, "an ineligible workspace's work is held, not destroyed");
      assert.doesNotMatch(recovery, /\.delete\(\)/, "recovery must never delete workflow state");
      assert.match(recovery, /approval === "pending"[\s\S]{0,200}nextStatus: "awaiting_approval"/, "held work returns to its approval gate once the gates pass again");
    });

    // ── 3. Idempotency and duplicate delivery ────────────────────────────

    await check(9, "Every stage of the pipeline has a durable uniqueness guard", () => {
      const signalSql = read("supabase/migrations/20260908_signal_engine.sql");
      assert.match(signalSql, /create table if not exists public\.os_signal_events[\s\S]*?unique \(workspace_id, dedupe_key\)/, "no duplicate signal event");
      assert.match(signalSql, /create table if not exists public\.os_signal_candidates[\s\S]*?unique \(workspace_id, dedupe_key\)/, "no duplicate candidate");
      const workflowSql = read("supabase/migrations/20260908_cross_connector_workflows.sql");
      assert.match(workflowSql, /os_workflow_runs[\s\S]*?unique \(workspace_id, dedupe_key\)/, "no duplicate workflow");
      assert.match(workflowSql, /os_workflow_steps[\s\S]*?unique \(workflow_id, step_order\)/, "no duplicate step");
      assert.match(read("supabase/migrations/20260907_execution_policy_engine.sql"), /unique \(workspace_id, action_hash\)/, "no duplicate execution intent");
      assert.match(read("supabase/migrations/20260908_workflow_lifecycle_hardening.sql"), /os_approvals_workflow_step_pending_unique_idx[\s\S]{0,200}where status = 'pending'/, "no duplicate pending approval per step");
    });

    await check(10, "A replayed Trigger.dev delivery cannot duplicate an external write", () => {
      const approve = read("src/app/api/approvals/[id]/approve/route.ts");
      const claims = approve.match(/\.eq\("status", "pending"\)/g) ?? [];
      assert.ok(claims.length >= 4, "every execution branch must claim the approval atomically before acting");
      assert.match(approve, /alreadyResolvedResponse/);
      assert.match(approve, /No action was executed again\./);
      assert.match(read("src/lib/policies/execution-policy.ts"), /result = deny\(input\.policyInput, "duplicate_execution"/, "an identical in-flight action must be denied, not repeated");
    });

    await check(11, "Replayed ingestion and outcome observation are upserts, not inserts", () => {
      assert.match(read("src/lib/signals/store.ts"), /onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true/);
      const store = read("src/lib/workflows/store.ts");
      assert.match(store, /onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true/, "workflow creation must be idempotent");
      assert.match(store, /onConflict: "id", ignoreDuplicates: true/, "outcome recording must be idempotent");
    });

    await check(12, "An approval racing a scheduled continuation resolves once", () => {
      const recovery = read("src/lib/workflows/recovery.ts");
      assert.match(recovery, /\.eq\("status", "executing"\)\s*\n?\s*\.select\("id"\)/, "recovery writes are conditional on the step still being stuck");
      assert.match(read("src/lib/workflows/lifecycle.ts"), /const status = deriveWorkflowStatus/, "workflow status is derived from durable step truth, never asserted");
      assert.match(read("src/lib/workflows/materialize.ts"), /if \(stepResult\.data\.approval_id\) return missing\("approval_already_exists"/, "a second materialization cannot create a second approval");
    });

    // ── 4. Approval flood protection and backpressure ────────────────────

    await check(13, "A burst of similar signals cannot become hundreds of approvals", () => {
      const candidate = { workspaceId: "ws-1", operatorKey: "operations", signalType: "blocked_work", priority: 80, confidence: "high", source: "jira", sourceId: "REC-7", dedupeKey: "operations:jira:REC-7" };
      const context = { activeOperatorKeys: ["operations"], connectedConnectorKeys: ["jira"], executableConnectorKeys: ["jira"], executionEligible: true };
      const ids = new Set(Array.from({ length: 25 }, () => planCandidateWorkflow({ candidate, signalId: "sig-2", context }).id));
      assert.equal(ids.size, 1, "the same signal must always produce the same workflow identity");
      assert.match(read("src/lib/workflows/materialize.ts"), /findExistingCustomerReply/, "an existing pending customer draft must be reused, not duplicated");
      assert.match(read("src/lib/workflows/materialize.ts"), /dedupe_key: `workflow:\$\{input\.workflowId\}:\$\{input\.stepId\}`/);
    });

    await check(14, "Autonomy never increases to absorb approval load", () => {
      const decision = evaluatePolicy(
        { workspaceId: "ws-1", operatorKey: "client_flow", actionType: "send_email", connectorKey: "gmail", destinationType: "customer", riskLevel: "high", confidence: "high" },
        policy({ autonomyMode: "autonomous" }), live,
      );
      assert.notEqual(decision.decision, "allow_auto", "a customer-facing send is never autonomous");
      assert.match(read("src/lib/policies/execution-policy.ts"), /withinAutonomyLimits/, "autonomous execution stays rate limited");
      assert.match(read("src/lib/policies/execution-policy.ts"), /autonomy_limit_unavailable/, "an unverifiable limit fails closed");
    });

    await check(15, "Every runtime stage is bounded, so one tenant cannot monopolize it", () => {
      assert.match(read("src/lib/signals/store.ts"), /events: SignalEvent\[\]/);
      assert.match(read("src/trigger/signal-engine.ts"), /payload\.events\.slice\(0, 100\)/, "signal ingestion batches are bounded");
      assert.match(read("src/lib/workflows/recovery.ts"), /Math\.max\(1, Math\.min\(input\.limit \?\? 50, 200\)\)/, "recovery batches are bounded");
      const scheduler = read("src/trigger/workflow-recovery.ts");
      assert.match(scheduler, /MAX_WORKSPACES_PER_RUN = 50/);
      assert.match(scheduler, /workspaceIds\.slice\(0, MAX_WORKSPACES_PER_RUN\)/, "a large tenant is deferred, not allowed to starve the rest");
      for (const file of ["src/trigger/client-flow-operator-scan.ts", "src/trigger/operations-operator-scan.ts", "src/trigger/revenue-operator-scan.ts"]) {
        assert.match(read(file), /MAX_FANOUT_WORKSPACES = 500/, `${file} fanout must be bounded`);
      }
    });

    await check(16, "Google Drive processing is bounded on every axis", () => {
      const drive = read("src/lib/connectors/google-drive.ts");
      for (const bound of ["DRIVE_MAX_RESULTS", "DRIVE_MAX_PAGES", "DRIVE_MAX_FOLDERS", "DRIVE_MAX_FILE_BYTES", "DRIVE_MAX_TEXT_CHARS", "DRIVE_MAX_SHEET_CELLS"]) {
        assert.match(drive, new RegExp(`export const ${bound} = `), `${bound} must be an explicit ceiling`);
      }
      assert.match(drive, /downloadGoogleDriveFile\(token: string, fileId: string, maxBytes = DRIVE_MAX_FILE_BYTES\)/);
    });

    await check(17, "Model calls are bounded in time, retries, tokens, and context", () => {
      const limits = read("src/lib/runtime/ai-limits.ts");
      assert.match(limits, /export const AI_REQUEST_TIMEOUT_MS = 60_000/);
      assert.match(limits, /export const AI_MAX_RETRIES = 1/);
      const aiFiles = ["src/lib/operators/revenue/ai-drafting.ts", "src/lib/operators/client-flow/ai-drafting.ts", "src/lib/agents/lead-research/run.ts", "src/lib/agents/proposal-angle/run.ts", "src/lib/agents/proposal-writer/run.ts"];
      for (const file of aiFiles) {
        const source = read(file);
        assert.match(source, /new Anthropic\(\{ apiKey, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: AI_MAX_RETRIES \}\)/, `${file} must use the shared bounds`);
        assert.match(source, /max_tokens: /, `${file} must bound output tokens`);
        assert.doesNotMatch(source, /while \(|for \(let attempt/, `${file} must not contain a hidden repeated call loop`);
      }
      for (const file of ["src/lib/operators/revenue/ai-drafting.ts", "src/lib/operators/client-flow/ai-drafting.ts"]) {
        assert.match(read(file), /fallbackResult\(/, `${file} must fall back deterministically`);
        assert.match(read(file), /slice\(0, \d+\)/, `${file} must truncate its prompt context`);
      }
    });

    // ── 5. Trigger.dev configuration audit ───────────────────────────────

    await check(18, "Every production task declares retry, queue and workspace binding", () => {
      const files = triggerFiles();
      assert.ok(files.includes("workflow-recovery.ts"), "the recovery scheduler must be a discovered task");
      for (const file of files) {
        const source = read(`src/trigger/${file}`);
        assert.match(source, /retry: \{ maxAttempts: \d/, `${file} must declare a bounded retry policy`);
        assert.match(source, /queue: \{ name: "[a-z-]+", concurrencyLimit: \d+ \}/, `${file} must declare a bounded queue`);
        assert.doesNotMatch(source, /access_token|refresh_token|client_secret|encryptToken|decryptToken/, `${file} must never carry token material in a task payload`);
        assert.match(source, /workspaceId/, `${file} must be workspace bound`);
      }
      assert.match(read("trigger.config.ts"), /maxDuration: 3600/);
    });

    await check(19, "Scheduled tasks use fixed UTC cron patterns", () => {
      for (const file of triggerFiles()) {
        const source = read(`src/trigger/${file}`);
        if (!source.includes("schedules.task(")) continue;
        assert.match(source, /timezone: "UTC"/, `${file} must schedule in UTC`);
        assert.match(source, /cron: \{[\s\S]{0,120}pattern: "[^"]+"/, `${file} must declare an explicit cron pattern`);
      }
    });

    // ── 6. Security and isolation regression ─────────────────────────────

    await check(20, "Refresh coordination is credential scoped and workspace isolated", () => {
      const lock = read("src/lib/connectors/refresh-lock.ts");
      assert.match(lock, /\.eq\("workspace_id", workspaceId\)\s*\n\s*\.eq\("connector_key", connectorKey\)/, "every lock read and write is scoped to one workspace credential");
      assert.match(lock, /\.eq\("credential_version", expectedVersion\)\s*\n\s*\.eq\("refresh_lock_token", lockToken\)/, "the write requires both the version and the lease this worker holds");
      assert.doesNotMatch(lock, /console\.(log|warn|error|info)/, "the refresh path must not log");
      const sql = read("supabase/migrations/20260908_operational_hardening.sql");
      assert.match(sql, /where workspace_id = p_workspace_id\s*\n\s*and connector_key = p_connector_key/, "the lease RPCs are scoped to one credential");
    });

    await check(21, "Internal observability never reads token columns or business content", () => {
      const product = read("src/lib/admin/product.ts");
      assert.match(product, /select\("connector_key,status,workspace_id,scopes,metadata"\)/);
      assert.doesNotMatch(product, /encrypted_access_token|encrypted_refresh_token/, "internal connector intelligence must never read a token column");
      const diagnosis = codeOnly("src/lib/support/diagnosis.ts");
      assert.doesNotMatch(diagnosis, /content_preview|snippet|encrypted_|provider_email/, "support diagnostics must never read customer content or credentials");
      assert.doesNotMatch(diagnosis, /\.stack|error\.message/, "no stack trace or raw error may reach a customer");
      assert.doesNotMatch(codeOnly("src/lib/admin/product.ts"), /content_preview|snippet|body/, "internal product intelligence must not read message content");
    });

    await check(22, "Approval and workspace authority are still derived server-side", () => {
      const approve = read("src/app/api/approvals/[id]/approve/route.ts");
      assert.match(approve, /requireWorkspaceRoleForIdentity/, "approval execution must re-derive the caller's role");
      assert.match(approve, /AuthorizationError/);
      const access = read("src/lib/server/workspace-access.ts");
      assert.match(access, /getVerifiedSupabaseUser/, "identity always comes from the verified session, never the request body");
      assert.match(read("src/lib/connectors/oauth-state.ts"), /workspaceId/, "OAuth state must bind the workspace");
    });

    await check(23, "New operational state is row-level secured and server-write-only", () => {
      const sql = read("supabase/migrations/20260908_operational_hardening.sql");
      assert.match(sql, /enable row level security/);
      assert.match(sql, /is_workspace_member\(workspace_id\)/);
      assert.doesNotMatch(sql, /to authenticated using \(true\)/, "no permissive policy may be introduced");
      assert.doesNotMatch(sql, /grant [\s\S]{0,60}to (anon|authenticated)/, "no new browser-writable surface");
    });

    // ── 7. Support diagnostics ───────────────────────────────────────────

    const facts = (overrides = {}) => ({
      emergencyStopEnabled: false, executionEligible: true, activatedOperatorKeys: ["client_flow"],
      reconnectRequiredConnectors: [], permissionRequiredConnectors: [], unhealthyConnectors: [],
      pendingApprovals: 0, rejectedApprovals: 0, blockReasons: {}, suppressedCandidates: 0,
      waitingCandidates: 0, completedStepsWithoutOutcome: 0, providerFailingConnectors: [], ...overrides,
    });

    await check(24, "Diagnostics explain inaction in a fix-this-first order", () => {
      const reasons = describeInactionReasons(facts({
        emergencyStopEnabled: true, reconnectRequiredConnectors: ["jira"], pendingApprovals: 3,
      })).map((reason) => reason.code);
      assert.equal(reasons[0], "emergency_stop_active", "a workspace control the customer set must be explained first");
      assert.ok(reasons.includes("connector_reconnect_required"));
      assert.ok(reasons.includes("approval_pending"));
    });

    await check(25, "An uncertain execution is always surfaced above ordinary waiting", () => {
      const reasons = describeInactionReasons(facts({
        blockReasons: { execution_unknown: 1, connector_not_ready: 4 }, pendingApprovals: 9, suppressedCandidates: 20,
      })).map((reason) => reason.code);
      assert.equal(reasons[0], "execution_unknown");
      assert.ok(reasons.indexOf("execution_unknown") < reasons.indexOf("approval_pending"));
    });

    await check(26, "Every distinct block reason maps to safe, actionable customer copy", () => {
      const cases = [
        [{ blockReasons: { jira_issue_type_not_configured: 1 } }, "connector_target_not_configured"],
        [{ blockReasons: { verified_draft_not_available: 1 } }, "action_materialization_incomplete"],
        [{ blockReasons: { policy_blocked: 1 } }, "policy_denied"],
        [{ blockReasons: { dependency_unavailable: 1 } }, "workflow_blocked"],
        [{ blockReasons: { approval_already_exists: 1 } }, "workflow_deduped"],
        [{ providerFailingConnectors: ["zendesk"] }, "provider_write_failed"],
        [{ activatedOperatorKeys: [] }, "operator_inactive"],
        [{ executionEligible: false }, "billing_ineligible"],
        [{ permissionRequiredConnectors: ["microsoft_teams"] }, "connector_permission_required"],
        [{ degradedConnectors: ["jira"] }, "connector_degraded"],
        [{ suppressedCandidates: 5 }, "signal_suppressed"],
        [{ waitingCandidates: 5 }, "signal_waiting"],
        [{ rejectedApprovals: 1 }, "approval_rejected"],
        [{ completedStepsWithoutOutcome: 2 }, "outcome_pending"],
      ];
      for (const [overrides, expected] of cases) {
        const reasons = describeInactionReasons(facts(overrides));
        assert.ok(reasons.some((reason) => reason.code === expected), `expected ${expected}`);
        for (const reason of reasons) {
          assert.ok(reason.message.length > 20 && /[.!]$/.test(reason.message), `${reason.code} must have a complete human sentence`);
          assert.doesNotMatch(reason.message, /undefined|null|Error|stack|http/i, `${reason.code} copy must stay human`);
        }
      }
    });

    await check(27, "A healthy, quiet workspace is told the truth, not given a fake problem", () => {
      const reasons = describeInactionReasons(facts());
      assert.deepEqual(reasons.map((reason) => reason.code), ["nothing_qualified"]);
      assert.match(reasons[0].message, /deliberately did nothing/);
    });

    await check(28, "The support answer surfaces reason codes only for inaction questions", () => {
      assert.equal(isInactionQuestion("Why didn't Auterim send the follow up?"), true);
      assert.equal(isInactionQuestion("nothing happened yesterday"), true);
      assert.equal(isInactionQuestion("How do I upgrade my plan?"), false);
      const reasons = describeInactionReasons(facts({ blockReasons: { execution_unknown: 1 } }));
      const answered = answerSupportQuestion("Why didn't Auterim act on the escalation?", [], reasons);
      assert.deepEqual(answered.reasonCodes, ["execution_unknown"]);
      assert.match(answered.answer, /stopped and flagged it for review/);
      const unrelated = answerSupportQuestion("How do I upgrade my plan?", [], reasons);
      assert.equal(unrelated.reasonCodes, undefined, "reason codes must not leak into unrelated answers");
    });

    // ── 8. No parallel infrastructure ────────────────────────────────────

    await check(29, "There is still exactly one of each core model", () => {
      const healthModels = fs.readdirSync(path.join(root, "src/lib/connectors")).filter((file) => /truth\.ts$/.test(file));
      assert.deepEqual(healthModels, ["truth.ts"], "there must be exactly one connector health model");
      const retryModules = fs.readdirSync(path.join(root, "src/lib/runtime")).filter((file) => /retry/.test(file));
      assert.deepEqual(retryModules, ["provider-retry.ts"], "there must be exactly one retry framework");
      assert.equal(fs.existsSync(path.join(root, "src/lib/connectors/refresh-lock.ts")), true);
      const credentialTables = read("supabase/migrations/20260908_operational_hardening.sql").match(/create table if not exists public\.\w+/g) ?? [];
      assert.deepEqual(credentialTables, ["create table if not exists public.os_provider_operations"], "this pass may add exactly one small operational table");
      const packageJson = JSON.parse(read("package.json"));
      assert.equal(packageJson.dependencies.redis, undefined, "no Redis may be introduced");
      assert.equal(packageJson.dependencies.ioredis, undefined);
      assert.equal(packageJson.dependencies.bullmq, undefined, "no second queue system may be introduced");
    });

    await check(30, "The four target gaps are closed by real, wired code", () => {
      // 1. Distributed OAuth refresh locking.
      assert.match(read("supabase/migrations/20260908_operational_hardening.sql"), /claim_os_connector_refresh_lock/);
      // 2. Scheduled stuck workflow recovery.
      assert.match(read("src/trigger/workflow-recovery.ts"), /schedules\.task\(/);
      assert.match(read("src/trigger/workflow-recovery.ts"), /recoverStuckWorkflowSteps/);
      // 3. Provider failure integration coverage.
      const packageJson = JSON.parse(read("package.json"));
      for (const script of ["test:distributed-oauth-refresh", "test:stuck-workflow-scheduler", "test:provider-failure-integration", "test:operational-metrics", "test:queue-lag", "test:beta-runtime-final"]) {
        assert.ok(packageJson.scripts[script], `${script} must be registered`);
      }
      // 4. Universal provider failure counters and lag metrics.
      assert.match(read("src/lib/admin/product.ts"), /operations: \{/);
      assert.match(read("src/lib/runtime/provider-health.ts"), /export async function recordProviderFailure/);
      assert.match(read("src/lib/runtime/pipeline-metrics.ts"), /export async function getPipelineLagMetrics/);
    });

    assert.deepEqual(results, Array.from({ length: 30 }, (_, index) => index + 1));
    console.log("beta-runtime-final-smoke: all 30 controlled-beta runtime checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
