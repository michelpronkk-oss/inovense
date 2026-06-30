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
  contactName?: string | null;
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

function stripSubjectPrefix(value: string): string {
  return value.replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, "").trim();
}

function shorten(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}â€¦` : clean;
}

function resolveContactName(input: SendSlackApprovalNotificationInput): string {
  const meta = asRecord(input.metadata);
  const explicit = input.contactName?.trim() || (typeof meta.contactName === "string" ? meta.contactName.trim() : "");
  if (explicit) return explicit;
  // Fall back to "... from {name}" embedded in the title, then the email local part.
  const fromTitle = (input.title || "").match(/\bfrom\s+([^.]+?)\.?\s*$/i);
  if (fromTitle?.[1]) return fromTitle[1].trim();
  const email = typeof meta.fromEmail === "string" ? meta.fromEmail : "";
  const local = email.split("@")[0]?.trim();
  return local || "A contact";
}

// Human labels for prepared action keys. Returns null for actions that should
// not appear as a bullet (e.g. the Slack alert itself).
function preparedActionLabel(key: string): string | null {
  const map: Record<string, string> = {
    send_gmail_follow_up: "Follow-up email",
    send_client_email: "Client reply",
    update_hubspot_contact: "HubSpot contact update",
    add_hubspot_note: "HubSpot note",
    create_hubspot_follow_up_task: "HubSpot follow-up task",
    create_trello_task: "Trello task",
    add_task_comment: "Trello comment",
    slack_internal_alert: "",
  };
  const label = map[key];
  return label === undefined ? null : label || null;
}

function preparedBullets(input: SendSlackApprovalNotificationInput): string[] {
  const meta = asRecord(input.metadata);
  const raw = Array.isArray(meta.preparedActions)
    ? meta.preparedActions.filter((item): item is string => typeof item === "string")
    : [];
  const labels = raw.map(preparedActionLabel).filter((label): label is string => Boolean(label));
  const deduped = Array.from(new Set(labels));
  if (deduped.length > 0) return deduped.slice(0, 4);
  if (input.actionLabel) {
    const label = input.actionLabel.trim();
    return label ? [label.charAt(0).toUpperCase() + label.slice(1)] : [];
  }
  return [];
}

function buildApprovalCreatedMessage(input: SendSlackApprovalNotificationInput): string {
  const meta = asRecord(input.metadata);
  const header = input.operatorKey === "client_flow" ? "Client approval ready" : "Revenue approval ready";
  const contactName = resolveContactName(input);
  const subject = typeof meta.subject === "string" ? stripSubjectPrefix(meta.subject) : "";
  const topic = subject || (input.summary ? shorten(input.summary, 90) : "") || "your message";
  const bullets = preparedBullets(input);

  const lines: string[] = [header, "", `${contactName} asked about ${topic}.`];
  if (bullets.length > 0) {
    lines.push("", "Prepared:");
    bullets.forEach((bullet) => lines.push(`â€¢ ${bullet}`));
  }
  const meta2: string[] = [];
  if (input.confidence) meta2.push(`Confidence: ${input.confidence}`);
  if (input.risk) meta2.push(`Risk: ${input.risk}`);
  if (meta2.length > 0) lines.push("", ...meta2);
  if (input.approvalUrl) lines.push("", "Review in Auterim:", input.approvalUrl);
  return lines.join("\n");
}

function buildMessage(input: SendSlackApprovalNotificationInput): string {
  if (input.eventType === "approval_approved") return "Approval approved.";
  if (input.eventType === "approval_rejected") return "Approval rejected. The operator learned from the decision.";
  if (input.eventType === "execution_failed") return "Execution failed. Review the approval logs in Auterim.";
  return buildApprovalCreatedMessage(input);
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
