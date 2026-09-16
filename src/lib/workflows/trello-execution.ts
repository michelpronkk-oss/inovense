import "server-only";

import type { PreparedAction } from "@/lib/actions/types";
import { isValidatedTrelloCardUrl } from "@/lib/connectors/trello";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordObservedWorkflowOutcome } from "@/lib/workflows/store";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Persists the local evidence that makes a confirmed Trello write a durable
 * workflow outcome. This runs after the provider has confirmed the card and
 * before lifecycle advancement can complete the workflow.
 */
export async function persistConfirmedTrelloCardExecution(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  approvalId: string;
  action: PreparedAction;
  result: Record<string, unknown>;
}): Promise<void> {
  if (input.action.connectorKey !== "trello" || input.action.actionType !== "create_task") return;
  const workflowId = typeof input.action.metadata.workflowId === "string" ? input.action.metadata.workflowId : "";
  const stepId = typeof input.action.metadata.workflowStepId === "string" ? input.action.metadata.workflowStepId : "";
  const executionId = typeof input.result.executionId === "string" ? input.result.executionId : typeof input.action.metadata.executionId === "string" ? input.action.metadata.executionId : "";
  const cardId = typeof input.result.cardId === "string" ? input.result.cardId : "";
  const cardUrl = input.result.cardUrl;
  // Standalone/manual Trello approvals have no workflow step to complete; the
  // approval continuation remains their durable execution record.
  if (!workflowId || !stepId) return;
  if (!executionId || !cardId || !isValidatedTrelloCardUrl(cardUrl)) throw new Error("Confirmed Trello execution lacked bounded evidence.");

  const supabase = input.supabase ?? createSupabaseAdmin();
  const workflow = await supabase.from("os_workflow_runs").select("id,operator_key,originating_signal_id,result_evidence").eq("id", workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (workflow.error || !workflow.data) throw new Error("Trello workflow evidence target was not found.");
  const existing = workflow.data.result_evidence && typeof workflow.data.result_evidence === "object" ? workflow.data.result_evidence as Record<string, unknown> : {};
  const existingExecution = existing.trelloExecution && typeof existing.trelloExecution === "object" ? existing.trelloExecution as Record<string, unknown> : null;
  const evidence = existingExecution && existingExecution.executionId === executionId
    ? existing
    : {
      ...existing,
      trelloExecution: {
        provider: "trello",
        actionType: "create_task",
        executionId,
        approvalId: input.approvalId,
        cardId: cardId.slice(0, 120),
        cardUrl,
        boardId: typeof input.action.input.boardId === "string" ? input.action.input.boardId.slice(0, 120) : null,
        listId: typeof input.action.input.listId === "string" ? input.action.input.listId.slice(0, 120) : null,
        reconciled: input.result.reconciled === true,
        createdAt: new Date().toISOString(),
        externalActionTaken: true,
      },
    };
  if (!existingExecution || existingExecution.executionId !== executionId) {
    const saved = await supabase.from("os_workflow_runs").update({ result_evidence: evidence }).eq("id", workflowId).eq("workspace_id", input.workspaceId);
    if (saved.error) throw new Error(`Trello workflow evidence could not be persisted: ${saved.error.message}`);
  }

  await recordObservedWorkflowOutcome({
    supabase,
    workspaceId: input.workspaceId,
    operatorKey: String(workflow.data.operator_key),
    workflowId,
    signalId: typeof workflow.data.originating_signal_id === "string" ? workflow.data.originating_signal_id : null,
    outcomeType: "trello_card_created",
    attributionLevel: "direct",
    confidence: "high",
    evidenceRefs: [executionId, cardId, cardUrl],
    observedAt: new Date().toISOString(),
  });

  const step = await supabase.from("os_workflow_steps").update({ status: "completed", block_reason: null, result_ref: `workflow:${workflowId}:result_evidence:trelloExecution` }).eq("id", stepId).eq("workflow_id", workflowId).eq("workspace_id", input.workspaceId).in("status", ["approved", "executing", "completed"]);
  if (step.error) throw new Error(`Trello workflow step could not be completed: ${step.error.message}`);
}
