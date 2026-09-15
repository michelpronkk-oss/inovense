import { task } from "@trigger.dev/sdk/v3";
import { deliverSlackMentionUpdate } from "@/lib/connectors/slack-acknowledgement";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const slackMentionAcknowledge = task({
  id: "slack-mention-acknowledge",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "slack-acknowledgements", concurrencyLimit: 10 },
  maxDuration: 300,
  run: async (payload: { providerEventId: string }) => {
    if (!payload || !/^pev_[a-f0-9]{48}$/.test(payload.providerEventId)) throw new Error("slack_ack_provider_event_invalid");
    return deliverSlackMentionUpdate({ eventId: payload.providerEventId, supabase: createSupabaseAdmin() });
  },
});
