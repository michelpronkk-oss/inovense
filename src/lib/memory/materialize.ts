import { memoryStaleAfter, type MemoryRow } from "@/lib/memory/model";
import type { MemoryCategory, MemorySourceType } from "@/lib/os/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ConnectorObservation = {
  connectorKey: string;
  displayName: string;
  accountRef?: string | null;
  observedAt?: string;
  sourceRef?: string | null;
  operatorRelevance?: string[];
  category?: MemoryCategory;
};

export function connectorObservationsFromTruth(rows: Array<{ connectorKey: string; displayName: string; status: string; accountEmail?: string | null; connectedAt?: string | null }>, operatorKey: string): ConnectorObservation[] {
  return rows
    .filter((row) => row.status === "connected" || row.status === "healthy")
    .map((row) => ({
      connectorKey: row.connectorKey,
      displayName: row.displayName,
      accountRef: row.accountEmail ?? "workspace",
      sourceRef: `connector:${row.connectorKey}:verified-connection`,
      operatorRelevance: [operatorKey],
      category: /zendesk|intercom|support/i.test(row.connectorKey) ? "support" : /asana|jira|trello|project/i.test(row.connectorKey) ? "delivery" : /gmail|microsoft|slack|teams/i.test(row.connectorKey) ? "operating_rules" : "commercial",
    }));
}

export type MemoryVersionInput = {
  workspaceId: string;
  canonicalKey: string;
  category: MemoryCategory;
  label: string;
  summary: string;
  content: string;
  sourceType: MemorySourceType;
  sourceLabel: string;
  sourceRef?: string | null;
  sourceConnector?: string | null;
  sourceEntityId?: string | null;
  evidence?: string[];
  observedAt?: string;
  staleAfter?: string | null;
  lastConfirmedAt?: string | null;
  confidence?: "low" | "medium" | "high" | null;
  operatorRelevance?: string[];
  policyRelevant?: boolean;
  supersedesId?: string | null;
  reliability?: "verified" | "observed" | "derived" | "missing" | "stale";
};

function clean(value: string | null | undefined, max: number): string | null {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function list(values: string[] | undefined, maxItems: number, maxLength: number): string[] {
  return (values ?? []).map((value) => clean(value, maxLength)).filter((value): value is string => Boolean(value)).slice(0, maxItems);
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function memoryId(input: MemoryVersionInput, content: string): string {
  return `mem-${hash(`${input.workspaceId}|${input.canonicalKey}|${input.sourceType}|${input.sourceConnector ?? ""}|${input.sourceEntityId ?? ""}|${content}`)}`;
}

function rowContent(row: Partial<MemoryRow>): string {
  return (typeof row.content === "string" ? row.content : "").trim().replace(/\s+/g, " ");
}

/** Append one governed version while refreshing identical observations in place. */
export async function appendMemoryVersion(input: { supabase: SupabaseAdmin; memory: MemoryVersionInput }): Promise<{ id: string; created: boolean; refreshed: boolean }> {
  const memory = input.memory;
  const content = clean(memory.content, 1200);
  if (!content) throw new Error("Memory content is required.");
  const observedAt = memory.observedAt ?? new Date().toISOString();
  const sourceConnector = clean(memory.sourceConnector, 80);
  const sourceEntityId = clean(memory.sourceEntityId, 180);
  const existing = await input.supabase.from("os_memory_entries")
    .select("id,content,source_type,source_connector,source_entity_id,canonical_key,operator_relevance,updated_at")
    .eq("workspace_id", memory.workspaceId)
    .eq("canonical_key", memory.canonicalKey)
    .eq("source_type", memory.sourceType)
    .eq("source_connector", sourceConnector)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (existing.error) throw new Error(existing.error.message);
  const rows = (existing.data ?? []) as Partial<MemoryRow>[];
  const same = rows.find((row) => rowContent(row) === content && (row.source_entity_id ?? null) === sourceEntityId);
  const staleAfter = memory.staleAfter === undefined ? memoryStaleAfter(memory.category, memory.sourceType, observedAt) : memory.staleAfter;
  if (same?.id) {
    const existingOperators = Array.isArray(same.operator_relevance) ? same.operator_relevance.filter((item): item is string => typeof item === "string") : [];
    const refreshed = await input.supabase.from("os_memory_entries").update({
      last_observed_at: observedAt,
      stale_after: staleAfter,
      evidence: list(memory.evidence, 10, 240),
      operator_relevance: list(Array.from(new Set([...existingOperators, ...(memory.operatorRelevance ?? [])])), 6, 40),
      updated_at: observedAt,
    }).eq("id", same.id).eq("workspace_id", memory.workspaceId);
    if (refreshed.error) throw new Error(refreshed.error.message);
    return { id: String(same.id), created: false, refreshed: true };
  }
  const previous = rows.find((row) => (row.source_entity_id ?? null) === sourceEntityId);
  const id = memoryId(memory, content);
  const payload = {
    id,
    workspace_id: memory.workspaceId,
    type: "process",
    canonical_key: memory.canonicalKey,
    category: memory.category,
    label: clean(memory.label, 160) ?? "Business context",
    summary: clean(memory.summary, 300) ?? "Observed business context.",
    content,
    tags: ["connector-observed", ...(sourceConnector ? [sourceConnector] : [])],
    agent_scope: list(memory.operatorRelevance, 6, 40),
    field_count: 1,
    source_type: memory.sourceType,
    source_label: clean(memory.sourceLabel, 160),
    source_ref: clean(memory.sourceRef, 240),
    source_connector: sourceConnector,
    source_entity_id: sourceEntityId,
    reliability: memory.reliability ?? "observed",
    confidence: memory.confidence ?? "medium",
    first_observed_at: observedAt,
    last_observed_at: observedAt,
    last_confirmed_at: memory.lastConfirmedAt ?? null,
    stale_after: staleAfter,
    operator_relevance: list(memory.operatorRelevance, 6, 40),
    policy_relevant: memory.policyRelevant === true,
    evidence: list(memory.evidence, 10, 240),
    supersedes_id: memory.supersedesId ?? previous?.id ?? null,
    updated_at: observedAt,
  };
  const inserted = await input.supabase.from("os_memory_entries").upsert(payload, { onConflict: "id" });
  if (inserted.error) throw new Error(inserted.error.message);
  return { id, created: true, refreshed: false };
}

/** Materialize only bounded connector identity/configuration facts, never records or payloads. */
export async function materializeConnectorObservations(input: { supabase: SupabaseAdmin; workspaceId: string; observations: ConnectorObservation[]; trigger: string }): Promise<{ created: number; refreshed: number; errors: string[] }> {
  let created = 0;
  let refreshed = 0;
  const errors: string[] = [];
  for (const observation of input.observations.slice(0, 20)) {
    const observedAt = observation.observedAt ?? new Date().toISOString();
    try {
      const result = await appendMemoryVersion({
        supabase: input.supabase,
        memory: {
          workspaceId: input.workspaceId,
          canonicalKey: `connector.${observation.connectorKey}.identity`,
          category: observation.category ?? "operating_rules",
          label: `${observation.displayName} connection`,
          summary: `${observation.displayName} is connected and available as workspace context.`,
          content: `Connected system: ${observation.displayName}.`,
          sourceType: "connector_observed",
          sourceLabel: `${observation.displayName} connection metadata`,
          sourceRef: observation.sourceRef ?? `connector:${observation.connectorKey}:${input.trigger}`,
          sourceConnector: observation.connectorKey,
          sourceEntityId: observation.accountRef ?? "workspace",
          evidence: [`connector:${observation.connectorKey}`, `trigger:${input.trigger}`],
          observedAt,
          operatorRelevance: observation.operatorRelevance ?? [],
          policyRelevant: false,
          reliability: "observed",
        },
      });
      if (result.created) created += 1;
      if (result.refreshed) refreshed += 1;
    } catch (error) {
      errors.push(`${observation.connectorKey}: ${error instanceof Error ? error.message : "materialization failed"}`);
    }
  }
  if (errors.length) {
    await input.supabase.from("os_execution_logs").insert({
      id: `memory-materialization-${hash(`${input.workspaceId}|${input.trigger}|${Date.now()}`)}`,
      ts: new Date().toISOString(),
      run_id: `memory:${input.workspaceId}`,
      agent_id: "memory",
      agent_mark: "MM",
      agent_color: "#4DE8E1",
      event: "memory_materialization_failed",
      message: "Non-critical connector Memory materialization failed for one or more observations.",
      duration: "-",
      status: "warn",
    });
  }
  return { created, refreshed, errors };
}
