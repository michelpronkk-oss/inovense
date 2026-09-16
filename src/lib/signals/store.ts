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
  internalRecommendationWorkflowIds: string[];
  internalRecommendationDispatchFailures: number;
  candidatesRouted: number;
  candidatesSuppressed: number;
  routedByOperator: Record<string, number>;
  classificationFailures: number;
  /** Every candidate produced by this batch with the persisted status that
   * was actually written to os_signal_candidates. Callers that need to know
   * whether a specific operator's candidate is live (not merely proposed)
   * before triggering operator-specific materialization should read this
   * instead of re-deriving eligibility themselves. */
  candidates: Array<{ candidate: SignalCandidate; status: "routed" | "suppressed" }>;
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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function slackIdentity(event: SignalEvent): { teamId: string; channelId: string; messageTs: string } | null {
  if (event.connectorKey !== "slack" || event.sourceType !== "slack_message") return null;
  const metadata = event.metadata ?? {};
  const origin = objectValue(metadata.slackOrigin);
  const teamId = typeof metadata.teamId === "string" ? metadata.teamId : origin.teamId;
  const channelId = typeof metadata.channelId === "string" ? metadata.channelId : origin.channelId;
  const messageTs = typeof metadata.messageTs === "string" ? metadata.messageTs : origin.messageTs;
  if (typeof teamId !== "string" || typeof channelId !== "string" || typeof messageTs !== "string") return null;
  return { teamId, channelId, messageTs };
}

function isMentionEvent(eventType: unknown, metadata: Record<string, unknown>): boolean {
  return eventType === "slack.app_mentioned" || metadata.slackAppMentioned === true;
}

/**
 * Persists one monotonic canonical signal. Slack's two subscriptions have
 * different provider event IDs, so duplicate-ignore upsert alone cannot
 * upgrade a passive signal to an app mention. Existing rows are first found
 * by stable Slack message identity and then merged in place.
 */
async function persistCanonicalSignal(input: { routed: ReturnType<typeof routeSignalEvent>; supabase: SupabaseAdmin }): Promise<string> {
  const event = input.routed.event;
  const row = eventRow(event, input.routed.decision.category);
  const identity = slackIdentity(event);
  let existing: { id: string; event_type: string; metadata: Record<string, unknown>; dedupe_key: string } | null = null;
  if (identity) {
    const result = await input.supabase.from("os_signal_events")
      .select("id,event_type,metadata,dedupe_key")
      .eq("workspace_id", event.workspaceId)
      .eq("connector_key", "slack")
      .eq("source_type", "slack_message")
      .eq("source_id", identity.messageTs)
      .limit(20);
    if (result.error) throw new Error(`Signal identity lookup failed: ${result.error.message}`);
    const found = (result.data ?? []).find((candidate) => {
      const metadata = objectValue(candidate.metadata);
      const origin = objectValue(metadata.slackOrigin);
      return (metadata.teamId ?? origin.teamId) === identity.teamId && (metadata.channelId ?? origin.channelId) === identity.channelId;
    });
    if (found) existing = { id: String(found.id), event_type: String(found.event_type), metadata: objectValue(found.metadata), dedupe_key: String(found.dedupe_key) };
  } else {
    const result = await input.supabase.from("os_signal_events").select("id,event_type,metadata,dedupe_key").eq("workspace_id", event.workspaceId).eq("dedupe_key", row.dedupe_key).maybeSingle();
    if (result.error) throw new Error(`Signal identity lookup failed: ${result.error.message}`);
    if (result.data) existing = { id: String(result.data.id), event_type: String(result.data.event_type), metadata: objectValue(result.data.metadata), dedupe_key: String(result.data.dedupe_key) };
  }

  if (!existing) {
    const inserted = await input.supabase.from("os_signal_events").upsert(row, { onConflict: "workspace_id,dedupe_key", ignoreDuplicates: true });
    if (inserted.error) throw new Error(`Signal event persistence failed: ${inserted.error.message}`);
    // A concurrent paired delivery may have won the insert race. Resolve the
    // row again by stable identity and apply the same monotonic merge below.
    if (identity) {
      const reread = await input.supabase.from("os_signal_events").select("id,event_type,metadata,dedupe_key").eq("workspace_id", event.workspaceId).eq("connector_key", "slack").eq("source_type", "slack_message").eq("source_id", identity.messageTs).limit(20);
      if (reread.error) throw new Error(`Signal identity lookup failed: ${reread.error.message}`);
      const found = (reread.data ?? []).find((candidate) => { const metadata = objectValue(candidate.metadata); const origin = objectValue(metadata.slackOrigin); return (metadata.teamId ?? origin.teamId) === identity.teamId && (metadata.channelId ?? origin.channelId) === identity.channelId; });
      if (found) existing = { id: String(found.id), event_type: String(found.event_type), metadata: objectValue(found.metadata), dedupe_key: String(found.dedupe_key) };
    } else {
      const reread = await input.supabase.from("os_signal_events").select("id,event_type,metadata,dedupe_key").eq("workspace_id", event.workspaceId).eq("dedupe_key", row.dedupe_key).maybeSingle();
      if (reread.error) throw new Error(`Signal identity lookup failed: ${reread.error.message}`);
      if (reread.data) existing = { id: String(reread.data.id), event_type: String(reread.data.event_type), metadata: objectValue(reread.data.metadata), dedupe_key: String(reread.data.dedupe_key) };
    }
  }
  if (!existing) throw new Error("Signal persistence race could not be reconciled.");

  const mention = Boolean(identity) && (isMentionEvent(existing.event_type, existing.metadata) || isMentionEvent(row.event_type, objectValue(row.metadata)));
  const incomingMetadata = objectValue(row.metadata);
  const mergedMetadata = identity
    ? {
        ...existing.metadata,
        ...incomingMetadata,
        slackAppMentioned: mention,
        ...(mention ? {
          sourceProviderEventId: row.event_type === "slack.app_mentioned"
            ? incomingMetadata.sourceProviderEventId
            : existing.metadata.sourceProviderEventId,
        } : {}),
      }
    : { ...existing.metadata, ...incomingMetadata };
  const merged = {
    ...row,
    id: existing.id,
    dedupe_key: existing.dedupe_key,
    event_type: identity && mention ? "slack.app_mentioned" : existing.event_type,
    metadata: mergedMetadata,
  };
  const updated = await input.supabase.from("os_signal_events").update(merged).eq("workspace_id", event.workspaceId).eq("id", existing.id);
  if (updated.error) throw new Error(`Signal event merge failed: ${updated.error.message}`);
  return existing.id;
}

function candidatePriority(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function confidenceRank(value: unknown): number {
  return value === "high" ? 3 : value === "medium" ? 2 : 1;
}

async function persistCandidateMonotonic(input: { candidate: SignalCandidate; status: "routed" | "suppressed"; supabase: SupabaseAdmin }): Promise<void> {
  const incoming = candidateRow(input.candidate, input.status);
  const current = await input.supabase.from("os_signal_candidates").select("id,priority,confidence,reason_codes,evidence,recommended_action_types,status").eq("workspace_id", input.candidate.workspaceId).eq("dedupe_key", input.candidate.dedupeKey).maybeSingle();
  if (current.error) throw new Error(`Signal candidate lookup failed: ${current.error.message}`);
  const existing = current.data;
  const priority = Math.max(candidatePriority(existing?.priority), candidatePriority(incoming.priority));
  const reasonCodes = Array.from(new Set([
    ...(Array.isArray(existing?.reason_codes) ? existing.reason_codes.filter((value): value is string => typeof value === "string") : []),
    ...(Array.isArray(incoming.reason_codes) ? incoming.reason_codes.filter((value): value is string => typeof value === "string") : []),
  ])).slice(0, 30);
  const recommended = Array.from(new Set([
    ...(Array.isArray(existing?.recommended_action_types) ? existing.recommended_action_types.filter((value): value is string => typeof value === "string") : []),
    ...(Array.isArray(incoming.recommended_action_types) ? incoming.recommended_action_types.filter((value): value is string => typeof value === "string") : []),
  ])).slice(0, 20);
  const existingStatus = typeof existing?.status === "string" ? existing.status : null;
  const status = ["processing", "surfaced", "action_proposed", "resolved", "expired"].includes(existingStatus ?? "")
    ? existingStatus
    : existingStatus === "routed" || input.status === "routed" ? "routed" : input.status;
  const merged = {
    ...incoming,
    id: existing?.id ? String(existing.id) : incoming.id,
    priority,
    confidence: confidenceRank(existing?.confidence) >= confidenceRank(incoming.confidence) ? existing?.confidence ?? incoming.confidence : incoming.confidence,
    reason_codes: reasonCodes,
    evidence: { ...objectValue(existing?.evidence), ...objectValue(incoming.evidence) },
    recommended_action_types: recommended,
    status,
  };
  // Workflow planning below must use the canonical merged priority/reasons,
  // not a lower-priority passive delivery that happened to arrive later.
  input.candidate.priority = priority;
  input.candidate.reasonCodes = reasonCodes;
  input.candidate.recommendedActionTypes = recommended;
  const result = await input.supabase.from("os_signal_candidates").upsert(merged, { onConflict: "workspace_id,dedupe_key" });
  if (result.error) throw new Error(`Signal candidate persistence failed: ${result.error.message}`);
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
  /** Direct operator scans may persist canonical signals before they attach a
   * provider-specific action/workflow. This prevents a second generic
   * workflow from being materialized for the same signal. */
  materializeWorkflows?: boolean;
}): Promise<SignalIngestionResult> {
  if (!input.workspaceId.trim()) throw new Error("Signal ingestion requires a workspace.");
  if (input.events.some((event) => event.workspaceId !== input.workspaceId)) {
    throw new Error("Rejected cross-workspace signal event.");
  }
  const supabase = input.supabase ?? createSupabaseAdmin();
  const routed = input.events.map((event) => routeSignalEvent(event));
  const canonicalSignalIds = await Promise.all(routed.map((item) => persistCanonicalSignal({ routed: item, supabase })));
  routed.forEach((item, index) => {
    item.event.id = canonicalSignalIds[index];
    item.candidates.forEach((candidate) => { candidate.signalId = canonicalSignalIds[index]; });
  });
  const events = routed.map((item) => item.event);

  const candidates = routed.flatMap((item) => item.candidates);
  const routedByOperator = candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.operatorKey] = (counts[candidate.operatorKey] ?? 0) + 1;
    return counts;
  }, {});
  const eligibility = await Promise.all(candidates.map(async (candidate) => ({
    candidate,
    eligible: await isAutomaticallyEligible({ workspaceId: input.workspaceId, operatorKey: candidate.operatorKey, supabase }),
  })));
  await Promise.all(eligibility.map(({ candidate, eligible }) => persistCandidateMonotonic({ candidate, status: eligible ? "routed" : "suppressed", supabase })));
  // A workflow is a durable, bounded response proposal. Its creation is
  // intentionally best-effort here: ingestion remains safe even if the
  // workflow migration has not reached a deployment yet. No step executes.
  const shouldMaterializeWorkflows = input.materializeWorkflows !== false;
  const workflowResults = await Promise.all(eligibility.filter((item) => shouldMaterializeWorkflows && item.eligible && candidateCanProposeWorkflow(item.candidate) && (item.candidate.priority ?? 0) >= 65).map(async ({ candidate }) => {
    try {
      return await createWorkflowFromSignalCandidate({ workspaceId: input.workspaceId, signalId: candidate.signalId || "", candidate, supabase });
    } catch (error) {
      console.warn("[signal-engine] workflow planning skipped", { workspaceId: input.workspaceId, signalId: candidate.signalId, error: error instanceof Error ? error.message : "Unknown workflow planning error" });
      return { created: false };
    }
  }));
  const internalRecommendationWorkflowIds = workflowResults.filter((result) => result.created && result.actionTypes?.includes("prepare_internal_recommendation") && result.workflowId).map((result) => result.workflowId as string);
  const internalRecommendationDispatchFailures = workflowResults.filter((result) => result.internalRecommendationDispatchFailed === true).length;
  const workflowCandidates = shouldMaterializeWorkflows ? eligibility.filter((item) => item.eligible && candidateCanProposeWorkflow(item.candidate) && (item.candidate.priority ?? 0) >= 65).length : 0;
  return {
    received: input.events.length,
    classified: routed.length,
    ignored: routed.filter((item) => item.decision.actionability === "IGNORE" || item.decision.suppressed).length,
    unknown: routed.filter((item) => item.decision.primaryIntent === "UNKNOWN").length,
    eventsPersisted: events.length,
    candidatesProduced: candidates.length,
    workflowCandidates,
    internalRecommendationWorkflowIds,
    internalRecommendationDispatchFailures,
    candidatesRouted: eligibility.filter((item) => item.eligible).length,
    candidatesSuppressed: eligibility.filter((item) => !item.eligible).length,
    routedByOperator,
    classificationFailures: routed.filter((item) => item.decision.classificationFailed === true).length,
    candidates: eligibility.map(({ candidate, eligible }) => ({ candidate, status: eligible ? "routed" as const : "suppressed" as const })),
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
