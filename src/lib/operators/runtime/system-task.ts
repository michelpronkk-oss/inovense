// Shared runtime helpers for background Trigger.dev tasks.
//
// These let system tasks (connector health, approval safety, daily brief,
// operations readiness) record a visible run, emit a safe log event, and update
// monitoring metadata using the SAME tables operators already use
// (os_operator_runs, os_operator_run_logs, os_operator_triggers). No new tables
// are introduced.

import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type SystemTaskType = "manual" | "scheduled";
export type SystemTaskSourceMode = "manual" | "scheduled";

/**
 * Record a completed system task run plus a safe log event, and update the
 * operator monitoring trigger config with lastRunAt / lastRunStatus /
 * lastRunSummary / sourceMode / taskId / taskType.
 *
 * Never include tokens or secrets in `summary`.
 */
export async function recordSystemTaskRun(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  operatorKey: string;
  taskId: string;
  taskType: SystemTaskType;
  sourceMode: SystemTaskSourceMode;
  status: string;
  eventType: string;
  message: string;
  summary: Record<string, unknown>;
}): Promise<{ runId: string }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const runId = operatorRuntimeId(`oprun-${input.taskId}`);
  const completedAt = new Date().toISOString();

  const runInsert = await supabase.from("os_operator_runs").insert({
    id: runId,
    workspace_id: input.workspaceId,
    operator_key: input.operatorKey,
    trigger_type: "trigger_task",
    status: "completed",
    input: { taskId: input.taskId, taskType: input.taskType, sourceMode: input.sourceMode },
    output: { taskId: input.taskId, status: input.status, ...input.summary },
    readiness: {},
    risk_level: "low",
    started_at: completedAt,
    completed_at: completedAt,
  });
  if (runInsert.error) {
    // Logging/monitoring is best-effort. Never throw from a background task just
    // because run bookkeeping failed.
    console.warn(`[${input.taskId}] run insert skipped`, { workspaceId: input.workspaceId, error: runInsert.error.message });
    return { runId };
  }

  const logRes = await logOperatorEvent({
    supabase,
    workspaceId: input.workspaceId,
    runId,
    eventType: input.eventType,
    message: input.message,
    metadata: { taskId: input.taskId, taskType: input.taskType, sourceMode: input.sourceMode, ...input.summary },
  });
  if (logRes.error) {
    console.warn(`[${input.taskId}] log insert skipped`, { workspaceId: input.workspaceId, error: logRes.error.message });
  }

  const triggerId = `optrig-${input.workspaceId}-${input.taskId}`;
  const monitoringUpdate = await supabase.from("os_operator_triggers").upsert({
    id: triggerId,
    workspace_id: input.workspaceId,
    operator_key: input.operatorKey,
    trigger_type: "scheduled_monitoring",
    enabled: true,
    config: {
      taskId: input.taskId,
      taskType: input.taskType,
      sourceMode: input.sourceMode,
      lastRunAt: completedAt,
      lastRunStatus: input.status,
      lastRunSummary: input.summary,
      manualRunAvailable: true,
    },
  });
  if (monitoringUpdate.error) {
    console.warn(`[${input.taskId}] monitoring update skipped`, { workspaceId: input.workspaceId, error: monitoringUpdate.error.message });
  }

  return { runId };
}
