import "server-only";

import { getConnectorTruth } from "@/lib/connectors/truth";
import { getStoredJiraCredential } from "@/lib/connectors/jira";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { planCandidateWorkflow, validateWorkflowPlan } from "@/lib/workflows/engine";
import type { SignalCandidate } from "@/lib/signals/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { materializeWorkflowStep } from "@/lib/workflows/materialize";
import { explicitBusinessProblemKey } from "@/lib/workflows/identity";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export async function createWorkflowFromSignalCandidate(input: { workspaceId: string; signalId: string; candidate: SignalCandidate; supabase?: SupabaseAdmin }): Promise<{ created: boolean; workflowId?: string; blockedReasons?: string[] }> {
  if (input.workspaceId !== input.candidate.workspaceId) throw new Error("Rejected cross-workspace workflow candidate.");
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [connectors, eligibility, activation, jiraCredential] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    getWorkspaceExecutionEligibility(input.workspaceId, supabase),
    getOperatorActivationState({ workspaceId: input.workspaceId, operatorKey: input.candidate.operatorKey as "revenue" | "client_flow" | "operations" | "support", supabase }),
    getStoredJiraCredential(input.workspaceId, supabase),
  ]);
  const connected = connectors.filter((row) => ["connected", "healthy"].includes(row.status)).map((row) => row.connectorKey);
  const executable = connectors.filter((row) => ["connected", "healthy"].includes(row.status) && row.executable !== false && !row.reconnectRequired).map((row) => row.connectorKey);
  // Jira is executable for workflows only after an owner selected both a
  // project and a provider-valid default issue type. Otherwise the preference
  // safely falls through to Asana, then Trello.
  const jiraMetadata = jiraCredential?.metadata ?? {};
  const jiraReadyForWrites = typeof jiraMetadata.selectedProjectId === "string" && typeof jiraMetadata.selectedIssueTypeId === "string";
  const materializable = executable.filter((connector) => connector !== "jira" || jiraReadyForWrites);
  const plan = planCandidateWorkflow({ candidate: input.candidate, signalId: input.signalId, context: { activeOperatorKeys: activation?.activated ? [input.candidate.operatorKey] : [], connectedConnectorKeys: connected, executableConnectorKeys: materializable, executionEligible: eligibility.eligible } });
  if (!plan) return { created: false, blockedReasons: ["not_eligible_for_automatic_workflow"] };
  const validation = validateWorkflowPlan(plan, { activeOperatorKeys: [plan.operatorKey], connectedConnectorKeys: connected, executableConnectorKeys: materializable, executionEligible: eligibility.eligible });
  const status = validation.validSteps.length ? "planned" : "blocked";
  const workflow = { ...plan, status, steps: validation.validSteps };
  const saved = await supabase.from("os_workflow_runs").upsert({
    id: workflow.id, workspace_id: workflow.workspaceId, operator_key: workflow.operatorKey, originating_signal_id: workflow.originatingSignalId,
    objective: workflow.objective, entity_refs: workflow.entityRefs, context_refs: workflow.contextRefs, priority: workflow.priority,
    confidence: workflow.confidence, status: workflow.status, dedupe_key: workflow.dedupeKey,
    primary_owner: workflow.operatorKey,
    parent_primary_owner: null,
    supporting_operator: null,
    supporting_operators: input.candidate.supportingOperators ?? [],
    requested_outcome: workflow.objective,
    relevant_context: { source: input.candidate.source, signalType: input.candidate.signalType },
    external_communication_allowed: ["revenue", "client_flow", "support"].includes(workflow.operatorKey),
    external_communication_owner: ["revenue", "client_flow", "support"].includes(workflow.operatorKey) ? workflow.operatorKey : null,
    return_condition: "provider_outcome_observed",
    dependency_state: "none",
    handoff_status: "none",
    source_problem_key: explicitBusinessProblemKey(input.candidate.metadata),
  }, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
  if (saved.error) throw new Error(`Workflow persistence failed: ${saved.error.message}`);
  if (workflow.steps.length) {
    const stepResult = await supabase.from("os_workflow_steps").upsert(workflow.steps.map((step) => ({
      id: `${workflow.id}:${step.id}`.slice(0, 220), workflow_id: workflow.id, workspace_id: workflow.workspaceId, step_order: step.order,
      action_type: step.actionType, connector_key: step.connectorKey, target_ref: step.targetRef, payload_ref: step.payloadRef,
      dependency_step_ids: step.dependencyStepIds, risk_level: step.risk, approval_required: step.approvalRequired, status: step.status,
    })), { onConflict: "workflow_id,step_order" });
    if (stepResult.error) throw new Error(`Workflow step persistence failed: ${stepResult.error.message}`);
    // Only complete, provider-configured PM steps become canonical approvals.
    // Communication and draft-dependent steps stay blocked until their current
    // operator flow supplies an exact target and a reviewed bounded payload.
    await Promise.all(workflow.steps.filter((step) => step.dependencyStepIds.length === 0).map(async (step) => {
      try { await materializeWorkflowStep({ workflowId: workflow.id, stepId: `${workflow.id}:${step.id}`.slice(0, 220), workspaceId: workflow.workspaceId, supabase }); }
      catch (error) { console.warn("[workflow] materialization skipped", { workflowId: workflow.id, stepId: step.id, error: error instanceof Error ? error.message : "Unknown materialization error" }); }
    }));
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
  const evidenceKey = input.evidenceRefs.slice(0, 3).join("|");
  const id = `outcome-${input.workspaceId}-${input.workflowId || input.signalId || input.outcomeType}-${input.outcomeType}-${evidenceKey}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 180);
  const result = await supabase.from("os_workflow_outcomes").upsert({ id, workspace_id: input.workspaceId, operator_key: input.operatorKey, workflow_id: input.workflowId ?? null, signal_id: input.signalId ?? null, execution_intent_id: input.executionIntentId ?? null, outcome_type: input.outcomeType, attribution_level: input.attributionLevel, confidence: input.confidence, evidence_refs: input.evidenceRefs.slice(0, 20).map((ref) => ref.slice(0, 240)), observed_at: input.observedAt }, { onConflict: "id", ignoreDuplicates: true });
  if (result.error) throw new Error(`Outcome persistence failed: ${result.error.message}`);
}
