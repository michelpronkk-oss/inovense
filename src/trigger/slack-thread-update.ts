import { task } from "@trigger.dev/sdk/v3";
import { loadSlackMentionContextFromWorkflow, deliverSlackMentionUpdate, type SlackThreadUpdateType } from "@/lib/connectors/slack-acknowledgement";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const slackThreadUpdate = task({
  id: "slack-thread-update",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "slack-acknowledgements", concurrencyLimit: 10 },
  maxDuration: 300,
  run: async (payload: { workspaceId: string; workflowId: string; updateType: Exclude<SlackThreadUpdateType, "acknowledgement"> }) => {
    if (!payload?.workspaceId || !payload.workflowId || !payload.updateType) throw new Error("slack_thread_update_payload_invalid");
    const supabase = createSupabaseAdmin();
    const context = await loadSlackMentionContextFromWorkflow({ workspaceId: payload.workspaceId, workflowId: payload.workflowId, updateType: payload.updateType, supabase });
    if (!context) return { status: "not_slack_originated" };
    return deliverSlackMentionUpdate({ eventId: context.eventId, updateType: payload.updateType, supabase });
  },
});
