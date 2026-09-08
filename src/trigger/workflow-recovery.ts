import { schedules } from "@trigger.dev/sdk/v3";
import { pruneProviderOperations } from "@/lib/runtime/provider-health";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { listWorkspacesWithStuckWorkflowSteps, recoverStuckWorkflowSteps, type WorkflowRecoverySummary } from "@/lib/workflows/recovery";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

/**
 * Automatic stuck-workflow recovery.
 *
 * recoverStuckWorkflowSteps() was already safe but was never scheduled, so a
 * step left in `executing` by a dead worker stayed there until a founder
 * noticed. This is the scheduled owner of that function and nothing else: it
 * discovers affected workspaces, recovers a bounded batch per workspace, and
 * reports counters. It never contacts a provider, never retries an external
 * write, and never resumes execution by itself.
 *
 * Cadence is deliberately conservative. Steps only qualify after
 * STALE_AFTER_MINUTES, so a healthy long-running execution is never disturbed,
 * and the scan itself is one index-backed query against a partial index.
 */
const STALE_AFTER_MINUTES = 30;
const MAX_WORKSPACES_PER_RUN = 50;
const MAX_STEPS_PER_WORKSPACE = 50;

type WorkspaceOutcome =
  | ({ ok: true } & WorkflowRecoverySummary)
  | { ok: false; workspaceId: string; error: string };

export const workflowRecoveryScan = schedules.task({
  id: "workflow-recovery-scan",
  cron: { pattern: "*/15 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "workflow-recovery", concurrencyLimit: 1 },
  maxDuration: 300,
  run: () => withTaskHeartbeat({ taskId: "workflow-recovery-scan", expectedCadenceMinutes: 15 }, async () => {
    const supabase = createSupabaseAdmin();
    const now = new Date();

    let workspaceIds: string[] = [];
    try {
      workspaceIds = await listWorkspacesWithStuckWorkflowSteps({ olderThanMinutes: STALE_AFTER_MINUTES, supabase, now });
    } catch (error) {
      // Discovery failing is itself worth surfacing, but it must not look like
      // "nothing was stuck".
      return { discovered: null, discoveryError: error instanceof Error ? error.message : "Stuck workflow discovery failed.", results: [] as WorkspaceOutcome[] };
    }

    // One tenant with a large backlog must not consume the whole run. The
    // remainder is picked up by the next scheduled pass.
    const batch = workspaceIds.slice(0, MAX_WORKSPACES_PER_RUN);
    const results: WorkspaceOutcome[] = [];
    for (const workspaceId of batch) {
      // One workspace failing (a revoked token, a policy read error) never
      // stops recovery for the others.
      try {
        const summary = await recoverStuckWorkflowSteps({
          workspaceId,
          olderThanMinutes: STALE_AFTER_MINUTES,
          limit: MAX_STEPS_PER_WORKSPACE,
          supabase,
          now,
        });
        results.push({ ok: true, ...summary });
      } catch (error) {
        results.push({ ok: false, workspaceId, error: error instanceof Error ? error.message : "Workflow recovery failed." });
      }
    }

    const recovered = results.filter((item): item is { ok: true } & WorkflowRecoverySummary => item.ok);
    const total = (pick: (item: WorkflowRecoverySummary) => number) => recovered.reduce((sum, item) => sum + pick(item), 0);
    const oldest = recovered.reduce<number | null>((max, item) => item.oldestStuckAgeMinutes === null ? max : Math.max(max ?? 0, item.oldestStuckAgeMinutes), null);

    // Bounded retention for ephemeral operational rows, once a day, from a job
    // that already runs. Approvals, execution intents, outcomes and Activity
    // history are never touched.
    const prunedOperationalRows = now.getUTCHours() === 3 && now.getUTCMinutes() < 15 ? await pruneProviderOperations({ supabase }) : 0;

    return {
      discovered: workspaceIds.length,
      processed: batch.length,
      deferredWorkspaces: Math.max(0, workspaceIds.length - batch.length),
      staleSteps: total((item) => item.scanned),
      reviewed: total((item) => item.reviewed),
      safeToRetry: total((item) => item.safeToRetry),
      blocked: total((item) => item.blocked),
      reconnectRequired: total((item) => item.reconnectRequired),
      executionUnknown: total((item) => item.executionUnknown),
      permanentFailure: total((item) => item.permanentFailure),
      oldestStuckAgeMinutes: oldest,
      failedWorkspaces: results.filter((item) => !item.ok).length,
      prunedOperationalRows,
      results,
    };
  }),
});
