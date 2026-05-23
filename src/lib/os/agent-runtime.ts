import type { Agent, AgentRun, Approval, ExecutionLog, MemoryEntry, OSState, PolicyEffect, RunStep } from "@/lib/os/types";
import { getDefinitionByAgentName } from "@/lib/os/agent-definitions";
import { executeMockTool } from "@/lib/os/mock-tools";

let rtCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++rtCounter}`;
}

function ts(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function policyForAction(action: string): PolicyEffect {
  if (action === "send_external_email") return "require_approval";
  if (action === "write_crm") return "allow";
  if (action === "delete_crm_record") return "block";
  if (action === "change_pricing") return "block";
  if (action === "refund_create") return "block";
  if (action === "post_internal_slack_summary") return "allow";
  if (action === "write_memory") return "allow";
  if (action === "delete_memory") return "require_approval";
  if (action === "calendar_external_invite") return "require_approval";
  return "allow";
}

function logFor(agent: Agent, runId: string, event: string, message: string, status: ExecutionLog["status"]): ExecutionLog {
  return {
    id: uid("log"),
    ts: ts(),
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

export interface RuntimeResult {
  run: AgentRun;
  logs: ExecutionLog[];
  approval?: Approval;
  memoryWrites: MemoryEntry[];
}

export function createInboundRevenuePlan(runId: string): RunStep[] {
  const base = [
    ["step-1", "Read inbound lead", "Parse inbound trigger payload", "memory.search", "low"],
    ["step-2", "Score lead fit", "Apply ICP scoring to inbound lead", "logs.write", "low"],
    ["step-3", "Enrich CRM context", "Update lead context in HubSpot", "hubspot.updateLead", "medium"],
    ["step-4", "Draft personalized follow-up", "Create contextual email draft", "gmail.createDraft", "medium"],
    ["step-5", "Check outbound email policy", "Evaluate external send policy", "logs.write", "high"],
    ["step-6", "Create approval request", "Route outbound send to approval inbox", "logs.write", "high"],
    ["step-7", "Mark email as sent", "Complete send after approval", "gmail.sendApprovedEmailMock", "high"],
    ["step-8", "Update CRM", "Write communication status to CRM", "hubspot.updateLead", "medium"],
    ["step-9", "Send Slack summary", "Post internal execution summary", "slack.postSummary", "low"],
    ["step-10", "Write final memory", "Persist run summary in memory", "memory.write", "low"],
  ] as const;
  return base.map((b) => ({ id: `${runId}-${b[0]}`, name: b[1], sub: b[2], tool: b[3], riskLevel: b[4] as "low" | "medium" | "high", state: "pending" }));
}

export function runAgentRuntime(state: OSState, agent: Agent, goal: string, context: Record<string, string> = {}): RuntimeResult {
  const runId = uid("run");
  const def = getDefinitionByAgentName(agent.name);
  const logs: ExecutionLog[] = [];
  const memoryWrites: MemoryEntry[] = [];

  if (!def) {
    const blockedRun: AgentRun = {
      id: runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      agentName: agent.name,
      status: "failed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      steps: [{ id: `${runId}-missing-def`, name: "Load definition", sub: "Agent definition missing", state: "failed", blockedReason: "Missing agent definition" }],
      triggeredBy: "manual",
    };
    logs.push(logFor(agent, runId, "agent.runtime_failed", `Missing agent definition for ${agent.name}`, "error"));
    return { run: blockedRun, logs, memoryWrites };
  }

  const plan = createInboundRevenuePlan(runId);
  const run: AgentRun = {
    id: runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    agentName: agent.name,
    status: "running",
    startedAt: new Date().toISOString(),
    steps: plan,
    triggeredBy: "manual",
  };

  const connectorMissing = ["gmail", "hubspot", "slack"].find((id) => !state.connectors.some((c) => c.id === id && c.isConnected));
  if (connectorMissing) {
    run.status = "failed";
    run.completedAt = new Date().toISOString();
    run.steps[0].state = "failed";
    run.steps[0].blockedReason = `Missing connector: ${connectorMissing}`;
    logs.push(logFor(agent, runId, "agent.blocked", `Run blocked: missing connector ${connectorMissing}`, "error"));
    return { run, logs, memoryWrites };
  }

  // Steps 1-4 execute before approval.
  const leadEmail = context.email ?? "lead@company.com";
  const leadCompany = context.company ?? "Inbound lead";
  const phaseActions = [
    { idx: 0, tool: "memory.search", connectorId: "notion", action: "read_memory", payload: { goal } },
    { idx: 1, tool: "logs.write", connectorId: "slack", action: "post_internal_slack_summary", payload: { score: "8.4/10" } },
    { idx: 2, tool: "hubspot.updateLead", connectorId: "hubspot", action: "write_crm", writeScopes: ["deals.write"], payload: { stage: "qualified" } },
    { idx: 3, tool: "gmail.createDraft", connectorId: "gmail", action: "send_external_email", writeScopes: ["drafts.write"], payload: { company: leadCompany, email: leadEmail } },
  ] as const;

  for (const act of phaseActions) {
    const step = run.steps[act.idx];
    step.state = "active";
    const policy = policyForAction(act.action);
    const result = executeMockTool({ connectors: state.connectors }, {
      tool: act.tool,
      connectorId: act.connectorId,
      writeScopes: "writeScopes" in act ? [...act.writeScopes] : [],
      payload: act.payload,
    }, policy);
    if (!result.ok) {
      step.state = "failed";
      step.blockedReason = result.blockedReason;
      run.status = "failed";
      run.completedAt = new Date().toISOString();
      logs.push(logFor(agent, runId, "agent.step_failed", `${step.name} failed: ${result.blockedReason ?? "unknown"}`, "error"));
      return { run, logs, memoryWrites };
    }
    step.state = "done";
    step.output = result.output;
    logs.push(logFor(agent, runId, "agent.step_completed", `${step.name}: ${result.output}`, "ok"));
  }

  const policyEffect = policyForAction("send_external_email");
  run.steps[4].state = "done";
  run.steps[4].output = `Policy result: ${policyEffect}`;
  logs.push(logFor(agent, runId, "policy.checked", `Outbound email policy: ${policyEffect}`, policyEffect === "allow" ? "ok" : "waiting"));

  if (policyEffect === "require_approval") {
    run.status = "awaiting_approval";
    run.steps[5].state = "active";
    const approvalId = uid("appr");
    run.approvalId = approvalId;
    const approval: Approval = {
      id: approvalId,
      type: "follow-up",
      title: `Follow-up approval - ${leadCompany}`,
      body: "Personalized draft is ready. Approve to send, update CRM, post Slack summary and write memory.",
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      runId,
      status: "pending",
      createdAt: new Date().toISOString(),
      proposedAction: "send_external_email",
      draftOutput: `Draft ready for ${leadEmail}`,
      policyChecks: ["external email send requires approval", "crm write allowed for stage updates", "slack internal summary allowed"],
      continuationType: "inbound_revenue_follow_up",
      continuationPayload: { leadEmail, leadCompany },
    };
    logs.push(logFor(agent, runId, "approval.requested", `Approval requested for outbound email to ${leadEmail}`, "waiting"));
    return { run, logs, approval, memoryWrites };
  }

  return finalizeAfterApproval(state, agent, run, logs, memoryWrites, { leadEmail, leadCompany }, true);
}

function finalizeAfterApproval(
  state: OSState,
  agent: Agent,
  run: AgentRun,
  logs: ExecutionLog[],
  memoryWrites: MemoryEntry[],
  payload: { leadEmail: string; leadCompany: string },
  approved: boolean
): RuntimeResult {
  if (!approved) {
    run.steps[6].state = "skipped";
    run.steps[7].state = "skipped";
    run.steps[8].state = "skipped";
    run.steps[9].state = "skipped";
    run.status = "skipped";
    run.completedAt = new Date().toISOString();
    logs.push(logFor(agent, run.id, "approval.skipped", "Approval skipped, outbound action canceled", "warn"));
    return { run, logs, memoryWrites };
  }

  const execute = (idx: number, tool: string, connectorId: string, action: string, payloadIn: Record<string, string>) => {
    const step = run.steps[idx];
    step.state = "active";
    const res = executeMockTool({ connectors: state.connectors }, { tool, connectorId, payload: payloadIn }, policyForAction(action));
    if (!res.ok) {
      step.state = "failed";
      step.blockedReason = res.blockedReason;
      run.status = "failed";
      run.completedAt = new Date().toISOString();
      logs.push(logFor(agent, run.id, "agent.step_failed", `${step.name} failed: ${res.blockedReason ?? "unknown"}`, "error"));
      return false;
    }
    step.state = "done";
    step.output = res.output;
    logs.push(logFor(agent, run.id, "agent.step_completed", `${step.name}: ${res.output}`, "ok"));
    return true;
  };

  run.steps[5].state = "done";
  run.steps[5].output = "Approval granted";
  if (!execute(6, "gmail.sendApprovedEmailMock", "gmail", "send_external_email", { email: payload.leadEmail })) return { run, logs, memoryWrites };
  if (!execute(7, "hubspot.updateLead", "hubspot", "write_crm", { stage: "follow_up_sent" })) return { run, logs, memoryWrites };
  if (!execute(8, "slack.postSummary", "slack", "post_internal_slack_summary", { channel: "#revops" })) return { run, logs, memoryWrites };
  if (!execute(9, "memory.write", "notion", "write_memory", { label: payload.leadCompany })) return { run, logs, memoryWrites };

  const memoryEntry: MemoryEntry = {
    id: uid("mem"),
    type: "client",
    label: payload.leadCompany,
    summary: "Revenue follow-up sent",
    content: `Follow-up sent to ${payload.leadEmail}. Lead qualified and CRM updated.`,
    tags: ["revenue", "follow-up"],
    agentScope: [agent.id],
    fieldCount: 4,
    updatedAt: new Date().toISOString(),
  };
  memoryWrites.push(memoryEntry);

  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.output = {
    type: "follow_up_execution",
    title: `Follow-up sent - ${payload.leadCompany}`,
    summary: `Email sent to ${payload.leadEmail}, CRM updated, Slack summary posted, memory written.`,
  };
  logs.push(logFor(agent, run.id, "agent.completed", `Run completed for ${payload.leadCompany}`, "ok"));
  return { run, logs, memoryWrites };
}

export function continueRunAfterApproval(state: OSState, approval: Approval, approved: boolean): RuntimeResult | null {
  if (approval.continuationType !== "inbound_revenue_follow_up" || !approval.runId) return null;
  const run = state.agentRuns.find((r) => r.id === approval.runId);
  if (!run) return null;
  const agent = state.agents.find((a) => a.id === run.agentId);
  if (!agent) return null;

  const runCopy: AgentRun = { ...run, steps: run.steps.map((s) => ({ ...s })) };
  return finalizeAfterApproval(
    state,
    agent,
    runCopy,
    [],
    [],
    {
      leadEmail: String(approval.continuationPayload?.leadEmail ?? "lead@company.com"),
      leadCompany: String(approval.continuationPayload?.leadCompany ?? "Inbound lead"),
    },
    approved
  );
}
