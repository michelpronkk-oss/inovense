import crypto from "crypto";
import { getActionDefinition } from "@/lib/actions/registry";
import type { ActionType } from "@/lib/actions/types";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyDecision, PolicyInput } from "@/lib/policies/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ExecutionDecision = "allow_auto" | "require_approval" | "deny" | "pause_operator";

export type RuntimePolicyDecision = PolicyDecision & {
  executionDecision: ExecutionDecision;
  reasonCode: string;
  matchedPolicyIds: string[];
  evaluatedAt: string;
  actionHash: string;
  intentId?: string;
  duplicateExecution?: boolean;
};

function hashAction(input: PolicyInput): string {
  const canonical = JSON.stringify({
    workspaceId: input.workspaceId, operatorKey: input.operatorKey, actionType: input.actionType,
    connectorKey: input.connectorKey, capability: input.capability ?? null, destinationType: input.destinationType,
    recipient: input.recipient ?? null, channelId: input.channelId ?? null, teamId: input.teamId ?? null,
    cardId: input.cardId ?? null,
    listId: input.listId ?? null, metadata: input.metadata?.dedupeKey ?? null,
    asanaProjectId: input.metadata?.asanaProjectId ?? null,
    asanaTaskId: input.metadata?.asanaTaskId ?? null,
    jiraCloudId: input.metadata?.jiraCloudId ?? null,
    jiraProjectId: input.metadata?.jiraProjectId ?? null,
    jiraIssueKey: input.metadata?.jiraIssueKey ?? null,
    zendeskSubdomain: input.metadata?.zendeskSubdomain ?? null,
    zendeskTicketId: input.metadata?.zendeskTicketId ?? null,
    intercomRegion: input.metadata?.intercomRegion ?? null,
    intercomConversationId: input.metadata?.intercomConversationId ?? null,
    payloadIdentity: input.metadata?.payloadIdentity ?? null,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function deny(input: PolicyInput, reasonCode: string, reason: string, actionHash: string, pause = false): RuntimePolicyDecision {
  return {
    decision: "blocked", executionDecision: pause ? "pause_operator" : "deny", reasonCode, reason,
    riskLevel: input.riskLevel, matchedRuleId: reasonCode, matchedPolicyIds: [reasonCode],
    requiresHumanReview: false, canExecuteNow: false, auditLabel: `policy.${pause ? "pause_operator" : "deny"}.${reasonCode}`,
    userFacingLabel: pause ? "Operator paused" : "Blocked", evaluatedAt: new Date().toISOString(), actionHash,
  };
}

function operatorSupportsAction(operatorKey: string, actionType: string): boolean {
  const operator = getOperatorDefinition(operatorKey);
  if (!operator) return false;
  const support: Record<string, string[]> = {
    revenue: ["send_email", "create_crm_contact", "create_crm_deal", "create_crm_note", "create_crm_task", "update_crm_record"],
    client_flow: ["send_email", "create_task", "send_teams_message", "reply_zendesk_ticket", "add_zendesk_internal_note", "update_zendesk_ticket", "reply_intercom_conversation", "update_intercom_conversation"],
    operations: ["send_slack_message", "send_teams_message", "create_task", "move_task", "add_task_comment", "create_asana_task", "update_asana_task", "add_asana_comment", "create_jira_issue", "update_jira_issue", "add_jira_comment", "add_zendesk_internal_note", "update_zendesk_ticket"],
  };
  return support[operator.key]?.includes(actionType) ?? false;
}

async function operatorIsExplicitlyPaused(supabase: SupabaseAdmin, workspaceId: string, operatorKey: string): Promise<boolean> {
  const row = await supabase.from("os_operator_triggers")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("operator_key", operatorKey)
    .eq("trigger_type", "operator_execution_pause")
    .maybeSingle();
  // A missing pause record is normal. A failed lookup does not manufacture a
  // pause, but all other gates still fail closed before auto execution.
  return !row.error && Boolean(row.data) && row.data?.enabled === true;
}

async function withinAutonomyLimits(input: { supabase: SupabaseAdmin; policy: Awaited<ReturnType<typeof loadPolicyWorkspaceSettings>>; action: PolicyInput; actionHash: string }): Promise<{ ok: boolean; reason?: string }> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [hour, day] = await Promise.all([
    input.supabase.from("os_execution_intents").select("id", { count: "exact", head: true }).eq("workspace_id", input.action.workspaceId).eq("operator_key", input.action.operatorKey).eq("action_type", input.action.actionType).eq("status", "succeeded").gte("created_at", hourAgo),
    input.supabase.from("os_execution_intents").select("id", { count: "exact", head: true }).eq("workspace_id", input.action.workspaceId).eq("operator_key", input.action.operatorKey).eq("action_type", input.action.actionType).eq("status", "succeeded").gte("created_at", dayAgo),
  ]);
  if (hour.error || day.error || hour.count === null || day.count === null) return { ok: false, reason: "autonomy_limit_unavailable" };
  if (hour.count >= input.policy.maxAutonomousActionsPerHour) return { ok: false, reason: "autonomy_hourly_limit_reached" };
  if (day.count >= input.policy.maxAutonomousActionsPerDay) return { ok: false, reason: "autonomy_daily_limit_reached" };
  return { ok: true };
}

async function persistIntent(input: { supabase: SupabaseAdmin; policyInput: PolicyInput; actionHash: string; decision: RuntimePolicyDecision; approvalId?: string | null }): Promise<{ id: string; duplicate: boolean }> {
  const id = `intent-${input.actionHash.slice(0, 32)}`;
  const saved = await input.supabase.from("os_execution_intents").insert({
    id, workspace_id: input.policyInput.workspaceId, operator_key: input.policyInput.operatorKey,
    action_type: input.policyInput.actionType, connector_key: input.policyInput.connectorKey,
    action_hash: input.actionHash, decision: input.decision.executionDecision,
    reason_code: input.decision.reasonCode, risk_level: input.decision.riskLevel,
    status: input.decision.executionDecision === "deny" || input.decision.executionDecision === "pause_operator" ? "denied" : "policy_evaluated",
    approval_id: input.approvalId ?? null,
    metadata: { destinationType: input.policyInput.destinationType, matchedPolicyIds: input.decision.matchedPolicyIds },
  });
  if (!saved.error) return { id, duplicate: false };
  if (saved.error.code !== "23505") throw new Error(saved.error.message);
  const existing = await input.supabase.from("os_execution_intents")
    .select("id,status")
    .eq("workspace_id", input.policyInput.workspaceId)
    .eq("action_hash", input.actionHash)
    .maybeSingle();
  if (existing.error || !existing.data) throw new Error(existing.error?.message || "Existing execution intent could not be read.");
  return { id: String(existing.data.id), duplicate: ["authorized", "executing", "succeeded"].includes(String(existing.data.status)) };
}

/**
 * The only runtime decision point for a provider mutation. It loads connector
 * truth, billing eligibility and the current policy server-side; nothing from
 * an operator/LLM/client can turn a denied capability into an allowed action.
 */
export async function evaluateExecutionPolicy(input: { supabase?: SupabaseAdmin; policyInput: PolicyInput; approvalId?: string | null; persistIntent?: boolean }): Promise<RuntimePolicyDecision> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const actionHash = hashAction(input.policyInput);
  let result: RuntimePolicyDecision;
  try {
    const action = getActionDefinition(input.policyInput.actionType as ActionType);
    if (!action) return deny(input.policyInput, "unsupported_action", "This action is not implemented by an authorized adapter.", actionHash);
    if (action.permanentlyBlocked || !action.allowedExecutionAdapters.includes(input.policyInput.connectorKey)) {
      return deny(input.policyInput, "unsupported_connector_write", "This connector cannot perform this write action.", actionHash);
    }
    if (!operatorSupportsAction(input.policyInput.operatorKey, input.policyInput.actionType)) {
      return deny(input.policyInput, "operator_action_unsupported", "This operator is not allowed to perform that action.", actionHash);
    }
    if (await operatorIsExplicitlyPaused(supabase, input.policyInput.workspaceId, input.policyInput.operatorKey)) {
      return deny(input.policyInput, "operator_paused", "This operator is paused by workspace policy.", actionHash, true);
    }
    const [eligibility, connectors, policy] = await Promise.all([
      getWorkspaceExecutionEligibility(input.policyInput.workspaceId, supabase),
      getConnectorTruth({ workspaceId: input.policyInput.workspaceId, supabase }),
      loadPolicyWorkspaceSettings({ workspaceId: input.policyInput.workspaceId, supabase }),
    ]);
    if (!eligibility.eligible) return deny(input.policyInput, "workspace_execution_ineligible", eligibility.reason, actionHash);
    const connector = connectors.find((row) => row.connectorKey === input.policyInput.connectorKey);
    if (!connector || !["connected", "healthy"].includes(connector.status) || connector.reconnectRequired || connector.executable === false) {
      return deny(input.policyInput, "connector_not_ready", "The required connector is not healthy and ready for execution.", actionHash);
    }
    const evaluated = evaluatePolicy(input.policyInput, policy, { canRunRealActions: eligibility.canRunRealActions, billingStatus: eligibility.billingStatus });
    result = {
      ...evaluated,
      executionDecision: evaluated.decision === "allow_auto" ? "allow_auto" : evaluated.decision === "approval_required" ? "require_approval" : "deny",
      reasonCode: evaluated.matchedRuleId,
      matchedPolicyIds: [evaluated.matchedRuleId],
      evaluatedAt: new Date().toISOString(), actionHash,
    };
    if (result.executionDecision === "allow_auto") {
      const limits = await withinAutonomyLimits({ supabase, policy, action: input.policyInput, actionHash });
      if (!limits.ok) result = deny(input.policyInput, limits.reason!, "Autonomous execution is unavailable until its safety limit can be verified.", actionHash);
    }
  } catch {
    result = deny(input.policyInput, "policy_evaluation_failed", "Execution was blocked because policy could not be evaluated safely.", actionHash);
  }
  if (input.persistIntent !== false) {
    try {
      const intent = await persistIntent({ supabase, policyInput: input.policyInput, actionHash, decision: result, approvalId: input.approvalId });
      result.intentId = intent.id;
      if (intent.duplicate) {
        result = deny(input.policyInput, "duplicate_execution", "An identical action is already executing or has completed.", actionHash);
        result.intentId = intent.id;
        result.duplicateExecution = true;
      }
    }
    catch { return deny(input.policyInput, "execution_intent_unavailable", "Execution was blocked because its durable audit intent could not be recorded.", actionHash); }
  }
  return result;
}
