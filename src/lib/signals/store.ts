import "server-only";

import { getOperatorActivationState } from "@/lib/operators/activation";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import type { OperatorKey } from "@/lib/operators/registry";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { routeSignalEvent } from "@/lib/signals/engine";
import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";
import { createWorkflowFromSignalCandidate } from "@/lib/workflows/store";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type SignalIngestionResult = {
  received: number;
  classified: number;
  ignored: number;
  unknown: number;
  eventsPersisted: number;
  candidatesProduced: number;
  workflowCandidates: number;
  candidatesRouted: number;
  candidatesSuppressed: number;
  routedByOperator: Record<string, number>;
  classificationFailures: number;
};

function eventRow(event: SignalEvent, category: string) {
  return {
    id: event.id,
    workspace_id: event.workspaceId,
    connector_key: event.connectorKey || event.source,
    provider: event.provider || event.source,
    source_type: event.sourceType,
    source_id: event.sourceId,
    source_parent_id: event.sourceParentId || event.threadId || null,
    event_type: event.eventType,
    occurred_at: event.occurredAt || event.receivedAt || null,
    observed_at: event.observedAt,
    actor: event.actor || event.from || null,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    category,
    content_preview: event.snippet || event.subject || null,
    metadata: event.metadata || {},
    dedupe_key: event.dedupeKey,
    trust_level: event.trustLevel || "untrusted_provider_content",
  };
}

async function isAutomaticallyEligible(input: { workspaceId: string; operatorKey: string; supabase: SupabaseAdmin }): Promise<boolean> {
  try {
    const operatorKey = input.operatorKey as OperatorKey;
    const [readiness, activation, eligibility] = await Promise.all([
      getOperatorReadiness({ workspaceId: input.workspaceId, operatorKey }),
      getOperatorActivationState({ workspaceId: input.workspaceId, operatorKey, supabase: input.supabase }),
      getWorkspaceExecutionEligibility(input.workspaceId, input.supabase),
    ]);
    return Boolean(
      activation?.activated &&
      eligibility.eligible &&
      readiness &&
      readiness.canRunManual &&
      (readiness.status === "ready" || readiness.status === "draft_only"),
    );
  } catch {
    return false;
  }
}

function candidateRow(candidate: SignalCandidate, status: "routed" | "suppressed") {
  return {
    id: candidate.id,
    signal_id: candidate.signalId,
    workspace_id: candidate.workspaceId,
    operator_key: candidate.operatorKey,
    signal_type: candidate.signalType,
    priority: candidate.priority ?? 0,
    confidence: candidate.confidence,
    urgency: candidate.urgency ?? "low",
    reason_codes: candidate.reasonCodes ?? [],
    evidence: candidate.evidence ?? {},
    recommended_action_types: candidate.recommendedActionTypes ?? [],
    dedupe_key: candidate.dedupeKey,
    status,
    last_seen_at: new Date().toISOString(),
  };
}

/**
 * Server-only batch ingestion. It accepts only events already derived from a
 * workspace-bound connector lookup; callers cannot use it as a browser event
 * injection endpoint. It deliberately produces no action and creates no
 * notification or Activity entry.
 */
export async function ingestSignalBatch(input: {
  workspaceId: string;
  events: SignalEvent[];
  supabase?: SupabaseAdmin;
}): Promise<SignalIngestionResult> {
  if (!input.workspaceId.trim()) throw new Error("Signal ingestion requires a workspace.");
  if (input.events.some((event) => event.workspaceId !== input.workspaceId)) {
    throw new Error("Rejected cross-workspace signal event.");
  }
  const supabase = input.supabase ?? createSupabaseAdmin();
  const routed = input.events.map((event) => routeSignalEvent(event));
  const events = routed.map((item) => item.event);
  if (events.length > 0) {
    const result = await supabase.from("os_signal_events").upsert(
      routed.map((item) => eventRow(item.event, item.decision.category)),
      { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true },
    );
    if (result.error) throw new Error(`Signal event persistence failed: ${result.error.message}`);
  }

  const candidates = routed.flatMap((item) => item.candidates);
  const routedByOperator = candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.operatorKey] = (counts[candidate.operatorKey] ?? 0) + 1;
    return counts;
  }, {});
  const eligibility = await Promise.all(candidates.map(async (candidate) => ({
    candidate,
    eligible: await isAutomaticallyEligible({ workspaceId: input.workspaceId, operatorKey: candidate.operatorKey, supabase }),
  })));
  const candidateRows = eligibility.map(({ candidate, eligible }) => candidateRow(candidate, eligible ? "routed" : "suppressed"));
  if (candidateRows.length > 0) {
    const result = await supabase.from("os_signal_candidates").upsert(candidateRows, { onConflict: "workspace_id,dedupe_key" });
    if (result.error) throw new Error(`Signal candidate persistence failed: ${result.error.message}`);
  }
  // A workflow is a durable, bounded response proposal. Its creation is
  // intentionally best-effort here: ingestion remains safe even if the
  // workflow migration has not reached a deployment yet. No step executes.
  await Promise.all(eligibility.filter((item) => item.eligible && candidateCanProposeWorkflow(item.candidate) && (item.candidate.priority ?? 0) >= 65).map(async ({ candidate }) => {
    try {
      await createWorkflowFromSignalCandidate({ workspaceId: input.workspaceId, signalId: candidate.signalId || "", candidate, supabase });
    } catch (error) {
      console.warn("[signal-engine] workflow planning skipped", { workspaceId: input.workspaceId, signalId: candidate.signalId, error: error instanceof Error ? error.message : "Unknown workflow planning error" });
    }
  }));
  const workflowCandidates = eligibility.filter((item) => item.eligible && candidateCanProposeWorkflow(item.candidate) && (item.candidate.priority ?? 0) >= 65).length;
  return {
    received: input.events.length,
    classified: routed.length,
    ignored: routed.filter((item) => item.decision.actionability === "IGNORE" || item.decision.suppressed).length,
    unknown: routed.filter((item) => item.decision.primaryIntent === "UNKNOWN").length,
    eventsPersisted: events.length,
    candidatesProduced: candidates.length,
    workflowCandidates,
    candidatesRouted: eligibility.filter((item) => item.eligible).length,
    candidatesSuppressed: eligibility.filter((item) => !item.eligible).length,
    routedByOperator,
    classificationFailures: routed.filter((item) => item.decision.classificationFailed === true).length,
  };
}

function candidateCanProposeWorkflow(candidate: SignalCandidate): boolean {
  if (candidate.confidence === "low") return false;
  return candidate.actionability === undefined || candidate.actionability === "WORKFLOW_CANDIDATE";
}

export async function claimSignalSyncLease(input: {
  workspaceId: string;
  connectorKey: string;
  leaseToken: string;
  leaseSeconds?: number;
  supabase?: SupabaseAdmin;
}): Promise<boolean> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const result = await supabase.rpc("claim_os_signal_sync_lease", {
    p_workspace_id: input.workspaceId,
    p_connector_key: input.connectorKey,
    p_lease_token: input.leaseToken,
    p_lease_seconds: input.leaseSeconds ?? 120,
  });
  if (result.error) throw new Error(`Could not claim signal sync lease: ${result.error.message}`);
  return result.data === true;
}

/** Cursor checkpointing happens only after successful ingestion. */
export async function persistSignalCursor(input: {
  workspaceId: string;
  connectorKey: string;
  leaseToken: string;
  cursor: Record<string, unknown>;
  supabase?: SupabaseAdmin;
}): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const result = await supabase
    .from("os_signal_sync_state")
    .update({ cursor: input.cursor, last_success_at: new Date().toISOString(), last_failure_code: null, lease_token: null, lease_until: null })
    .eq("workspace_id", input.workspaceId)
    .eq("connector_key", input.connectorKey)
    .eq("lease_token", input.leaseToken);
  if (result.error) throw new Error(`Could not persist signal cursor: ${result.error.message}`);
}
