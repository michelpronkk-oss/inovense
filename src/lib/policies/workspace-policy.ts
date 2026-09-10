import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { DEFAULT_POLICY_WORKSPACE_SETTINGS, destinationTypeForAction, defaultRiskForAction } from "@/lib/policies/defaults";
import { normalizeBusinessContext } from "@/lib/policies/context";
import { emailPayloadIdentity } from "@/lib/policies/approval-scope";
import type { PolicyConfidence, PolicyInput, PolicyRiskLevel, PolicyWorkspaceSettings, WorkspaceAutonomyMode } from "@/lib/policies/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function autonomyMode(value: unknown): WorkspaceAutonomyMode {
  if (value === "manual" || value === "approval_first" || value === "guarded" || value === "autonomous") return value;
  // Existing rows used these labels. Keep every existing workspace at the
  // equivalent-or-stricter setting until an owner/admin deliberately changes it.
  if (value === "assisted") return "guarded";
  if (value === "managed") return "autonomous";
  return "approval_first";
}

/**
 * Build the policy settings the engine needs from the existing
 * os_workspace_settings row. Autonomy mode + emergency stop live under
 * approval_policy; Slack/customer-email come from existing settings. This reuses
 * the same row as loadWorkspacePolicySettings so nothing else breaks.
 */
export async function loadPolicyWorkspaceSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
}): Promise<PolicyWorkspaceSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const base = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const approvalPolicy = asRecord(base.approvalPolicy);
  const mode = autonomyMode(approvalPolicy.autonomyMode);
  const emergencyStopEnabled = approvalPolicy.emergencyStopEnabled === true;
  const internalSlackNotificationsAllowed = Boolean(base.slack.slackNotificationsEnabled && base.slack.slackApprovalAlertsEnabled);
  const dailyBriefAllowed = approvalPolicy.dailyBriefAllowed === false ? false : DEFAULT_POLICY_WORKSPACE_SETTINGS.dailyBriefAllowed;

  return {
    version: base.version,
    autonomyMode: mode,
    emergencyStopEnabled,
    customerEmailMode: base.customerEmailMode,
    internalSlackNotificationsAllowed,
    dailyBriefAllowed,
    connectorHealthChecksAllowed: DEFAULT_POLICY_WORKSPACE_SETTINGS.connectorHealthChecksAllowed,
  lowRiskProjectToolCommentsAllowed: mode === "guarded" || mode === "autonomous",
    crmWritesRequireApproval: true,
    projectToolWritesRequireApproval: true,
    customerFacingActionsRequireApproval: true,
    maxAutonomousActionsPerHour: DEFAULT_POLICY_WORKSPACE_SETTINGS.maxAutonomousActionsPerHour,
    maxAutonomousActionsPerDay: DEFAULT_POLICY_WORKSPACE_SETTINGS.maxAutonomousActionsPerDay,
    actionRules: base.actionRules,
    connectorPolicies: base.connectorPolicies,
  };
}

export async function savePolicyWorkspaceSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  actor?: string | null;
  patch: Partial<Pick<PolicyWorkspaceSettings, "autonomyMode" | "emergencyStopEnabled" | "customerEmailMode" | "dailyBriefAllowed">> & {
    connectorPolicy?: { connectorKey: string; customerEmailMode: "approval_required" | "draft_only" };
  };
}): Promise<PolicyWorkspaceSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const base = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const approvalPolicy = asRecord(base.approvalPolicy);
  const connectorPolicies = { ...base.connectorPolicies };
  const connectorPolicy = input.patch.connectorPolicy;
  if (connectorPolicy && (connectorPolicy.connectorKey === "gmail" || connectorPolicy.connectorKey === "microsoft")) {
    connectorPolicies[connectorPolicy.connectorKey] = { customerEmailMode: connectorPolicy.customerEmailMode };
  }

  const nextApprovalPolicy = {
    ...approvalPolicy,
    version: 2,
    actionRules: base.actionRules,
    connectorPolicies,
    ...(input.patch.autonomyMode !== undefined ? { autonomyMode: input.patch.autonomyMode } : {}),
    ...(input.patch.emergencyStopEnabled !== undefined ? { emergencyStopEnabled: input.patch.emergencyStopEnabled } : {}),
    ...(input.patch.customerEmailMode !== undefined ? { customerEmailMode: input.patch.customerEmailMode } : {}),
    ...(input.patch.dailyBriefAllowed !== undefined ? { dailyBriefAllowed: input.patch.dailyBriefAllowed } : {}),
  };

  const update = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspaceId,
    approval_policy: nextApprovalPolicy,
    notifications: base.notifications,
  }, { onConflict: "workspace_id" });
  if (update.error) throw new Error(update.error.message);

  // Keep policy changes in the existing immutable operational audit stream.
  // The record contains settings only, never connector credentials or action payloads.
  const audit = await supabase.from("os_execution_logs").insert({
    id: `policy-change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    run_id: "policy",
    agent_id: "policy",
    agent_mark: "PL",
    agent_color: "#4DE8E1",
    event: "execution_policy_changed",
    message: `Workspace execution policy changed by ${input.actor || "an authorized administrator"}.`,
    duration: "-",
    status: "ok",
  });
  if (audit.error) throw new Error(`Policy saved but its audit record could not be written: ${audit.error.message}`);

  return loadPolicyWorkspaceSettings({ supabase, workspaceId: input.workspaceId });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function confidenceValue(value: unknown): PolicyConfidence | undefined {
  return value === "low" || value === "medium" || value === "high" ? value : undefined;
}

function riskValue(value: unknown, fallback: PolicyRiskLevel): PolicyRiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

/**
 * Map an approval continuation payload to a PolicyInput. Used by both the
 * approvals list route (live display) and the approve route (live enforcement),
 * so neither relies on a stored policy snapshot.
 */
export function buildPolicyInputFromContinuation(input: {
  workspaceId: string;
  kind: string;
  continuation: Record<string, unknown>;
  // For operations, the specific prepared action to evaluate.
  preferred?: "slack" | "trello" | "asana";
}): PolicyInput | null {
  const c = input.continuation;
  const operatorKey = stringValue(c.operatorKey) ?? "unknown";
  const sourceMetadata = asRecord(c.sourceMetadata);

  if (input.kind === "gmail.send_after_approval" || input.kind === "microsoft.send_after_approval") {
    const to = stringValue(c.to);
    const connectorKey = input.kind === "microsoft.send_after_approval" ? "microsoft" : "gmail";
    return {
      workspaceId: input.workspaceId,
      operatorKey,
      actionType: "send_email",
      connectorKey,
      capability: "email.send_after_approval",
      destinationType: "customer",
      riskLevel: "high",
      confidence: confidenceValue(sourceMetadata.confidence),
      recipient: to,
      domain: to ? to.split("@")[1] : undefined,
      subjectType: stringValue(c.subjectType) ?? stringValue(sourceMetadata.subjectType),
      subjectId: stringValue(c.subjectId) ?? stringValue(sourceMetadata.subjectId),
      businessContext: normalizeBusinessContext(sourceMetadata.businessContext),
      source: stringValue(c.source) ?? `${connectorKey}_scan`,
      metadata: {
        dedupeKey: stringValue(c.dedupeKey),
        ...(Array.isArray(sourceMetadata.memoryDependencies) ? { memoryDependencies: sourceMetadata.memoryDependencies } : {}),
        payloadIdentity: emailPayloadIdentity(
          stringValue(c.editedDraftSubject) ?? stringValue(c.draftSubject) ?? stringValue(c.subject) ?? "",
          stringValue(c.editedDraftBody) ?? stringValue(c.draftBody) ?? stringValue(c.body) ?? "",
        ),
        ...(sourceMetadata.supportContext ? { supportContext: sourceMetadata.supportContext } : {}),
      },
    };
  }

  if (input.kind === "shared_action.execute_after_approval") {
    const action = asRecord(c.preparedAction);
    const actionType = stringValue(action.actionType) ?? "create_task";
    return {
      workspaceId: input.workspaceId,
      operatorKey: stringValue(action.operatorKey) ?? operatorKey,
      actionType,
      connectorKey: stringValue(action.connectorKey) ?? "trello",
      capability: stringValue(action.capability),
      destinationType: destinationTypeForAction(actionType),
      riskLevel: riskValue(action.riskLevel, defaultRiskForAction(actionType)),
      confidence: confidenceValue(asRecord(action.metadata).confidence),
      subjectType: stringValue(asRecord(action.policyInput).subjectType) ?? stringValue(asRecord(action.input).subjectType),
      subjectId: stringValue(asRecord(action.policyInput).subjectId) ?? stringValue(asRecord(action.input).subjectId),
      businessContext: normalizeBusinessContext(asRecord(action.policyInput).businessContext ?? asRecord(action.metadata).businessContext ?? asRecord(action.input).businessContext),
      cardId: stringValue(asRecord(action.input).cardId),
      listId: stringValue(asRecord(action.input).listId),
      source: stringValue(action.source) ?? "shared_action",
      metadata: asRecord(action.metadata),
    };
  }

  if (input.kind === "operations.execute_after_approval") {
    const operations = asRecord(c.operations);
    const trello = asRecord(c.preparedTrelloAction);
    const slack = asRecord(c.preparedSlackAction);
    const useTrello = input.preferred === "trello" || (input.preferred === undefined && Object.keys(trello).length > 0);
    if (useTrello && Object.keys(trello).length > 0) {
      const actionType = stringValue(trello.actionType) ?? "add_task_comment";
      return {
        workspaceId: input.workspaceId,
        operatorKey: "operations",
        actionType,
        connectorKey: "trello",
        capability: stringValue(trello.capability),
        destinationType: "project_tool",
        riskLevel: riskValue(trello.riskLevel, defaultRiskForAction(actionType)),
        confidence: confidenceValue(operations.confidence),
        cardId: stringValue(asRecord(trello.input).cardId),
        listId: stringValue(asRecord(trello.input).listId),
        source: "trello_scan",
        metadata: asRecord(trello.metadata),
      };
    }
    if (Object.keys(slack).length > 0) {
      return {
        workspaceId: input.workspaceId,
        operatorKey: "operations",
        actionType: "send_slack_message",
        connectorKey: "slack",
        capability: "chat.messages.send_after_approval",
        destinationType: "internal",
        riskLevel: "low",
        confidence: confidenceValue(operations.confidence),
        channelId: stringValue(asRecord(slack.input).channelId),
        source: "trello_scan",
        metadata: asRecord(slack.metadata),
      };
    }
    return null;
  }

  if (input.kind === "teams.send_after_approval") {
    // destinationType is taken from the stored channel membership type, which
    // the executor recorded from Graph. Anything that is not provably a
    // standard/private (single-tenant) channel is classified external, which
    // means the policy engine treats it with the stricter customer/external
    // rules - ambiguity always fails toward approval, never toward autonomy.
    const membershipType = stringValue(c.channelMembershipType);
    const provablyInternal = membershipType === "standard" || membershipType === "private";
    return {
      workspaceId: input.workspaceId,
      operatorKey,
      actionType: "send_teams_message",
      connectorKey: "microsoft_teams",
      capability: "chat.messages.send_after_approval",
      destinationType: provablyInternal ? "internal" : "external",
      riskLevel: provablyInternal ? "medium" : "high",
      teamId: stringValue(c.teamId),
      channelId: stringValue(c.channelId),
      source: stringValue(c.source) ?? "teams_action",
      metadata: { dedupeKey: stringValue(c.dedupeKey) },
    };
  }

  if (input.kind === "slack.send_after_approval") {
    return {
      workspaceId: input.workspaceId,
      operatorKey,
      actionType: "send_slack_message",
      connectorKey: "slack",
      capability: "chat.messages.send_after_approval",
      destinationType: "internal",
      riskLevel: "low",
      channelId: stringValue(c.channelId),
      source: "slack_action",
    };
  }

  return null;
}
