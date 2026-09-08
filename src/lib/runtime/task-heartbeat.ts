import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

async function writeHeartbeat(
  supabase: SupabaseAdmin,
  values: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("os_task_heartbeats").upsert(values, { onConflict: "task_id" });
  } catch {
    // Telemetry can never make a scheduled task fail.
  }
}

/**
 * Record payload-free task lifecycle facts. The wrapper deliberately stores a
 * canonical safe code instead of an exception message, and telemetry failure
 * never changes the task result.
 */
export async function withTaskHeartbeat<T>(
  input: { taskId: string; expectedCadenceMinutes: number; supabase?: SupabaseAdmin },
  run: () => Promise<T>,
): Promise<T> {
  let supabase: SupabaseAdmin;
  try {
    supabase = input.supabase ?? createSupabaseAdmin();
  } catch {
    return run();
  }
  const startedAt = new Date();
  await writeHeartbeat(supabase, {
    task_id: input.taskId,
    expected_cadence_minutes: input.expectedCadenceMinutes,
    last_started_at: startedAt.toISOString(),
    updated_at: startedAt.toISOString(),
  });
  try {
    const result = await run();
    const finishedAt = new Date();
    await writeHeartbeat(supabase, {
      task_id: input.taskId,
      expected_cadence_minutes: input.expectedCadenceMinutes,
      last_started_at: startedAt.toISOString(),
      last_succeeded_at: finishedAt.toISOString(),
      last_safe_error_code: null,
      last_duration_ms: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      updated_at: finishedAt.toISOString(),
    });
    return result;
  } catch (error) {
    const finishedAt = new Date();
    await writeHeartbeat(supabase, {
      task_id: input.taskId,
      expected_cadence_minutes: input.expectedCadenceMinutes,
      last_started_at: startedAt.toISOString(),
      last_failed_at: finishedAt.toISOString(),
      last_safe_error_code: "task_failed",
      last_duration_ms: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      updated_at: finishedAt.toISOString(),
    });
    throw error;
  }
}
