import { schedules } from "@trigger.dev/sdk/v3";
import { randomUUID } from "node:crypto";
import {
  claimMicrosoftSubscriptionLease,
  listMicrosoftSubscriptionsDue,
  renewMicrosoftSubscription,
  releaseMicrosoftSubscriptionLease,
  ensureMicrosoftSubscriptions,
} from "@/lib/connectors/microsoft-subscriptions";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

/** Keeps the two durable Graph subscriptions alive and repairs deferred setup. */
export const microsoftSubscriptionRenewal = schedules.task({
  id: "microsoft-subscription-renewal",
  cron: { pattern: "*/10 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "microsoft-subscriptions", concurrencyLimit: 1 },
  maxDuration: 300,
  run: () => withTaskHeartbeat({ taskId: "microsoft-subscription-renewal", expectedCadenceMinutes: 10 }, async () => {
    const supabase = createSupabaseAdmin();
    const workspaces = await supabase.from("os_connector_credentials").select("workspace_id").eq("connector_key", "microsoft").limit(100);
    if (workspaces.error) throw new Error("microsoft_subscription_workspace_lookup_failed");
    let repaired = 0;
    for (const row of workspaces.data ?? []) {
      if (typeof row.workspace_id !== "string") continue;
      try {
        await ensureMicrosoftSubscriptions(row.workspace_id, supabase);
        repaired += 1;
      } catch (error) {
        console.warn(JSON.stringify({ event: "microsoft_subscription_setup_deferred", workspaceId: row.workspace_id, error: error instanceof Error ? error.message : "unknown" }));
      }
    }

    const due = await listMicrosoftSubscriptionsDue({ limit: 200, supabase });
    let renewed = 0;
    let skipped = 0;
    for (const row of due) {
      const leaseToken = randomUUID();
      if (!await claimMicrosoftSubscriptionLease({ id: row.id, token: leaseToken, supabase })) { skipped += 1; continue; }
      try {
        await renewMicrosoftSubscription(row, supabase);
        renewed += 1;
      } catch (error) {
        console.warn(JSON.stringify({ event: "microsoft_subscription_renewal_failed", subscriptionId: row.id, workspaceId: row.workspace_id, error: error instanceof Error ? error.message : "unknown" }));
      } finally {
        await releaseMicrosoftSubscriptionLease({ id: row.id, token: leaseToken, supabase }).catch(() => undefined);
      }
    }
    return { workspaces: workspaces.data?.length ?? 0, repaired, due: due.length, renewed, skipped };
  }),
});
