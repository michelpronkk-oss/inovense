import { schedules } from "@trigger.dev/sdk/v3";
import { createWebsiteCrawlRun } from "@/lib/connectors/website-sync";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { websiteSyncRun } from "@/trigger/website-sync-run";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

/** One shared scheduler fans out bounded due-source work; it does not create a
 * permanent cron per customer workspace. */
export const websiteSyncScheduler = schedules.task({
  id: "website-sync-scheduler",
  cron: { pattern: "*/15 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 15_000, randomize: true },
  queue: { name: "website-sync-scheduler", concurrencyLimit: 1 },
  run: () => withTaskHeartbeat({ taskId: "website-sync-scheduler", expectedCadenceMinutes: 15 }, async () => {
    const supabase = createSupabaseAdmin();
    const due = await supabase.from("os_website_sources").select("id,workspace_id").eq("sync_enabled", true).eq("verification_status", "verified").is("disconnected_at", null).lte("next_sync_at", new Date().toISOString()).order("next_sync_at", { ascending: true }).limit(100);
    if (due.error) return { queued: 0, errorCode: "website_source_storage_unavailable" };
    let queued = 0;
    for (const source of due.data ?? []) {
      try {
        const run = await createWebsiteCrawlRun({ workspaceId: source.workspace_id, sourceId: source.id, triggerType: "scheduled", supabase });
        await websiteSyncRun.trigger({ runId: run.runId }, { idempotencyKey: `website-scheduled:${run.runId}`, idempotencyKeyTTL: "7d", concurrencyKey: source.workspace_id });
        queued += run.reused ? 0 : 1;
      } catch { /* one tenant cannot stop the shared scheduler */ }
    }
    return { queued };
  }),
});
