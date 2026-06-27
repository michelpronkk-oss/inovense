import { schedules } from "@trigger.dev/sdk/v3";
import { sendSlackInternalNotification } from "@/lib/operators/executors/slack";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordSystemTaskRun } from "@/lib/operators/runtime/system-task";

const DEFAULT_WORKSPACE_ID = "ws-atlas";

type ApprovalRow = {
  id: string;
  agent_id: string | null;
  status: string | null;
  created_at: string | null;
  resolved_at: string | null;
  continuation_payload: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function executionResultOf(row: ApprovalRow): Record<string, unknown> {
  return asRecord(asRecord(row.continuation_payload).executionResult);
}

function hasSentSlackNotification(row: ApprovalRow): boolean {
  const notifications = asRecord(asRecord(row.continuation_payload).slackNotifications);
  return Object.values(notifications).some((entry) => asRecord(entry).status === "sent");
}

async function runWorkspaceDailyBrief(workspaceId: string) {
  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [createdRes, resolvedRes] = await Promise.all([
    supabase
      .from("os_approvals")
      .select("id,agent_id,status,created_at,resolved_at,continuation_payload")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since)
      .limit(500),
    supabase
      .from("os_approvals")
      .select("id,agent_id,status,created_at,resolved_at,continuation_payload")
      .eq("workspace_id", workspaceId)
      .gte("resolved_at", since)
      .limit(500),
  ]);

  if (createdRes.error) return { workspaceId, status: "error", error: createdRes.error.message };
  if (resolvedRes.error) return { workspaceId, status: "error", error: resolvedRes.error.message };

  const createdRows = (createdRes.data ?? []) as ApprovalRow[];
  const resolvedRows = (resolvedRes.data ?? []) as ApprovalRow[];

  // Union for slack-notification counting (created or resolved in window).
  const unionById = new Map<string, ApprovalRow>();
  [...createdRows, ...resolvedRows].forEach((row) => unionById.set(String(row.id), row));

  const revenueApprovalsCreated = createdRows.filter((row) => row.agent_id === "revenue").length;
  const clientFlowApprovalsCreated = createdRows.filter((row) => row.agent_id === "client_flow").length;

  let emailsSent = 0;
  let hubspotUpdates = 0;
  let trelloTasksCreated = 0;
  let failedExecutions = 0;

  for (const row of resolvedRows) {
    const exec = executionResultOf(row);
    const gmail = asRecord(exec.gmail);
    if (exec.gmailStatus === "sent" || typeof gmail.messageId === "string") emailsSent += 1;
    if (typeof exec.hubspotContactId === "string" || typeof exec.hubspotDealId === "string") hubspotUpdates += 1;
    const clientFlowTrello = asRecord(exec.clientFlowTrello);
    if (clientFlowTrello.status === "executed") trelloTasksCreated += 1;
    // Shared-action approvals store { status: "executed", action: {...} }.
    const action = asRecord(exec.action);
    if (exec.status === "executed" && asRecord(action).actionType) trelloTasksCreated += 1;
    if (row.status === "failed" || exec.gmailStatus === "failed" || clientFlowTrello.status === "failed") failedExecutions += 1;
  }

  const slackNotificationsSent = Array.from(unionById.values()).filter(hasSentSlackNotification).length;

  const summary = {
    windowHours: 24,
    revenueApprovalsCreated,
    clientFlowApprovalsCreated,
    emailsSent,
    hubspotUpdates,
    trelloTasksCreated,
    slackNotificationsSent,
    failedExecutions,
  };

  const actionsLine = [
    emailsSent > 0 ? `${emailsSent} email${emailsSent === 1 ? "" : "s"} sent` : null,
    trelloTasksCreated > 0 ? `${trelloTasksCreated} Trello task${trelloTasksCreated === 1 ? "" : "s"} created` : null,
    hubspotUpdates > 0 ? `${hubspotUpdates} HubSpot update${hubspotUpdates === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ") || "none";

  const message = [
    "Daily Inovense brief:",
    `Revenue: ${revenueApprovalsCreated} ${revenueApprovalsCreated === 1 ? "opportunity" : "opportunities"} prepared.`,
    `Client Flow: ${clientFlowApprovalsCreated} client ${clientFlowApprovalsCreated === 1 ? "request" : "requests"} prepared.`,
    `Actions executed: ${actionsLine}.`,
    `Issues: ${failedExecutions === 0 ? "none" : `${failedExecutions} failed execution${failedExecutions === 1 ? "" : "s"}`}.`,
  ].join("\n");

  // Internal only. This never produces customer-facing messages. Send to Slack
  // only when internal notifications are enabled with a default channel.
  let slackNotificationStatus: string;
  const policy = await loadWorkspacePolicySettings({ supabase, workspaceId });
  const channelId = policy.slack.slackDefaultChannelId;
  if (!policy.slack.slackNotificationsEnabled) {
    slackNotificationStatus = "skipped:slack_notifications_disabled";
  } else if (!channelId) {
    slackNotificationStatus = "skipped:slack_default_channel_missing";
  } else {
    try {
      const sent = await sendSlackInternalNotification({
        workspaceId,
        channelId,
        text: message,
        eventType: "workspace_daily_brief",
        context: { source: "workspace-daily-brief", ...summary },
      });
      slackNotificationStatus = `sent:${sent.channelId}`;
    } catch (error) {
      // Do not fail the brief if Slack fails.
      slackNotificationStatus = `failed:${error instanceof Error ? error.message : "slack_failed"}`;
    }
  }

  await recordSystemTaskRun({
    supabase,
    workspaceId,
    operatorKey: "workspace_brief",
    taskId: "workspace-daily-brief",
    taskType: "scheduled",
    sourceMode: "scheduled",
    status: "completed",
    eventType: "workspace_daily_brief_generated",
    message,
    summary: { ...summary, slackNotificationStatus },
  });

  return { workspaceId, status: "completed", ...summary, slackNotificationStatus, message };
}

export const workspaceDailyBrief = schedules.task({
  id: "workspace-daily-brief",
  cron: {
    pattern: "0 9 * * *",
    timezone: "UTC",
  },
  run: async () => {
    // TODO: multi-workspace fanout. List active workspaces, run a brief per
    // workspace, respect plan entitlements and operator enabled/disabled state.
    return runWorkspaceDailyBrief(DEFAULT_WORKSPACE_ID);
  },
});
