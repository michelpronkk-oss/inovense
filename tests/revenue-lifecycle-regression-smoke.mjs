import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const read = (file) => fs.readFileSync(file, "utf8");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-revenue-lifecycle-"));

try {
  const inboundCode = esbuild.transformSync(read("src/lib/signals/inbound.ts").replace(/^import[^\n]+\n/gm, ""), { loader: "ts", format: "esm", target: "node18" }).code;
  const inboundFile = path.join(temp, "inbound.mjs");
  fs.writeFileSync(inboundFile, inboundCode);
  const inbound = await import(pathToFileURL(inboundFile).href);
  const incoming = inbound.normalizeInboundCommunication({
    workspaceId: "ws-regression",
    source: "gmail",
    provider: "gmail",
    connectorKey: "gmail",
    sourceType: "email",
    eventType: "message.received",
    sourceId: "gmail-message-1",
    sourceParentId: "gmail-thread-1",
    threadId: "gmail-thread-1",
    from: "Alex Buyer <alex@example.com>",
    subject: "Need final pricing before we decide",
    snippet: "We expect to start with 18 users. What is the monthly price? Please include onboarding and expansion options; we decide Wednesday.",
    occurredAt: "2026-09-13T09:00:00.000Z",
    metadata: { threadMessageCount: 1 },
  });
  const classification = inbound.classifyInboundCommunication(incoming);
  assert.equal(classification.primaryIntent, "PRICING_REQUEST");
  assert.equal(classification.primaryOperator, "revenue");
  assert.equal(classification.actionability, "WORKFLOW_CANDIDATE");
  assert.equal(classification.confidence, "high");

  // Exercise Revenue's own detector/scorer/next-action decision using the
  // exact body characteristics in the founder's regression fixture.
  const scanSource = read("src/lib/operators/revenue/scan.ts");
  const detectorStart = scanSource.indexOf("export type RevenueConfidence");
  const detectorEnd = scanSource.indexOf("function titleCaseName", detectorStart);
  assert.ok(detectorStart >= 0 && detectorEnd > detectorStart, "Revenue detection block must remain a bounded, testable source section");
  const detectorCode = esbuild.transformSync(`${scanSource.slice(detectorStart, detectorEnd)}\nexport { detectOpportunity, scoreOpportunitySignal, decideNextAction };`, { loader: "ts", format: "esm", target: "node18" }).code;
  const detectorFile = path.join(temp, "revenue-detection.mjs");
  fs.writeFileSync(detectorFile, detectorCode);
  const revenueDetection = await import(pathToFileURL(detectorFile).href);
  const sampleMessage = {
    id: "gmail-message-1",
    threadId: "gmail-thread-1",
    labelIds: ["INBOX"],
    from: "Alex Buyer <alex@gmail.com>",
    fromEmail: "alex@gmail.com",
    to: "founder@auterim.com",
    subject: "Need final pricing before we decide",
    date: "2026-09-13T09:00:00.000Z",
    snippet: "We expect to start with 18 users. What is the monthly price? Please include onboarding and expansion options; we decide Wednesday.",
    bodyText: "We expect to start with 18 users. What is the monthly price? Please include onboarding and expansion options; we decide Wednesday.",
  };
  const detected = revenueDetection.detectOpportunity(sampleMessage, "founder@auterim.com");
  assert.equal(detected.kind, "opportunity");
  assert.ok(detected.directSignals.includes("pricing"));
  const scored = revenueDetection.scoreOpportunitySignal({ directSignals: detected.directSignals, requestSignals: detected.requestSignals, contextSignals: detected.contextSignals, matchedKeywords: detected.matchedKeywords, fromEmail: sampleMessage.fromEmail, text: sampleMessage.bodyText });
  assert.equal(scored.confidence, "medium", "a direct pricing request from a personal Gmail sender is actionable without overstating confidence");
  assert.equal(revenueDetection.decideNextAction({ confidence: scored.confidence, directSignals: detected.directSignals }).action, "prepare_email_reply");

  const workflowSource = read("src/lib/operators/revenue/workflow.ts").replace(/^import[^\n]+\n/gm, "");
  const prelude = `
    function canonicalWorkDedupeKey(input) { return [input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator].map((value) => String(value || "unknown").replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 180)).join(":").slice(0, 480); }
    function canonicalWorkflowDedupeKey(input) { return ("workflow:" + canonicalWorkDedupeKey(input)).slice(0, 480); }
    function explicitBusinessProblemKey(metadata) { const value = metadata?.businessProblemId ?? metadata?.businessProblemKey ?? metadata?.caseId; return typeof value === "string" && value.trim() ? value.trim().slice(0, 180) : null; }
    function canonicalBusinessProblemWorkflowDedupeKey(input) { return canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: "business_problem", entityId: input.problemKey, intent: input.intent, primaryOperator: input.primaryOperator }); }
    async function findSupportingWorkflow() { return null; }
    async function createSupportingWorkflow() {}
  `;
  const workflowCode = esbuild.transformSync(`${prelude}\n${workflowSource}`, { loader: "ts", format: "esm", target: "node18" }).code;
  const workflowFile = path.join(temp, "revenue-workflow.mjs");
  fs.writeFileSync(workflowFile, workflowCode);
  const { ensureRevenueWorkflow, linkRevenueApprovalWorkflow } = await import(pathToFileURL(workflowFile).href);

  const database = new Map([["os_workflow_runs", []], ["os_workflow_steps", []], ["os_approvals", []]]);
  let timestampTick = 0;
  const nextTimestamp = () => new Date(Date.now() + timestampTick++).toISOString();
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.maxRows = null; this.operation = "select"; }
    select() { return this; }
    eq(field, value) { this.filters.push((row) => row[field] === value); return this; }
    in(field, values) { this.filters.push((row) => values.includes(row[field])); return this; }
    order(field, options = {}) { this.orders.push([field, options.ascending !== false]); return this; }
    limit(value) { this.maxRows = value; return this; }
    upsert(value, options) { this.operation = "upsert"; this.value = value; this.options = options; return this; }
    insert(value) { this.operation = "insert"; this.value = value; return this; }
    update(value) { this.operation = "update"; this.value = value; return this; }
    maybeSingle() { const result = this.execute(); return Promise.resolve({ ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }); }
    then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
    execute() {
      const rows = database.get(this.table) ?? [];
      const matched = () => rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.operation === "insert") {
        const incomingRows = Array.isArray(this.value) ? this.value : [this.value];
        for (const incomingRow of incomingRows) {
          const duplicate = rows.some((row) => row.id === incomingRow.id
            || (this.table === "os_workflow_steps" && row.workflow_id === incomingRow.workflow_id && row.step_order === incomingRow.step_order)
            || (this.table === "os_workflow_steps" && incomingRow.source_signal_id && row.workflow_id === incomingRow.workflow_id && row.source_signal_id === incomingRow.source_signal_id && row.action_type === incomingRow.action_type));
          if (duplicate) return { data: null, error: { code: "23505", message: "duplicate key" } };
          rows.push({ ...incomingRow, created_at: incomingRow.created_at ?? nextTimestamp(), updated_at: incomingRow.updated_at ?? nextTimestamp() });
        }
        return { data: incomingRows, error: null };
      }
      if (this.operation === "upsert") {
        const incomingRows = Array.isArray(this.value) ? this.value : [this.value];
        for (const incomingRow of incomingRows) {
          const conflict = rows.find((row) => row.workspace_id === incomingRow.workspace_id && row.dedupe_key === incomingRow.dedupe_key);
          if (conflict && this.options?.ignoreDuplicates) continue;
          if (conflict) Object.assign(conflict, incomingRow, { updated_at: nextTimestamp() });
          else rows.push({ ...incomingRow, created_at: incomingRow.created_at ?? nextTimestamp(), updated_at: nextTimestamp() });
        }
        return { data: incomingRows, error: null };
      }
      if (this.operation === "update") {
        const changed = matched();
        for (const row of changed) Object.assign(row, this.value, { updated_at: nextTimestamp() });
        return { data: changed, error: null };
      }
      let result = matched();
      for (const [field, ascending] of this.orders) result = result.slice().sort((left, right) => String(left[field] ?? "").localeCompare(String(right[field] ?? "")) * (ascending ? 1 : -1));
      if (this.maxRows !== null) result = result.slice(0, this.maxRows);
      return { data: result, error: null };
    }
  }
  const supabase = { from: (table) => new Query(table) };
  const makeCandidate = ({ messageId, threadId, signalId, signalType = "sales_opportunity", metadata = {} }) => ({
    id: `candidate:${signalId}`,
    signalId,
    workspaceId: "ws-regression",
    operatorKey: "revenue",
    signalType,
    confidence: "high",
    priority: 75,
    source: "gmail",
    sourceId: messageId,
    routeReason: "commercial test signal",
    status: "routed",
    metadata,
    evidence: { provider: "gmail", sourceId: messageId, threadId },
  });
  const prepared = await ensureRevenueWorkflow({ supabase, workspaceId: "ws-regression", signalId: "signal-1", candidate: makeCandidate({ messageId: "gmail-message-1", threadId: "gmail-thread-1", signalId: "signal-1" }), connectorKey: "gmail", targetRef: "gmail-thread-1" });
  assert.equal(prepared.identity, "thread");
  assert.equal(prepared.stepOrder, 1);
  database.get("os_approvals").push({ id: "approval-1", workspace_id: "ws-regression", status: "pending", continuation_payload: { workflowId: prepared.workflowId } });
  await linkRevenueApprovalWorkflow({ supabase, workspaceId: "ws-regression", workflowId: prepared.workflowId, stepId: prepared.stepId, approvalId: "approval-1" });
  const timestampAfterFirst = database.get("os_workflow_runs")[0].updated_at;

  const retry = await ensureRevenueWorkflow({ supabase, workspaceId: "ws-regression", signalId: "signal-1", candidate: makeCandidate({ messageId: "gmail-message-1", threadId: "gmail-thread-1", signalId: "signal-1" }), connectorKey: "gmail", targetRef: "gmail-thread-1" });
  assert.equal(retry.workflowId, prepared.workflowId);
  assert.equal(retry.stepId, prepared.stepId);
  assert.equal(retry.existingApprovalId, "approval-1");
  assert.equal(database.get("os_workflow_runs")[0].updated_at, timestampAfterFirst, "a retry of the same signal must not refresh workflow activity");

  const newerSignal = await ensureRevenueWorkflow({ supabase, workspaceId: "ws-regression", signalId: "signal-2", candidate: makeCandidate({ messageId: "gmail-message-2", threadId: "gmail-thread-1", signalId: "signal-2", signalType: "commercial_intent" }), connectorKey: "gmail", targetRef: "gmail-thread-1" });
  assert.equal(newerSignal.workflowId, prepared.workflowId, "new intent within the same provider thread stays on its conversation workflow");
  assert.equal(newerSignal.stepOrder, 2);
  assert.equal(newerSignal.existingApprovalId, null);
  assert.equal(database.get("os_approvals")[0].status, "superseded", "an outdated pending draft is removed from the live queue");
  assert.equal(database.get("os_approvals")[0].continuation_payload.supersededBySignalId, "signal-2");
  assert.equal(database.get("os_workflow_steps")[0].status, "skipped");
  database.get("os_approvals").push({ id: "approval-2", workspace_id: "ws-regression", status: "pending", continuation_payload: { workflowId: newerSignal.workflowId, workflowStepId: newerSignal.stepId } });
  const linked = await linkRevenueApprovalWorkflow({ supabase, workspaceId: "ws-regression", workflowId: newerSignal.workflowId, stepId: newerSignal.stepId, approvalId: "approval-2" });
  assert.ok(Date.parse(linked.updatedAt) > Date.parse(timestampAfterFirst), "the displayed workflow activity time advances with the new approval");
  assert.equal(database.get("os_workflow_runs")[0].originating_signal_id, "signal-2");
  assert.equal(database.get("os_workflow_runs")[0].status, "awaiting_approval");
  assert.equal(database.get("os_workflow_steps")[1].status, "awaiting_approval");
  const pendingApprovals = database.get("os_approvals").filter((row) => row.workspace_id === "ws-regression" && row.status === "pending");
  assert.deepEqual(pendingApprovals.map((row) => row.id), ["approval-2"]);
  assert.equal(pendingApprovals[0].continuation_payload.workflowId, newerSignal.workflowId);
  assert.equal(pendingApprovals[0].continuation_payload.workflowStepId, newerSignal.stepId);

  const distinct = await ensureRevenueWorkflow({ supabase, workspaceId: "ws-regression", signalId: "signal-3", candidate: makeCandidate({ messageId: "gmail-message-3", threadId: "gmail-thread-2", signalId: "signal-3" }), connectorKey: "gmail", targetRef: "gmail-thread-2" });
  assert.notEqual(distinct.workflowId, prepared.workflowId, "a distinct Gmail thread must not merge into the prior opportunity");
  assert.equal(database.get("os_workflow_runs").length, 2);

  const scan = read("src/lib/operators/revenue/scan.ts");
  const gmailApproval = read("src/lib/operators/executors/gmail.ts");
  const microsoftApproval = read("src/lib/operators/executors/microsoft.ts");
  const approvalRoute = read("src/app/api/approvals/route.ts");
  const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
  const workflowPresentation = read("src/lib/workflows/presentation.ts");
  const lifecycleLog = read("src/lib/operators/revenue/lifecycle-log.ts");
  const workflowsPage = read("src/app/app/workflows/page.tsx");
  const trigger = read("src/trigger/revenue-operator-scan.ts");
  const migration = read("supabase/migrations/20260913_revenue_workflow_signal_identity.sql");
  assert.match(scan, /materializeWorkflows: false/);
  assert.match(scan, /ensureRevenueWorkflow/);
  assert.match(scan, /linkRevenueApprovalWorkflow/);
  assert.match(scan, /status: "action_proposed"/);
  assert.match(lifecycleLog, /\[revenue-lifecycle\]/);
  assert.doesNotMatch(lifecycleLog, /body|token|authorization|to:/i, "structured lifecycle logs must not include customer content or credentials");
  assert.match(gmailApproval, /buildBundledApprovalGovernance/);
  assert.match(gmailApproval, /status: "pending"/);
  assert.match(gmailApproval, /workflowStepId: typeof input\.sourceMetadata\?\.workflowStepId/);
  assert.match(gmailApproval, /workflowObjective: typeof input\.sourceMetadata\?\.workflowObjective/);
  assert.match(microsoftApproval, /workflowStepId: typeof input\.sourceMetadata\?\.workflowStepId/);
  assert.match(gmailApproval, /\.in\("status", \["pending", "executing", "approved"\]\)/, "retrying the same action must reuse its active approval");
  assert.match(microsoftApproval, /\.in\("status", \["pending", "executing", "approved"\]\)/);
  assert.match(migration, /status in \('pending', 'executing', 'approved'\)/, "the database uniqueness guard must cover in-flight approvals too");
  assert.match(approvalRoute, /\.eq\("workspace_id", context\.workspaceId\)/);
  assert.match(approvalRoute, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(approveRoute, /\.eq\("status", "pending"\)[\s\S]{0,100}\.select\("id"\)[\s\S]{0,60}\.maybeSingle\(\)/, "approval execution atomically claims only a pending approval before sending");
  assert.match(approveRoute, /status: "executing"/);
  assert.match(approveRoute, /advanceWorkflowForApproval/);
  assert.match(approveRoute, /workflowStepId: typeof rec\.workflowStepId === "string" \? rec\.workflowStepId : null/);
  assert.match(approveRoute, /logRevenueLifecycle\("execution_started"/);
  assert.match(approveRoute, /logRevenueLifecycle\("execution_completed"/);
  assert.match(scan, /logRevenueLifecycle\("outcome_recorded"/);
  assert.match(workflowPresentation, /\.order\("updated_at", \{ ascending: false \}\)/);
  assert.match(workflowsPage, /relativeTime\(workflow\.updatedAt\)/);
  assert.match(trigger, /scanRevenueOpportunities\(\{ workspaceId, sourceMode: "manual" \}\)/);
  assert.match(trigger, /scanRevenueOpportunities\(\{ workspaceId, sourceMode: "scheduled" \}\)/);
  console.log("Revenue lifecycle regression: commercial intent routing, thread identity, signal idempotency, superseded approval, workflow timestamps, and persisted cross-surface references passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
