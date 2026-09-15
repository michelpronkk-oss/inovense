import "server-only";

import type { SignalCandidate } from "@/lib/signals/types";
import { connectorCandidateDedupeKey } from "@/lib/signals/engine";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function safeId(value: string, max = 200): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, max);
}

export type HubSpotClientFlowHandoffInput = {
  supabase: SupabaseAdmin;
  workspaceId: string;
  dealId: string;
  portalId: string;
  candidate: SignalCandidate;
  dealName: string;
  amount: number | null;
  currency: string | null;
  dealstage: string | null;
};

/**
 * The durable transition from a routed Client Flow HubSpot candidate to
 * visible current work. One row per deal: the id is deterministic from the
 * workspace and deal, so a replayed webhook or a concurrent dealstage +
 * closedate delivery both converge on the same row instead of creating a
 * second card.
 */
export async function ensureHubSpotClientFlowHandoff(input: HubSpotClientFlowHandoffInput): Promise<{ runId: string; created: boolean }> {
  const runId = safeId(`oprun-clientflow-hubspot-${input.workspaceId}-${input.dealId}`);
  const now = new Date().toISOString();
  const output = {
    type: "hubspot_client_handoff",
    title: input.dealName,
    provider: "hubspot",
    dealId: input.dealId,
    portalId: input.portalId,
    amount: input.amount,
    currency: input.currency,
    stage: input.dealstage,
    status: "closed_won",
    recommendedActionTypes: input.candidate.recommendedActionTypes?.length ? input.candidate.recommendedActionTypes : ["review", "prepare_recommendation"],
    signalId: input.candidate.signalId ?? null,
  };

  const existing = await input.supabase.from("os_operator_runs").select("id").eq("id", runId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (existing.error) throw new Error(`Client Flow HubSpot handoff lookup failed: ${existing.error.message}`);
  if (existing.data) {
    const update = await input.supabase.from("os_operator_runs").update({ output, status: "completed", updated_at: now }).eq("id", runId).eq("workspace_id", input.workspaceId);
    if (update.error) throw new Error(`Client Flow HubSpot handoff refresh failed: ${update.error.message}`);
    return { runId, created: false };
  }

  const insert = await input.supabase.from("os_operator_runs").insert({
    id: runId,
    workspace_id: input.workspaceId,
    operator_key: "client_flow",
    trigger_type: "hubspot_deal_closed_won",
    status: "completed",
    input: { dealId: input.dealId, provider: "hubspot" },
    output,
    readiness: {},
    risk_level: "low",
    started_at: now,
    completed_at: now,
    created_at: now,
  });
  if (insert.error) {
    // Unique-violation means a concurrent HubSpot webhook (e.g. a dealstage
    // and a closedate property change racing each other) already created
    // this exact row - that is the intended single-handoff outcome, not a
    // failure.
    if (insert.error.code === "23505") return { runId, created: false };
    throw new Error(`Client Flow HubSpot handoff creation failed: ${insert.error.message}`);
  }
  return { runId, created: true };
}

/**
 * Once a deal transitions to Closed Won and Client Flow takes ownership, the
 * earlier Revenue "sales_opportunity" candidate for the same deal no longer
 * describes active work - it resolves it using the existing candidate
 * lifecycle (os_signal_candidates.status already supports "resolved") rather
 * than leaving it to read as simultaneous, competing active work.
 */
export async function resolveSupersededHubSpotRevenueCandidate(input: { supabase: SupabaseAdmin; workspaceId: string; dealId: string }): Promise<void> {
  const dedupeKey = connectorCandidateDedupeKey({ workspaceId: input.workspaceId, operatorKey: "revenue", connectorKey: "hubspot", sourceId: input.dealId, category: "sales_opportunity" });
  const result = await input.supabase
    .from("os_signal_candidates")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("workspace_id", input.workspaceId)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "routed");
  if (result.error) throw new Error(`Revenue candidate supersession failed: ${result.error.message}`);
}
