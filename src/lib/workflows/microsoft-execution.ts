import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Persists the provider's accepted-but-not-confirmed response as workflow
 * evidence. Graph 202 is not delivery proof, so this deliberately does not
 * record a business outcome or complete the workflow step.
 */
export async function persistAcceptedMicrosoftExecution(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  approvalId: string;
  workflowId?: string | null;
  workflowStepId?: string | null;
  provider: "microsoft" | "microsoft_teams";
  actionType: "email.reply_or_send" | "teams.channel_message";
  endpoint: string;
  providerMessageId?: string | null;
  sourceMessageId?: string | null;
  teamId?: string | null;
  channelId?: string | null;
}): Promise<void> {
  if (!input.workflowId) return;
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workflow = await supabase.from("os_workflow_runs").select("result_evidence").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (workflow.error || !workflow.data) throw new Error("microsoft_workflow_evidence_target_missing");
  const existing = workflow.data.result_evidence && typeof workflow.data.result_evidence === "object" ? workflow.data.result_evidence as Record<string, unknown> : {};
  const key = input.provider === "microsoft" ? "microsoftOutlookExecution" : "microsoftTeamsExecution";
  const current = existing[key] && typeof existing[key] === "object" ? existing[key] as Record<string, unknown> : null;
  const executionId = `${input.provider}:${input.approvalId}`;
  if (!current || current.executionId !== executionId) {
    const evidence = {
      ...existing,
      [key]: {
        provider: input.provider,
        actionType: input.actionType,
        executionId,
        approvalId: input.approvalId,
        endpoint: input.endpoint.slice(0, 180),
        providerMessageId: input.providerMessageId?.slice(0, 180) ?? null,
        sourceMessageId: input.sourceMessageId?.slice(0, 180) ?? null,
        teamId: input.teamId?.slice(0, 120) ?? null,
        channelId: input.channelId?.slice(0, 120) ?? null,
        status: "accepted_pending_delivery",
        acceptedAt: new Date().toISOString(),
        deliveryConfirmed: false,
        outcomePending: true,
      },
    };
    const saved = await supabase.from("os_workflow_runs").update({ result_evidence: evidence }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
    if (saved.error) throw new Error(`microsoft_workflow_evidence_save_failed:${saved.error.message}`);
  }

  if (input.workflowStepId) {
    const step = await supabase.from("os_workflow_steps").update({ result_ref: `workflow:${input.workflowId}:result_evidence:${key}` }).eq("id", input.workflowStepId).eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).in("status", ["approved", "executing", "completed"]);
    if (step.error) throw new Error(`microsoft_workflow_step_evidence_save_failed:${step.error.message}`);
  }
}
