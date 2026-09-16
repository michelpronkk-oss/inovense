import { schedules } from "@trigger.dev/sdk/v3";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

/** Raw HTML is never persisted. This bounded cleanup only removes old hashes
 * and completed crawl metadata after the audit retention window. */
export const websiteSyncCleanup = schedules.task({
  id: "website-sync-cleanup",
  cron: { pattern: "30 3 * * 0", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 15_000, randomize: true },
  queue: { name: "website-sync-cleanup", concurrencyLimit: 1 },
  run: async () => {
    const supabase = createSupabaseAdmin();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000).toISOString();
    const versions = await supabase.from("os_website_page_versions").delete().lt("created_at", cutoff).select("id");
    const runs = await supabase.from("os_website_crawl_runs").delete().lt("created_at", cutoff).in("state", ["completed", "partial", "failed", "cancelled"]).select("id");
    return { deletedPageVersions: versions.data?.length ?? 0, deletedRuns: runs.data?.length ?? 0 };
  },
});
