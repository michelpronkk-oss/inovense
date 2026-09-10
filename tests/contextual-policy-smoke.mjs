import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-contextual-policy-"));

async function load(relPath) {
  let source = fs.readFileSync(path.join(root, relPath), "utf8");
  source = source.replace(/import type \{[\s\S]*?\} from "@\/lib\/policies\/types";\r?\n/g, "");
  if (relPath.endsWith("approval-scope.ts")) {
    source = source.replace('import { businessContextFingerprint } from "@/lib/policies/context";', `
function businessContextFingerprint(context) {
  if (!context) return null;
  const value = JSON.stringify(context, Object.keys(context).sort());
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return \`ctx-\${(hash >>> 0).toString(16).padStart(8, "0")}\`;
}`);
    source = source.replace('import { memoryDependencyFingerprint, type MemoryDependency } from "@/lib/memory/model";', `
function memoryDependencyFingerprint(dependencies) {
  if (!dependencies.length) return null;
  const value = JSON.stringify(dependencies.slice().sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey)));
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return \`mem-\${(hash >>> 0).toString(16).padStart(8, "0")}\`;
}`);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const outfile = path.join(tmp, `${path.basename(relPath, path.extname(relPath))}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(outfile, code, "utf8");
  return import(`${pathToFileURL(outfile).href}?v=${Math.random()}`);
}

const rule = {
  id: "hubspot.deal.eur_10000.approval",
  enabled: true,
  connector: "hubspot",
  action: null,
  subjectType: "deal",
  conditions: [
    { field: "deal.amount", operator: "gte", value: 10000 },
    { field: "deal.currency", operator: "eq", value: "EUR" },
  ],
  decision: "approval_required",
  approverRoles: ["owner", "admin"],
  expiresAfterMinutes: 60,
  priority: 100,
  reason: "Deals at or above the configured EUR threshold require approval.",
};

const policy = (overrides = {}) => ({
  version: 2,
  autonomyMode: "autonomous",
  emergencyStopEnabled: false,
  customerEmailMode: "approval_required",
  internalSlackNotificationsAllowed: true,
  dailyBriefAllowed: true,
  connectorHealthChecksAllowed: true,
  lowRiskProjectToolCommentsAllowed: true,
  crmWritesRequireApproval: true,
  projectToolWritesRequireApproval: true,
  customerFacingActionsRequireApproval: true,
  maxAutonomousActionsPerHour: 10,
  maxAutonomousActionsPerDay: 50,
  actionRules: [rule],
  connectorPolicies: {},
  ...overrides,
});

const deal = (amount, currency = "EUR", reliability = "verified") => ({
  deal: {
    amount: { value: amount, reliability },
    currency: { value: currency, reliability },
  },
});

const action = (businessContext) => ({
  workspaceId: "ws-1",
  operatorKey: "revenue",
  actionType: "update_crm_record",
  connectorKey: "hubspot",
  destinationType: "crm",
  riskLevel: "medium",
  subjectType: "deal",
  subjectId: "deal-1",
  businessContext,
});

try {
  const { evaluatePolicy } = await load("src/lib/policies/evaluate.ts");
  const { approvalScopesEqual, buildApprovalScope, emailPayloadIdentity } = await load("src/lib/policies/approval-scope.ts");

  const below = evaluatePolicy(action(deal(9999)), policy());
  assert.equal(below.decision, "approval_required");
  assert.equal(below.evidence.threshold.result, "not_matched");
  assert.equal(below.matchedRuleIds.includes(rule.id), false);

  const exact = evaluatePolicy(action(deal(10000)), policy());
  assert.equal(exact.decision, "approval_required");
  assert.deepEqual(exact.matchedRuleIds, [rule.id]);
  assert.equal(exact.evidence.threshold.result, "matched");
  assert.equal(exact.evidence.threshold.observedValue, 10000);

  const above = evaluatePolicy(action(deal(12500)), policy());
  assert.deepEqual(above.matchedRuleIds, [rule.id]);

  for (const context of [deal(null), deal(10000, null), deal(10000, "USD"), deal(10000, "EUR", "stale")]) {
    const decision = evaluatePolicy(action(context), policy());
    assert.equal(decision.decision, "approval_required", "incomplete or non-EUR context must fail closed");
  }

  const emergency = evaluatePolicy(action(deal(10000)), policy({ emergencyStopEnabled: true }));
  assert.equal(emergency.decision, "blocked");

  const destructive = evaluatePolicy({
    ...action(deal(10000)),
    destructive: true,
  }, policy({ actionRules: [{ ...rule, id: "crm.allow", decision: "allow_auto", reason: "Business rule allows this test action." }] }));
  assert.equal(destructive.decision, "blocked", "platform destructive safety must beat a business allow");

  const denied = evaluatePolicy({
    ...action(deal(10000)),
    actionType: "send_slack_message",
    connectorKey: "slack",
    destinationType: "internal",
    actionRules: undefined,
  }, policy({ actionRules: [{ ...rule, id: "slack.blocked", connector: "slack", action: "send_slack_message", subjectType: null, conditions: [], decision: "blocked", priority: 200, reason: "Slack is blocked for this test." }] }));
  assert.equal(denied.decision, "blocked");

  const scopeInput = {
    workspaceId: "ws-1",
    operatorKey: "revenue",
    actionType: "send_email",
    connectorKey: "gmail",
    destinationType: "customer",
    riskLevel: "high",
    recipient: "buyer@example.com",
    metadata: { payloadIdentity: emailPayloadIdentity("Subject", "Body") },
  };
  const emailDecision = evaluatePolicy(scopeInput, policy({ actionRules: [] }));
  const scope = buildApprovalScope(scopeInput, emailDecision);
  assert.equal(approvalScopesEqual(scope, { ...scope, contextFingerprint: "ctx-changed" }), false, "context changes must require reapproval");
  assert.equal(scope.parameters.payloadIdentity, emailPayloadIdentity("Subject", "Body"));
  assert.equal(approvalScopesEqual(scope, { ...scope, connector: "slack", action: "send_slack_message" }), false, "an approval scope must not authorize another connector action");
  assert.equal(approvalScopesEqual(scope, { ...scope, subjectId: "deal-2" }), false, "an approval scope must not authorize another subject");

  const connectorDraft = evaluatePolicy(scopeInput, policy({ actionRules: [], connectorPolicies: { gmail: { customerEmailMode: "draft_only" } } }));
  assert.equal(connectorDraft.decision, "draft_only", "a live connector override must reach the evaluator");
  const microsoftApproval = evaluatePolicy({ ...scopeInput, connectorKey: "microsoft" }, policy({ actionRules: [], connectorPolicies: { gmail: { customerEmailMode: "draft_only" } } }));
  assert.equal(microsoftApproval.decision, "approval_required", "connector overrides must not leak to another provider");

  const crmBaseline = evaluatePolicy(action(deal(10000)), policy({ actionRules: [] }));
  assert.equal(crmBaseline.decision, "approval_required", "CRM writes remain approval-required without contextual rules");

  const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260910_contextual_policy_governance.sql"), "utf8");
  assert.match(migration, /approval_scope jsonb/);
  assert.match(migration, /policy_evidence jsonb/);
  const bundledGovernance = fs.readFileSync(path.join(root, "src/lib/policies/approval-governance.ts"), "utf8");
  assert.match(bundledGovernance, /approvalScopes:/);
  assert.match(bundledGovernance, /email:/);
  assert.match(bundledGovernance, /hubspot/);
  assert.match(fs.readFileSync(path.join(root, "supabase/migrations/20260907_execution_policy_engine.sql"), "utf8"), /unique \(workspace_id, action_hash\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "src/lib/settings/workspace-policy.ts"), "utf8"), /crmWrites:\s*"Auto-approve"/);
  console.log("Contextual policy matching, fail-closed thresholds, scope reapproval, evidence persistence, and approval-scope contracts passed.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
