import { task } from "@trigger.dev/sdk/v3";
import { sendSlackInternalNotification } from "@/lib/operators/executors/slack";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { recordSystemTaskRun } from "@/lib/operators/runtime/system-task";
import { getAppUrl } from "@/lib/urls";

type ApprovalSafetyPayload = {
  workspaceId?: string;
};

const DEFAULT_WORKSPACE_ID = "ws-atlas";
const STALE_THRESHOLD_HOURS = 48;

export const approvalSafetyCheck = task({
  id: "approval-safety-check",
  run: async (payload: ApprovalSafetyPayload) => {
    const workspaceId = payload.workspaceId?.trim() || DEFAULT_WORKSPACE_ID;
    const supabase = createSupabaseAdmin();

    const pending = await supabase
      .from("os_approvals")
      .select("id,title,agent_id,created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(500);

    if (pending.error) {
      return { workspaceId, status: "error", error: pending.error.message };
    }

    const rows = pending.data ?? [];
    const cutoff = Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000;
    const stale = rows.filter((row) => {
      const createdAt = typeof row.created_at === "string" ? new Date(row.created_at).getTime() : NaN;
      return Number.isFinite(createdAt) && createdAt < cutoff;
    });
    const pendingCount = rows.length;
    const staleCount = stale.length;
    const staleApprovalIds = stale.map((row) => String(row.id));

    // Optional internal Slack alert. This NEVER auto-approves or auto-rejects.
    // It only flags stale approvals for a human, and only if the workspace has
    // internal Slack notifications enabled with a default channel selected.
    let slackNotificationStatus: string | undefined;
    if (staleCount > 0) {
      const policy = await loadWorkspacePolicySettings({ supabase, workspaceId });
      const channelId = policy.slack.slackDefaultChannelId;
      if (!policy.slack.slackNotificationsEnabled) {
        slackNotificationStatus = "skipped:slack_notifications_disabled";
      } else if (!channelId) {
        slackNotificationStatus = "skipped:slack_default_channel_missing";
      } else {
        const text = [
          `Approval safety check: ${staleCount} approval(s) pending longer than ${STALE_THRESHOLD_HOURS}h.`,
          "These were not auto-approved or auto-rejected. Please review them in Auterim.",
          // TODO: update domain after Auterim domain is connected.
          `Review approvals: ${getAppUrl()}/app/approvals`,
        ].join("\n");
        try {
          const sent = await sendSlackInternalNotification({
            workspaceId,
            channelId,
            text,
            eventType: "approval_safety_stale",
            context: { staleCount, pendingCount, source: "approval-safety-check" },
          });
          slackNotificationStatus = `sent:${sent.channelId}`;
        } catch (error) {
          // Do not fail the task if Slack fails.
          slackNotificationStatus = `failed:${error instanceof Error ? error.message : "slack_failed"}`;
        }
      }
    }

    const summary = {
      pendingCount,
      staleCount,
      staleThresholdHours: STALE_THRESHOLD_HOURS,
      staleApprovalIds,
      slackNotificationStatus,
    };

    await recordSystemTaskRun({
      supabase,
      workspaceId,
      operatorKey: "approval_safety",
      taskId: "approval-safety-check",
      taskType: "manual",
      sourceMode: "manual",
      status: staleCount > 0 ? "stale_found" : "clear",
      eventType: "approval_safety_checked",
      message: `Approval safety: ${pendingCount} pending, ${staleCount} stale (> ${STALE_THRESHOLD_HOURS}h).`,
      summary,
    });

    return { workspaceId, status: staleCount > 0 ? "stale_found" : "clear", ...summary };
  },
});
