import "server-only";

import { getConnectorTruth } from "@/lib/connectors/truth";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { planCandidateWorkflow, validateWorkflowPlan } from "@/lib/workflows/engine";
import type { SignalCandidate } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export async function createWorkflowFromSignalCandidate(input: { workspaceId: string; signalId: string; candidate: SignalCandidate; supabase?: SupabaseAdmin }): Promise<{ created: boolean; workflowId?: string; blockedReasons?: string[] }> {
  if (input.workspaceId !== input.candidate.workspaceId) throw new Error("Rejected cross-workspace workflow candidate.");
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [connectors, eligibility, activation] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    getWorkspaceExecutionEligibility(input.workspaceId, supabase),
    getOperatorActivationState({ workspaceId: input.workspaceId, operatorKey: input.candidate.operatorKey as "revenue" | "client_flow" | "operations", supabase }),
  ]);
  const connected = connectors.filter((row) => ["connected", "healthy"].includes(row.status)).map((row) => row.connectorKey);
  const executable = connectors.filter((row) => ["connected", "healthy"].includes(row.status) && row.executable !== false && !row.reconnectRequired).map((row) => row.connectorKey);
  const plan = planCandidateWorkflow({ candidate: input.candidate, signalId: input.signalId, context: { activeOperatorKeys: activation?.activated ? [input.candidate.operatorKey] : [], connectedConnectorKeys: connected, executableConnectorKeys: executable, executionEligible: eligibility.eligible } });
  if (!plan) return { created: false, blockedReasons: ["not_eligible_for_automatic_workflow"] };
  const validation = validateWorkflowPlan(plan, { activeOperatorKeys: [plan.operatorKey], connectedConnectorKeys: connected, executableConnectorKeys: executable, executionEligible: eligibility.eligible });
  const status = validation.validSteps.length ? "planned" : "blocked";
  const workflow = { ...plan, status, steps: validation.validSteps };
  const saved = await supabase.from("os_workflow_runs").upsert({
    id: workflow.id, workspace_id: workflow.workspaceId, operator_key: workflow.operatorKey, originating_signal_id: workflow.originatingSignalId,
    objective: workflow.objective, entity_refs: workflow.entityRefs, context_refs: workflow.contextRefs, priority: workflow.priority,
    confidence: workflow.confidence, status: workflow.status, dedupe_key: workflow.dedupeKey,
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (saved.error) throw new Error(`Workflow persistence failed: ${saved.error.message}`);
  if (workflow.steps.length) {
    const stepResult = await supabase.from("os_workflow_steps").upsert(workflow.steps.map((step) => ({
      id: `${workflow.id}:${step.id}`.slice(0, 220), workflow_id: workflow.id, workspace_id: workflow.workspaceId, step_order: step.order,
      action_type: step.actionType, connector_key: step.connectorKey, target_ref: step.targetRef, payload_ref: step.payloadRef,
      dependency_step_ids: step.dependencyStepIds, risk_level: step.risk, approval_required: step.approvalRequired, status: step.status,
    })), { onConflict: "workflow_id,step_order" });
    if (stepResult.error) throw new Error(`Workflow step persistence failed: ${stepResult.error.message}`);
  }
  return { created: true, workflowId: workflow.id, blockedReasons: validation.blockedReasons };
}

/** Outcome persistence requires later provider-state evidence; executing a step is not an outcome. */
export async function recordObservedWorkflowOutcome(input: {
  workspaceId: string; operatorKey: string; workflowId?: string | null; signalId?: string | null; executionIntentId?: string | null;
  outcomeType: string; attributionLevel: "observed" | "influenced" | "direct"; confidence: "low" | "medium" | "high"; evidenceRefs: string[]; observedAt: string; supabase?: SupabaseAdmin;
}): Promise<void> {
  if (!input.evidenceRefs.length) throw new Error("Outcome evidence is required.");
  const supabase = input.supabase ?? createSupabaseAdmin();
  const id = `outcome-${input.workspaceId}-${input.workflowId || input.signalId || input.outcomeType}-${input.observedAt}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const result = await supabase.from("os_workflow_outcomes").insert({ id, workspace_id: input.workspaceId, operator_key: input.operatorKey, workflow_id: input.workflowId ?? null, signal_id: input.signalId ?? null, execution_intent_id: input.executionIntentId ?? null, outcome_type: input.outcomeType, attribution_level: input.attributionLevel, confidence: input.confidence, evidence_refs: input.evidenceRefs.slice(0, 20).map((ref) => ref.slice(0, 240)), observed_at: input.observedAt });
  if (result.error) throw new Error(`Outcome persistence failed: ${result.error.message}`);
}
