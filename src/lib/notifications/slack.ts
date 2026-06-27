import { sendSlackInternalNotification, SlackExecutionError } from "@/lib/operators/executors/slack";
import { logOperatorEvent } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type SlackApprovalNotificationEvent =
  | "revenue_approval_created"
  | "approval_approved"
  | "approval_rejected"
  | "execution_failed";

export type SendSlackApprovalNotificationInput = {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  approvalId: string;
  runId?: string | null;
  channelId?: string | null;
  eventType: SlackApprovalNotificationEvent;
  operatorKey?: string | null;
  title: string;
  summary?: string | null;
  confidence?: string | null;
  risk?: string | null;
  source?: string | null;
  actionLabel?: string | null;
  approvalUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function eventEnabled(settings: Awaited<ReturnType<typeof loadWorkspacePolicySettings>>["slack"], eventType: SlackApprovalNotificationEvent): boolean {
  if (!settings.slackNotificationsEnabled || !settings.slackApprovalAlertsEnabled) return false;
  if (eventType === "revenue_approval_created") return settings.notifyOnRevenueApprovalCreated;
  if (eventType === "approval_approved") return settings.notifyOnApprovalApproved;
  if (eventType === "approval_rejected") return settings.notifyOnApprovalRejected;
  if (eventType === "execution_failed") return settings.notifyOnExecutionFailed;
  return false;
}

function eventLogName(eventType: SlackApprovalNotificationEvent): string {
  if (eventType === "approval_approved") return "slack_notification_approval_approved";
  if (eventType === "approval_rejected") return "slack_notification_approval_rejected";
  if (eventType === "execution_failed") return "slack_notification_execution_failed";
  return "slack_notification_approval_created";
}

function buildMessage(input: SendSlackApprovalNotificationInput): string {
  const lines: string[] = [];
  if (input.eventType === "approval_approved") {
    lines.push("Approval approved.");
  } else if (input.eventType === "approval_rejected") {
    lines.push("Approval rejected. Revenue Operator learned from the decision.");
  } else if (input.eventType === "execution_failed") {
    lines.push("Execution failed. Review the approval logs in Inovense.");
  } else {
    lines.push(input.title || "Revenue Operator created a new approval.");
  }

  if (input.eventType === "revenue_approval_created") {
    if (input.summary) lines.push(input.summary);
    if (input.actionLabel) lines.push(`Prepared action: ${input.actionLabel}.`);
    if (input.confidence) lines.push(`Confidence: ${input.confidence}.`);
    if (input.risk) lines.push(`Risk: ${input.risk}.`);
  }

  if (input.approvalUrl) lines.push(`Review approval: ${input.approvalUrl}`);
  return lines.filter(Boolean).join("\n");
}

async function alreadySent(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  approvalId: string;
  eventType: SlackApprovalNotificationEvent;
}): Promise<boolean> {
  const approval = await input.supabase
    .from("os_approvals")
    .select("continuation_payload")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.approvalId)
    .maybeSingle();
  if (approval.error || !approval.data) return false;
  const continuation = asRecord(approval.data.continuation_payload);
  const notifications = asRecord(continuation.slackNotifications);
  const current = asRecord(notifications[input.eventType]);
  return current.status === "sent";
}

async function recordNotification(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  approvalId: string;
  eventType: SlackApprovalNotificationEvent;
  status: "sent" | "failed" | "skipped";
  details: Record<string, unknown>;
}) {
  const approval = await input.supabase
    .from("os_approvals")
    .select("continuation_payload")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.approvalId)
    .maybeSingle();
  if (approval.error || !approval.data) return;
  const continuation = asRecord(approval.data.continuation_payload);
  const current = asRecord(continuation.slackNotifications);
  await input.supabase.from("os_approvals").update({
    continuation_payload: {
      ...continuation,
      slackNotifications: {
        ...current,
        [input.eventType]: {
          status: input.status,
          at: new Date().toISOString(),
          ...input.details,
        },
      },
    },
  }).eq("workspace_id", input.workspaceId).eq("id", input.approvalId);
}

export async function sendSlackApprovalNotification(input: SendSlackApprovalNotificationInput): Promise<{
  status: "sent" | "skipped" | "failed";
  reason?: string;
  channelId?: string | null;
  messageTs?: string | null;
}> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const channelId = input.channelId ?? settings.slack.slackDefaultChannelId;
  const eventType = input.eventType;

  if (!eventEnabled(settings.slack, eventType)) {
    return { status: "skipped", reason: "slack_notifications_disabled" };
  }
  if (!channelId) {
    return { status: "skipped", reason: "slack_default_channel_missing" };
  }
  if (await alreadySent({ supabase, workspaceId: input.workspaceId, approvalId: input.approvalId, eventType })) {
    return { status: "skipped", reason: "already_sent", channelId };
  }

  const text = buildMessage(input);
  const runId = input.runId || "manual";
  try {
    const sent = await sendSlackInternalNotification({
      workspaceId: input.workspaceId,
      channelId,
      text,
      eventType,
      approvalId: input.approvalId,
      context: {
        operatorKey: input.operatorKey ?? null,
        source: input.source ?? null,
        metadata: input.metadata ?? null,
      },
    });
    await recordNotification({
      supabase,
      workspaceId: input.workspaceId,
      approvalId: input.approvalId,
      eventType,
      status: "sent",
      details: { channelId: sent.channelId, messageTs: sent.messageTs ?? null },
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: "slack_notification_sent",
      message: `Sent Slack approval notification for ${input.approvalId}.`,
      metadata: { approvalId: input.approvalId, channelId: sent.channelId, eventType: eventLogName(eventType), messageTs: sent.messageTs ?? null },
    });
    await supabase.from("os_execution_logs").insert({
      id: `log-slack-notification-sent-${Date.now()}`,
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      run_id: runId,
      agent_id: input.operatorKey || "system",
      agent_mark: input.operatorKey === "revenue" ? "RV" : "OS",
      agent_color: input.operatorKey === "revenue" ? "#4DE8E1" : "#4DE8E1",
      event: "slack_notification_sent",
      message: `Sent Slack approval notification for ${input.approvalId}.`,
      duration: "-",
      status: "ok",
    });
    return { status: "sent", channelId: sent.channelId, messageTs: sent.messageTs ?? null };
  } catch (error) {
    const safeDetails = error instanceof SlackExecutionError ? error.details : null;
    await recordNotification({
      supabase,
      workspaceId: input.workspaceId,
      approvalId: input.approvalId,
      eventType,
      status: "failed",
      details: { channelId, error: error instanceof Error ? error.message : "Slack notification failed.", details: safeDetails },
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      level: "warn",
      eventType: "slack_notification_failed",
      message: error instanceof Error ? error.message : "Slack notification failed.",
      metadata: { approvalId: input.approvalId, channelId, eventType: eventLogName(eventType), details: safeDetails },
    });
    await supabase.from("os_execution_logs").insert({
      id: `log-slack-notification-failed-${Date.now()}`,
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      run_id: runId,
      agent_id: input.operatorKey || "system",
      agent_mark: input.operatorKey === "revenue" ? "RV" : "OS",
      agent_color: input.operatorKey === "revenue" ? "#4DE8E1" : "#4DE8E1",
      event: "slack_notification_failed",
      message: error instanceof Error ? error.message : "Slack notification failed.",
      duration: "-",
      status: "warn",
    });
    return { status: "failed", reason: error instanceof Error ? error.message : "slack_notification_failed", channelId };
  }
}
