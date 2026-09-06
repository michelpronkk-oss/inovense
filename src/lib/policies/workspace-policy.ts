import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { DEFAULT_POLICY_WORKSPACE_SETTINGS, destinationTypeForAction, defaultRiskForAction } from "@/lib/policies/defaults";
import type { DestinationType, PolicyConfidence, PolicyInput, PolicyRiskLevel, PolicyWorkspaceSettings, WorkspaceAutonomyMode } from "@/lib/policies/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function autonomyMode(value: unknown): WorkspaceAutonomyMode {
  return value === "assisted" || value === "managed" || value === "safe" ? value : "safe";
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
    autonomyMode: mode,
    emergencyStopEnabled,
    customerEmailMode: base.customerEmailMode,
    internalSlackNotificationsAllowed,
    dailyBriefAllowed,
    connectorHealthChecksAllowed: DEFAULT_POLICY_WORKSPACE_SETTINGS.connectorHealthChecksAllowed,
    lowRiskProjectToolCommentsAllowed: mode === "assisted",
    crmWritesRequireApproval: true,
    projectToolWritesRequireApproval: true,
    customerFacingActionsRequireApproval: true,
  };
}

export async function savePolicyWorkspaceSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  patch: Partial<Pick<PolicyWorkspaceSettings, "autonomyMode" | "emergencyStopEnabled" | "customerEmailMode" | "dailyBriefAllowed">>;
}): Promise<PolicyWorkspaceSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const base = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const approvalPolicy = asRecord(base.approvalPolicy);

  const nextApprovalPolicy = {
    ...approvalPolicy,
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
  preferred?: "slack" | "trello";
}): PolicyInput | null {
  const c = input.continuation;
  const operatorKey = stringValue(c.operatorKey) ?? "unknown";
  const sourceMetadata = asRecord(c.sourceMetadata);

  if (input.kind === "gmail.send_after_approval" || input.kind === "outlook.send_after_approval") {
    const to = stringValue(c.to);
    const connectorKey = input.kind === "outlook.send_after_approval" ? "outlook" : "gmail";
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
      source: stringValue(c.source) ?? `${connectorKey}_scan`,
      metadata: { dedupeKey: stringValue(c.dedupeKey) },
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
      cardId: stringValue(asRecord(action.input).cardId),
      listId: stringValue(asRecord(action.input).listId),
      source: stringValue(action.source) ?? "shared_action",
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
      };
    }
    return null;
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
