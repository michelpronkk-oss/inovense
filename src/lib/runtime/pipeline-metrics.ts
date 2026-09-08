// Truthful pipeline / queue lag metrics.
//
// Every number here comes from real persisted state that Auterim already
// writes. Nothing is invented: Trigger.dev's internal queue depth is not
// exposed to application code, so this module measures the durable rows that
// a backed-up runtime actually leaves behind - unprocessed signal candidates,
// runnable workflow steps, pending approvals, and completed steps that have
// not been observed for an outcome yet.
//
// A value that cannot be measured is returned as null rather than as zero. A
// zero that really means "unknown" is worse than an honest gap.

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** How long a step may sit in `executing` before it counts as stuck. */
export const STUCK_STEP_THRESHOLD_MINUTES = 30;

export type LagSection = {
  pending: number | null;
  oldestAgeMinutes: number | null;
};

export type PipelineLagMetrics = {
  available: boolean;
  measuredAt: string;
  signals: LagSection & { oldestCandidateAgeMinutes: number | null };
  workflows: LagSection & {
    stuck: number | null;
    oldestStuckAgeMinutes: number | null;
    blocked: number | null;
    executionUnknown: number | null;
  };
  approvals: LagSection;
  outcomeObservation: LagSection & {
    /** Not modeled as a durable retry queue today, so deliberately null rather than a guess. */
    exhausted: number | null;
  };
};

export function lagAgeMinutes(value: unknown, nowMs: number): number | null {
  if (typeof value !== "string") return null;
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.round((nowMs - at) / 60_000));
}

async function countRows(query: PromiseLike<{ count?: number | null; error: unknown }>): Promise<number | null> {
  try {
    const result = await query;
    if (result.error || typeof result.count !== "number") return null;
    return result.count;
  } catch {
    return null;
  }
}

async function oldestAge(query: PromiseLike<{ data: unknown; error: unknown }>, column: string, nowMs: number): Promise<number | null> {
  try {
    const result = await query;
    if (result.error) return null;
    const rows = Array.isArray(result.data) ? result.data : [];
    const first = rows[0] as Record<string, unknown> | undefined;
    return first ? lagAgeMinutes(first[column], nowMs) : null;
  } catch {
    return null;
  }
}

const PENDING_CANDIDATE_STATUSES = ["new", "routed", "processing"];
const RUNNABLE_STEP_STATUSES = ["proposed", "awaiting_approval", "approved"];

/**
 * Read current pipeline lag. Pass a workspaceId for one tenant, or omit it for
 * the internal cross-workspace view. Every query is bounded and read-only, and
 * an unavailable table degrades to null instead of throwing.
 */
export async function getPipelineLagMetrics(input: {
  workspaceId?: string;
  supabase?: SupabaseAdmin;
  now?: Date;
  stuckThresholdMinutes?: number;
} = {}): Promise<PipelineLagMetrics> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const measuredAt = now.toISOString();
  const empty: PipelineLagMetrics = {
    available: false,
    measuredAt,
    signals: { pending: null, oldestAgeMinutes: null, oldestCandidateAgeMinutes: null },
    workflows: { pending: null, oldestAgeMinutes: null, stuck: null, oldestStuckAgeMinutes: null, blocked: null, executionUnknown: null },
    approvals: { pending: null, oldestAgeMinutes: null },
    outcomeObservation: { pending: null, oldestAgeMinutes: null, exhausted: null },
  };

  let supabase: SupabaseAdmin;
  try {
    supabase = input.supabase ?? createSupabaseAdmin();
  } catch {
    return empty;
  }

  // An empty match object adds no filters, which is exactly the internal
  // cross-workspace view. One tenant is a single extra equality.
  const scope: Record<string, string> = input.workspaceId ? { workspace_id: input.workspaceId } : {};
  const stuckThreshold = new Date(nowMs - Math.max(5, Math.min(input.stuckThresholdMinutes ?? STUCK_STEP_THRESHOLD_MINUTES, 24 * 60)) * 60_000).toISOString();
  const steps = () => supabase.from("os_workflow_steps");
  const candidates = () => supabase.from("os_signal_candidates");
  const approvals = () => supabase.from("os_approvals");

  const [
    signalPending, signalOldest, signalEventOldest,
    workflowPending, workflowOldest, workflowStuck, workflowStuckOldest, workflowBlocked, workflowExecutionUnknown,
    approvalPending, approvalOldest,
    observationPending, observationOldest,
  ] = await Promise.all([
    countRows(candidates().select("id", { count: "exact", head: true }).match(scope).in("status", PENDING_CANDIDATE_STATUSES)),
    oldestAge(candidates().select("created_at").match(scope).in("status", PENDING_CANDIDATE_STATUSES).order("created_at", { ascending: true }).limit(1), "created_at", nowMs),
    oldestAge(supabase.from("os_signal_events").select("observed_at").match(scope).order("observed_at", { ascending: true }).limit(1), "observed_at", nowMs),

    countRows(steps().select("id", { count: "exact", head: true }).match(scope).in("status", RUNNABLE_STEP_STATUSES)),
    oldestAge(steps().select("updated_at").match(scope).in("status", RUNNABLE_STEP_STATUSES).order("updated_at", { ascending: true }).limit(1), "updated_at", nowMs),
    countRows(steps().select("id", { count: "exact", head: true }).match(scope).eq("status", "executing").lt("updated_at", stuckThreshold)),
    oldestAge(steps().select("updated_at").match(scope).eq("status", "executing").order("updated_at", { ascending: true }).limit(1), "updated_at", nowMs),
    countRows(steps().select("id", { count: "exact", head: true }).match(scope).eq("status", "blocked")),
    countRows(steps().select("id", { count: "exact", head: true }).match(scope).eq("block_reason", "execution_unknown")),

    countRows(approvals().select("id", { count: "exact", head: true }).match(scope).eq("status", "pending")),
    oldestAge(approvals().select("created_at").match(scope).eq("status", "pending").order("created_at", { ascending: true }).limit(1), "created_at", nowMs),

    // Outcome observation has no separate queue table today. The honest
    // measure is completed workflow steps old enough that a provider-state
    // outcome should already have been observable.
    countRows(steps().select("id", { count: "exact", head: true }).match(scope).eq("status", "completed").lt("updated_at", stuckThreshold)),
    oldestAge(steps().select("updated_at").match(scope).eq("status", "completed").order("updated_at", { ascending: true }).limit(1), "updated_at", nowMs),
  ]);

  const measured = [signalPending, workflowPending, approvalPending].some((value) => value !== null);
  return {
    available: measured,
    measuredAt,
    signals: { pending: signalPending, oldestAgeMinutes: signalEventOldest, oldestCandidateAgeMinutes: signalOldest },
    workflows: {
      pending: workflowPending,
      oldestAgeMinutes: workflowOldest,
      stuck: workflowStuck,
      oldestStuckAgeMinutes: workflowStuck && workflowStuck > 0 ? workflowStuckOldest : null,
      blocked: workflowBlocked,
      executionUnknown: workflowExecutionUnknown,
    },
    approvals: { pending: approvalPending, oldestAgeMinutes: approvalOldest },
    outcomeObservation: { pending: observationPending, oldestAgeMinutes: observationOldest, exhausted: null },
  };
}
