import type { AgentRun, Approval, ExecutionLog, MemoryEntry, OSState, RunStep } from "@/lib/os/types";
import { getAgentDefinitionByName } from "@/lib/os/agents/agent-definitions";
import { executeToolAction } from "@/lib/os/connectors/connector-executor";

let seq = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++seq}`;
}

interface RuntimeContext {
  leadEmail: string;
  leadCompany: string;
}

export interface AgentRuntimeResult {
  run: AgentRun;
  logs: ExecutionLog[];
  approvals: Approval[];
  memoryWrites: MemoryEntry[];
}

export interface RunAgentInput {
  state: OSState;
  agentId: string;
  goal: string;
  context?: Record<string, unknown>;
  workflowId?: string;
}

function inboundPlan(runId: string): RunStep[] {
  return [
    { id: `${runId}-1`, name: "Read inbound lead", sub: "Read inbound lead from local state", tool: "logs.write", riskLevel: "low", state: "pending" },
    { id: `${runId}-2`, name: "Score lead fit", sub: "Score lead fit using deterministic criteria", tool: "logs.write", riskLevel: "low", state: "pending" },
    { id: `${runId}-3`, name: "Search memory context", sub: "Load tone and service memory context", tool: "memory.search", riskLevel: "low", state: "pending" },
    { id: `${runId}-4`, name: "Upsert CRM lead", sub: "Create or update HubSpot lead", tool: "hubspot.updateLead", riskLevel: "medium", state: "pending" },
    { id: `${runId}-5`, name: "Create follow-up draft", sub: "Create Gmail draft follow-up", tool: "gmail.createDraft", riskLevel: "medium", state: "pending" },
    { id: `${runId}-6`, name: "Send external follow-up", sub: "Request approval before external send", tool: "gmail.sendEmailMock", riskLevel: "high", state: "pending" },
    { id: `${runId}-7`, name: "Post Slack summary", sub: "Post execution summary to internal channel", tool: "slack.postMessage", riskLevel: "low", state: "pending" },
    { id: `${runId}-8`, name: "Write memory entry", sub: "Persist follow-up result in memory", tool: "memory.write", riskLevel: "low", state: "pending" },
    { id: `${runId}-9`, name: "Finalize run", sub: "Write final execution log and output", tool: "logs.write", riskLevel: "low", state: "pending" },
  ];
}

function parseContinuationPayload(approval: Approval): { stepIdx: number; toolId: string; input: Record<string, unknown>; runtime: RuntimeContext } | null {
  const payload = approval.continuationPayload;
  if (!payload) return null;
  const stepIdx = Number(payload.stepIdx ?? -1);
  const toolId = String(payload.toolId ?? "");
  const inputRaw = payload.inputJson;
  const runtimeRaw = payload.runtimeJson;
  if (Number.isNaN(stepIdx) || !toolId || typeof inputRaw !== "string" || typeof runtimeRaw !== "string") return null;
  try {
    const input = JSON.parse(inputRaw) as Record<string, unknown>;
    const runtime = JSON.parse(runtimeRaw) as RuntimeContext;
    return { stepIdx, toolId, input, runtime };
  } catch {
    return null;
  }
}

export function runAgent(input: RunAgentInput): AgentRuntimeResult {
  const { state, agentId, goal, context = {}, workflowId } = input;
  const agent = state.agents.find((item) => item.id === agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const definition = getAgentDefinitionByName(agent.name);
  const runId = uid("run");
  const run: AgentRun = {
    id: runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    agentName: agent.name,
    workflowId,
    status: "running",
    startedAt: new Date().toISOString(),
    steps: inboundPlan(runId),
    triggeredBy: "manual",
  };
  const logs: ExecutionLog[] = [];
  const approvals: Approval[] = [];
  const memoryWrites: MemoryEntry[] = [];

  if (!definition) {
    run.status = "failed";
    run.completedAt = new Date().toISOString();
    run.steps[0].state = "failed";
    run.steps[0].blockedReason = "Missing agent definition";
    logs.push({
      id: uid("log"),
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: "agent.runtime_failed",
      message: `Agent definition missing for ${agent.name}`,
      duration: "-",
      status: "error",
    });
    return { run, logs, approvals, memoryWrites };
  }

  const missingConnector = definition.requiredConnectors.find((connectorId) => !state.connectors.some((c) => c.id === connectorId && c.isConnected));
  if (missingConnector) {
    run.status = "failed";
    run.completedAt = new Date().toISOString();
    run.steps[0].state = "failed";
    run.steps[0].blockedReason = `Missing connector: ${missingConnector}`;
    logs.push({
      id: uid("log"),
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: "connector.missing",
      message: `Run blocked. Connect ${missingConnector} to continue.`,
      duration: "-",
      status: "error",
    });
    return { run, logs, approvals, memoryWrites };
  }

  const runtime: RuntimeContext = {
    leadEmail: String(context.email ?? "lead@company.com"),
    leadCompany: String(context.company ?? "Inbound lead"),
  };
  const leadScore = `${Math.min(97, Math.max(60, runtime.leadCompany.length * 5))}/100`;
  const plannedActions: Array<{ stepIdx: number; toolId: string; input: Record<string, unknown> }> = [
    { stepIdx: 0, toolId: "logs.write", input: { event: "lead.received", message: `Goal: ${goal}. Lead received for ${runtime.leadCompany}` } },
    { stepIdx: 1, toolId: "logs.write", input: { event: "lead.scored", message: `Lead fit score ${leadScore}` } },
    { stepIdx: 2, toolId: "memory.search", input: { query: runtime.leadCompany } },
    { stepIdx: 3, toolId: "hubspot.updateLead", input: { leadId: `lead-${runtime.leadCompany.toLowerCase().replace(/[^a-z0-9]/g, "-")}`, stage: "qualified" } },
    { stepIdx: 4, toolId: "gmail.createDraft", input: { email: runtime.leadEmail, company: runtime.leadCompany, summary: `Fit score ${leadScore}` } },
    { stepIdx: 5, toolId: "gmail.sendEmailMock", input: { email: runtime.leadEmail, draftId: `draft-${runId}` } },
    { stepIdx: 6, toolId: "slack.postMessage", input: { channel: "#revops", summary: `Follow-up prepared for ${runtime.leadCompany}` } },
    { stepIdx: 7, toolId: "memory.write", input: { label: runtime.leadCompany, summary: "Lead follow-up executed", content: `Lead score ${leadScore}, draft prepared.` } },
    { stepIdx: 8, toolId: "logs.write", input: { event: "run.finalized", message: `Inbound revenue execution staged for ${runtime.leadCompany}` } },
  ];

  for (const action of plannedActions) {
    const step = run.steps[action.stepIdx];
    step.state = "active";
    const executed = executeToolAction({ state, toolId: action.toolId, input: action.input, agent, runId });
    logs.push(...executed.logs);

    if (executed.status === "blocked") {
      step.state = "failed";
      step.blockedReason = executed.reason ?? "Blocked";
      run.status = "failed";
      run.completedAt = new Date().toISOString();
      return { run, logs, approvals, memoryWrites };
    }

    if (executed.status === "require_approval") {
      const approval = executed.approval;
      if (!approval) {
        step.state = "failed";
        step.blockedReason = "Approval payload missing";
        run.status = "failed";
        run.completedAt = new Date().toISOString();
        return { run, logs, approvals, memoryWrites };
      }
      approval.type = "follow-up";
      approval.title = `Follow-up approval - ${runtime.leadCompany}`;
      approval.body = "Approve to mock-send external follow-up and continue workflow execution.";
      approval.continuationType = "inbound_revenue_follow_up";
      approval.continuationPayload = {
        stepIdx: String(action.stepIdx),
        toolId: action.toolId,
        inputJson: JSON.stringify(action.input),
        runtimeJson: JSON.stringify(runtime),
      };
      run.approvalId = approval.id;
      run.status = "awaiting_approval";
      step.state = "approval_required";
      step.output = "Awaiting approval";
      approvals.push(approval);
      return { run, logs, approvals, memoryWrites };
    }

    step.state = "done";
    step.output = executed.output;
  }

  memoryWrites.push({
    id: uid("mem"),
    type: "client",
    label: runtime.leadCompany,
    summary: "Revenue operator follow-up completed",
    content: `Lead qualified and processed for ${runtime.leadEmail}.`,
    tags: ["revenue", "inbound-lead"],
    agentScope: [agent.id],
    fieldCount: 4,
    updatedAt: new Date().toISOString(),
  });
  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.output = {
    type: "inbound_revenue_result",
    title: `Inbound lead handled - ${runtime.leadCompany}`,
    summary: `Lead was qualified, CRM updated, draft created, summary posted and memory written.`,
  };
  return { run, logs, approvals, memoryWrites };
}

export function continueRunAfterApproval(state: OSState, approval: Approval, approved: boolean): AgentRuntimeResult | null {
  if (approval.continuationType !== "inbound_revenue_follow_up" || !approval.runId) return null;
  const run = state.agentRuns.find((item) => item.id === approval.runId);
  if (!run) return null;
  const agent = state.agents.find((item) => item.id === run.agentId);
  if (!agent) return null;
  const parsed = parseContinuationPayload(approval);
  if (!parsed) return null;

  const nextRun: AgentRun = { ...run, steps: run.steps.map((step) => ({ ...step })) };
  const logs: ExecutionLog[] = [];
  const approvals: Approval[] = [];
  const memoryWrites: MemoryEntry[] = [];
  const approvalStep = nextRun.steps[parsed.stepIdx];
  if (!approvalStep) return null;

  if (!approved) {
    approvalStep.state = "skipped";
    approvalStep.output = "Approval skipped";
    for (let idx = parsed.stepIdx + 1; idx < nextRun.steps.length; idx++) {
      nextRun.steps[idx].state = "skipped";
    }
    nextRun.status = "skipped";
    nextRun.completedAt = new Date().toISOString();
    logs.push({
      id: uid("log"),
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      runId: nextRun.id,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: "approval.skipped",
      message: "Approval skipped. Pending tool action was not executed.",
      duration: "-",
      status: "warn",
    });
    return { run: nextRun, logs, approvals, memoryWrites };
  }

  const executed = executeToolAction({ state, toolId: parsed.toolId, input: parsed.input, agent, runId: nextRun.id, approvalGranted: true });
  logs.push({
    id: uid("log"),
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    runId: nextRun.id,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    event: "approval.approved",
    message: `Approval approved for ${parsed.toolId}`,
    duration: "-",
    status: "ok",
  });
  logs.push(...executed.logs);
  if (executed.status !== "completed") {
    approvalStep.state = "failed";
    approvalStep.blockedReason = executed.reason ?? "Post-approval execution failed";
    nextRun.status = "failed";
    nextRun.completedAt = new Date().toISOString();
    return { run: nextRun, logs, approvals, memoryWrites };
  }
  approvalStep.state = "done";
  approvalStep.output = executed.output;

  const followUpActions: Array<{ stepIdx: number; toolId: string; input: Record<string, unknown> }> = [
    { stepIdx: 6, toolId: "slack.postMessage", input: { channel: "#revops", summary: `Email sent for ${parsed.runtime.leadCompany}` } },
    { stepIdx: 7, toolId: "memory.write", input: { label: parsed.runtime.leadCompany, summary: "Follow-up sent", content: `Approved send executed for ${parsed.runtime.leadEmail}.` } },
    { stepIdx: 8, toolId: "logs.write", input: { event: "run.finalized", message: `Run complete for ${parsed.runtime.leadCompany}` } },
  ];

  for (const action of followUpActions) {
    const step = nextRun.steps[action.stepIdx];
    if (!step) continue;
    step.state = "active";
    const res = executeToolAction({ state, toolId: action.toolId, input: action.input, agent, runId: nextRun.id });
    logs.push(...res.logs);
    if (res.status !== "completed") {
      step.state = "failed";
      step.blockedReason = res.reason ?? "Step failed";
      nextRun.status = "failed";
      nextRun.completedAt = new Date().toISOString();
      return { run: nextRun, logs, approvals, memoryWrites };
    }
    step.state = "done";
    step.output = res.output;
  }

  memoryWrites.push({
    id: uid("mem"),
    type: "client",
    label: parsed.runtime.leadCompany,
    summary: "External follow-up sent",
    content: `Approved outbound email sent to ${parsed.runtime.leadEmail} and internal summary posted.`,
    tags: ["revenue", "approved-send"],
    agentScope: [agent.id],
    fieldCount: 4,
    updatedAt: new Date().toISOString(),
  });

  nextRun.status = "completed";
  nextRun.completedAt = new Date().toISOString();
  nextRun.output = {
    type: "inbound_revenue_result",
    title: `Inbound lead handled - ${parsed.runtime.leadCompany}`,
    summary: `Approved external send completed. CRM and memory were updated.`,
  };
  return { run: nextRun, logs, approvals, memoryWrites };
}
