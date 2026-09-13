import { schedules } from "@trigger.dev/sdk/v3";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/gmail";
import { ensureGmailWatch } from "@/lib/connectors/gmail-monitoring";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

const PAGE_SIZE = 500;
const MAX_ROWS = 10_000;

export const gmailWatchRenewal = schedules.task({
  id: "gmail-watch-renewal",
  cron: { pattern: "20 3 * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true },
  queue: { name: "gmail-watch-renewal", concurrencyLimit: 1 },
  maxDuration: 1800,
  run: () => withTaskHeartbeat({ taskId: "gmail-watch-renewal", expectedCadenceMinutes: 24 * 60 }, async () => {
    const supabase = createSupabaseAdmin();
    let renewed = 0;
    let failed = 0;
    let processed = 0;
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const result = await supabase.from("os_connector_credentials")
        .select("workspace_id,scopes")
        .eq("connector_key", "gmail")
        .eq("status", "connected")
        .order("workspace_id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (result.error) throw new Error("gmail_watch_workspace_discovery_failed");
      const rows = result.data ?? [];
      for (const row of rows) {
        if (!Array.isArray(row.scopes) || !row.scopes.includes(GMAIL_READONLY_SCOPE)) continue;
        processed += 1;
        try {
          const outcome = await ensureGmailWatch({ workspaceId: String(row.workspace_id), supabase });
          if (outcome.ok) renewed += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (rows.length < PAGE_SIZE) break;
    }
    return { processed, renewed, failed };
  }),
});
