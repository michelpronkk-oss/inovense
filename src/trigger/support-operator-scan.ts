import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanSupportSignals } from "@/lib/operators/support/scan";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

const DEFAULT_WORKSPACE_ID = "ws-atlas";

export const supportOperatorScan = task({
  id: "support-operator-scan",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "operator-scans", concurrencyLimit: 3 },
  run: async (payload: { workspaceId?: string }) => {
    const workspaceId = payload.workspaceId?.trim() || DEFAULT_WORKSPACE_ID;
    const result = await scanSupportSignals({ workspaceId, sourceMode: "manual" });
    return { workspaceId, ...result.body };
  },
});

export const supportOperatorDailyScan = schedules.task({
  id: "support-operator-daily-scan",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "operator-scan-fanout", concurrencyLimit: 1 },
  cron: { pattern: "0 8 * * *", timezone: "UTC" },
  run: () => withTaskHeartbeat({ taskId: "support-operator-daily-scan", expectedCadenceMinutes: 24 * 60 }, async () => {
    const supabase = createSupabaseAdmin();
    const rows = await supabase.from("os_workspaces").select("id").limit(500);
    const workspaceIds = (rows.data ?? []).map((row) => String(row.id ?? "")).filter(Boolean);
    const results: Array<{ workspaceId: string; ok: boolean; body?: unknown }> = [];
    for (const workspaceId of workspaceIds) {
      try {
        const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "support" });
        const [eligibility, activation] = await Promise.all([getWorkspaceExecutionEligibility(workspaceId, supabase), getOperatorActivationState({ workspaceId, operatorKey: "support", supabase })]);
        if (!readiness?.canRunManual || !eligibility.eligible || !activation?.activated) continue;
        const result = await scanSupportSignals({ workspaceId, sourceMode: "scheduled", supabase });
        results.push({ workspaceId, ok: result.ok, body: result.body });
      } catch (error) { results.push({ workspaceId, ok: false, body: { error: error instanceof Error ? error.message : "Support scan failed." } }); }
    }
    return { workspacesScanned: results.length, results };
  }),
});
