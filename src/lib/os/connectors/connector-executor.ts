import type { Agent, Approval, ExecutionLog, OSState } from "@/lib/os/types";
import { evaluatePolicy, type PolicyEvaluationAction } from "@/lib/os/policy-engine";
import { getToolDefinition } from "@/lib/os/tools/tool-registry";
import { getEntitlements } from "@/lib/os/entitlements";

let seq = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++seq}`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function makeLog(agent: Agent, runId: string, event: string, message: string, status: ExecutionLog["status"]): ExecutionLog {
  return {
    id: uid("log"),
    ts: nowTime(),
    runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    event,
    message,
    duration: "-",
    status,
  };
}

export interface ExecuteToolActionInput {
  state: OSState;
  toolId: string;
  input: Record<string, unknown>;
  agent: Agent;
  runId: string;
  approvalGranted?: boolean;
}

export interface PendingToolAction {
  toolId: string;
  input: Record<string, unknown>;
}

export interface ToolActionExecutionResult {
  status: "completed" | "require_approval" | "blocked";
  output?: string;
  logs: ExecutionLog[];
  approval?: Approval;
  pendingAction?: PendingToolAction;
  reason?: string;
}

function hasScopes(scopes: string[], required: string[] = []): boolean {
  return required.every((scope) => scopes.includes(scope));
}

export function executeToolAction(payload: ExecuteToolActionInput): ToolActionExecutionResult {
  const { state, toolId, input, agent, runId, approvalGranted } = payload;
  const tool = getToolDefinition(toolId);
  if (!tool) {
    return {
      status: "blocked",
      reason: `Tool not found: ${toolId}`,
      logs: [makeLog(agent, runId, "tool.blocked", `Tool not found: ${toolId}`, "error")],
    };
  }

  const logs: ExecutionLog[] = [];
  logs.push(makeLog(agent, runId, "tool.requested", `${tool.id} requested`, "ok"));

  const entitlements = getEntitlements(state.workspace);
  if (!entitlements.canRunRealActions) {
    logs.push(makeLog(agent, runId, "execution.blocked", "Real execution requires an active plan", "warn"));
    return {
      status: "blocked",
      reason: "Real execution requires an active plan",
      logs,
    };
  }

  if (tool.blocked) {
    logs.push(makeLog(agent, runId, "tool.blocked", `${tool.id} is blocked`, "error"));
    return { status: "blocked", reason: `${tool.id} is blocked`, logs };
  }

  if (tool.connectorId) {
    const connector = state.connectors.find((item) => item.id === tool.connectorId);
    if (!connector || !connector.isConnected) {
      logs.push(makeLog(agent, runId, "connector.missing", `Missing connector: ${tool.connectorId}`, "error"));
      return { status: "blocked", reason: `Missing connector: ${tool.connectorId}`, logs };
    }
    if (!hasScopes(connector.readScopes, tool.requiredReadScopes) || !hasScopes(connector.writeScopes, tool.requiredWriteScopes)) {
      logs.push(makeLog(agent, runId, "connector.scope_missing", `Scope mismatch on ${connector.name}`, "error"));
      return { status: "blocked", reason: `Scope mismatch on ${connector.name}`, logs };
    }
  }

  const policyAction: PolicyEvaluationAction = {
    id: uid("policy-action"),
    agentId: agent.id,
    toolId: tool.id,
    connectorId: tool.connectorId,
    actionType: tool.actionType,
    target: typeof input.email === "string" ? input.email : undefined,
    payload: input,
    riskLevel: tool.riskLevel,
    customerFacing: Boolean(input.email || input.customerFacing),
    externalRecipient: Boolean(input.email || input.externalRecipient),
    financialAction: tool.actionType === "payment.refund" || Boolean(input.financialAction),
    destructiveAction: tool.actionType === "crm.deleteRecord" || tool.actionType === "memory.delete" || Boolean(input.destructiveAction),
    containsPricing: Boolean(input.containsPricing || (typeof input.summary === "string" && input.summary.toLowerCase().includes("pricing"))),
    amount: typeof input.amount === "number" ? input.amount : undefined,
    metadata: { runId, connectorId: tool.connectorId },
  };
  const policy = evaluatePolicy(policyAction, state);
  logs.push(makeLog(agent, runId, "policy.evaluated", `${tool.actionType}: ${policy.reason}`, "ok"));
  if (policy.decision === "block") {
    logs.push(makeLog(agent, runId, "policy.blocked", `${tool.id} blocked by policy`, "error"));
    return { status: "blocked", reason: policy.reason, logs };
  }

  const requiresApproval = !approvalGranted && (tool.requiresApproval || policy.decision === "require_approval");
  if (requiresApproval) {
    const approvalId = uid("appr");
    const approval: Approval = {
      id: approvalId,
      type: "action",
      title: tool.actionType === "email.send" ? "Approval required before sending" : `Approval required - ${tool.name}`,
      body: tool.actionType === "email.send"
        ? `Approval required before sending to ${String(input.email ?? "recipient")}.`
        : `${tool.description} requires approval before execution.`,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      runId,
      status: "pending",
      createdAt: new Date().toISOString(),
      proposedAction: tool.actionType,
      draftOutput: tool.actionType === "email.send"
        ? `To: ${String(input.email ?? "")} | Subject: ${String(input.subject ?? "Follow-up")}`
        : `Pending ${tool.id}`,
      policyChecks: policy.matchedPolicies.map((item) => item.name).concat(policy.reason),
      reviewerRole: policy.requiredReviewerRole,
      continuationPayload: tool.actionType === "email.send"
        ? {
          kind: "gmail.send_after_approval",
          workspaceId: state.workspace.id,
          to: String(input.email ?? ""),
          subject: String(input.subject ?? "Follow-up from Inovense"),
          body: String(input.body ?? "Following up as discussed."),
        }
        : undefined,
    };
    logs.push(makeLog(agent, runId, "policy.approval_required", `Approval required for ${tool.id}`, "waiting"));
    return { status: "require_approval", logs, approval, pendingAction: { toolId, input }, reason: policy.reason };
  }

  if (tool.connectorId === "hubspot") {
    logs.push(makeLog(agent, runId, "tool.not_implemented", `${tool.id} is not implemented for production execution yet`, "warn"));
    return { status: "completed", output: "action_not_implemented", logs };
  }

  const handled = tool.handler(input, { state, agentId: agent.id, runId });
  logs.push(makeLog(agent, runId, "policy.allowed", `${tool.id} allowed by policy`, "ok"));
  logs.push(makeLog(agent, runId, "tool.completed", `${tool.id} completed: ${handled.output}`, "ok"));
  return { status: "completed", output: handled.output, logs };
}
