// Agent run simulation — no external calls, no side effects.
// Returns a complete SimulatedRun that the AppProvider merges into state.

import type { Agent, AgentRun, Approval, ExecutionLog, RunStep } from "@/lib/os/types";
import { AGENT_TEMPLATES } from "@/lib/os/templates";

let counter = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++counter}`;
}

function nowTs(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export interface SimulatedRun {
  run: AgentRun;
  logs: ExecutionLog[];
  approval?: Approval;
}

export function simulateAgentRun(agent: Agent): SimulatedRun {
  const template = AGENT_TEMPLATES[agent.templateId];
  if (!template) throw new Error(`Unknown template: ${agent.templateId}`);

  const runId = uid("run");
  const approvalId = uid("appr");

  // Find the approval gate step (first step with requiresApproval)
  const gateIdx = template.runSimulation.steps.findIndex((s) => s.requiresApproval);
  const hasGate = gateIdx !== -1;

  // Determine run status based on policy check on the gated action
  const gatedAction = hasGate ? "send_external_email" : null;
  const policyEffect = gatedAction ? "require_approval" : "allow";
  const needsApproval = policyEffect === "require_approval";

  // Build run steps
  const runSteps: RunStep[] = template.runSimulation.steps.map((s, i) => {
    let state: RunStep["state"];
    if (!hasGate || i < gateIdx) {
      state = "done";
    } else if (i === gateIdx && needsApproval) {
      state = "active";
    } else {
      state = "pending";
    }
    return { name: s.name, sub: s.sub, state };
  });

  // Build execution logs for completed steps
  const logs: ExecutionLog[] = [];
  const completedSteps = hasGate
    ? template.runSimulation.steps.slice(0, gateIdx + 1)
    : template.runSimulation.steps;

  completedSteps.forEach((step, i) => {
    const offsetMs = (completedSteps.length - i) * 15000;
    const logTime = new Date(Date.now() - offsetMs).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    logs.push({
      id: uid("log"),
      ts: logTime,
      runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: step.logEvent,
      message: step.logMessage,
      duration: step.duration,
      status: step.logStatus,
    });
  });

  // Build approval if needed
  let approval: Approval | undefined;
  if (needsApproval && template.runSimulation.approvalType) {
    approval = {
      id: approvalId,
      type: template.runSimulation.approvalType,
      title: template.runSimulation.approvalTitle ?? `${agent.name} action pending`,
      body: template.runSimulation.approvalBody ?? "Review and approve this operator action.",
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      runId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  const run: AgentRun = {
    id: runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    agentName: agent.name,
    status: needsApproval ? "awaiting_approval" : "completed",
    startedAt: new Date().toISOString(),
    completedAt: needsApproval ? undefined : new Date().toISOString(),
    steps: runSteps,
    approvalId: needsApproval ? approvalId : undefined,
    output: needsApproval ? undefined : template.sampleOutput,
    triggeredBy: "manual",
  };

  return { run, logs, approval };
}

/**
 * Simulate completing a run after its approval is resolved.
 * Returns a log entry for the final action.
 */
export function simulateRunCompletion(
  agent: Agent,
  runId: string,
  approved: boolean
): ExecutionLog {
  const template = AGENT_TEMPLATES[agent.templateId];
  return {
    id: uid("log"),
    ts: nowTs(),
    runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    event: approved ? "action_executed" : "action_skipped",
    message: approved
      ? `Approved and executed: ${template?.runSimulation.approvalTitle ?? "operator action"}`
      : `Skipped: ${template?.runSimulation.approvalTitle ?? "operator action"}`,
    duration: approved ? "0.4s" : "-",
    status: approved ? "ok" : "warn",
  };
}
