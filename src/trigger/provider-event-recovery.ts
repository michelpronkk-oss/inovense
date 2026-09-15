import { idempotencyKeys, schedules } from "@trigger.dev/sdk/v3";
import { listRecoverableProviderEvents } from "@/lib/provider-events/store";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { gmailPushProcess } from "@/trigger/gmail-push-process";
import { hubspotWebhookProcess } from "@/trigger/hubspot-webhook-process";
import { slackEventProcess } from "@/trigger/slack-event-process";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

const RECOVERY_BATCH_SIZE = 200;

/** Re-enqueue provider events whose intake or previous Trigger run was interrupted. */
export const providerEventRecovery = schedules.task({
  id: "provider-event-recovery",
  cron: { pattern: "*/5 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 30_000, randomize: true },
  queue: { name: "provider-event-recovery", concurrencyLimit: 1 },
  maxDuration: 300,
  run: () => withTaskHeartbeat({ taskId: "provider-event-recovery", expectedCadenceMinutes: 5 }, async () => {
    const supabase = createSupabaseAdmin();
    const events = await listRecoverableProviderEvents({ limit: RECOVERY_BATCH_SIZE, supabase });
    let enqueued = 0;
    let unsupported = 0;
    for (const event of events) {
      const isGmail = event.provider === "gmail" && event.event_type === "gmail.history.changed";
      const isHubSpot = event.provider === "hubspot" && event.connector_key === "hubspot" && event.source_mode === "webhook" && event.event_type.startsWith("hubspot.");
      const isSlack = event.provider === "slack" && event.connector_key === "slack" && event.source_mode === "webhook" && event.event_type.startsWith("slack.");
      if (!isGmail && !isHubSpot && !isSlack) {
        unsupported += 1;
        continue;
      }
      const idempotencyKey = await idempotencyKeys.create(
        `provider-event:${event.id}:attempt:${event.attempt_count}`,
        { scope: "global" },
      );
      if (isGmail) {
        await gmailPushProcess.trigger({ providerEventId: event.id }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: event.connector_id });
      } else if (isHubSpot) {
        await hubspotWebhookProcess.trigger({ providerEventId: event.id }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: event.connector_id });
      } else {
        await slackEventProcess.trigger({ providerEventId: event.id }, { idempotencyKey, idempotencyKeyTTL: "30d", concurrencyKey: event.connector_id });
      }
      enqueued += 1;
    }
    console.info(JSON.stringify({ event: "provider_event_recovery_dispatched", examined: events.length, enqueued, unsupported }));
    return { examined: events.length, enqueued, unsupported };
  }),
});
