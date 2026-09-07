import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const evaluator = read("src/lib/policies/evaluate.ts");
const engine = read("src/lib/policies/execution-policy.ts");
const registry = read("src/lib/actions/registry.ts");
const approvals = read("src/app/api/approvals/[id]/approve/route.ts");
const prepareRoute = read("src/app/api/actions/prepare/route.ts");
const migration = read("supabase/migrations/20260907_execution_policy_engine.sql");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-policy-"));

const policy = (autonomyMode) => ({
  autonomyMode, emergencyStopEnabled: false, customerEmailMode: "approval_required",
  internalSlackNotificationsAllowed: false, dailyBriefAllowed: true, connectorHealthChecksAllowed: true,
  lowRiskProjectToolCommentsAllowed: true, crmWritesRequireApproval: true,
  projectToolWritesRequireApproval: true, customerFacingActionsRequireApproval: true,
  maxAutonomousActionsPerHour: 10, maxAutonomousActionsPerDay: 50,
});
const action = (overrides = {}) => ({
  workspaceId: "ws-1", operatorKey: "operations", actionType: "add_task_comment", connectorKey: "trello",
  destinationType: "project_tool", riskLevel: "low", confidence: "high", ...overrides,
});

try {
  assert.match(engine, /getWorkspaceExecutionEligibility/, "the runtime engine uses the existing billing eligibility source");
  assert.match(engine, /getConnectorTruth/, "the runtime engine checks live connector truth");
  assert.match(engine, /operatorIsExplicitlyPaused/, "paused operators are blocked at runtime");
  assert.match(engine, /withinAutonomyLimits/, "auto execution has hourly and daily limits");
  assert.match(engine, /policy_evaluation_failed/, "policy failures fail closed");
  assert.match(engine, /execution_intent_unavailable/, "provider execution is blocked without a durable intent");
  assert.doesNotMatch(registry, /"salesforce"/, "Salesforce is not registered as a write adapter");
  assert.match(migration, /unique \(workspace_id, action_hash\)/, "execution intents are idempotent per workspace/action hash");
  assert.match(migration, /enable row level security/, "execution intents are RLS-protected");
  assert.match(approvals, /evaluateExecutionPolicy/, "all approval execution paths use the live policy engine");
  assert.doesNotMatch(approvals, /evaluatePolicy\(/, "the approval route does not rely on the UI-only policy evaluator");
  assert.match(prepareRoute, /evaluateExecutionPolicy/, "prepared Trello actions are authorized before auto execution");
  assert.match(prepareRoute, /status: "executing"/, "auto execution records its durable intent before the provider adapter");

  const source = evaluator.replace(/import type[\s\S]*?from "@\/lib\/policies\/types";\r?\n/, "");
  const compiled = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "evaluate.mjs");
  fs.writeFileSync(file, compiled);
  const { evaluatePolicy } = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);

  assert.equal(evaluatePolicy(action(), policy("manual")).decision, "blocked", "manual mode never writes");
  assert.equal(evaluatePolicy(action(), policy("approval_first")).decision, "approval_required", "approval-first remains safe by default");
  assert.equal(evaluatePolicy(action(), policy("guarded"), { canRunRealActions: true, billingStatus: "active" }).decision, "allow_auto", "guarded low-risk actions can be authorized");
  assert.equal(evaluatePolicy(action({ actionType: "send_email", destinationType: "external", riskLevel: "high" }), policy("autonomous"), { canRunRealActions: true, billingStatus: "active" }).decision, "approval_required", "external email never auto-sends");
  assert.equal(evaluatePolicy(action({ destructive: true }), policy("autonomous")).decision, "blocked", "destructive actions are denied in every mode");
  console.log("Central policy gates, autonomy rules, adapter inventory, and durable execution contracts passed.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
