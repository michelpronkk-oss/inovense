import type { MemoryEntry } from "@/lib/os/types";
import { memoryDependenciesForEntries, memoryDependencyFingerprint, normalizeMemoryRow, resolveMemoryFacts, type MemoryDependency, type MemoryRow } from "@/lib/memory/model";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const EXTENDED_SELECT = "id,type,category,canonical_key,label,summary,content,tags,agent_scope,field_count,source_type,source_label,source_ref,source_connector,source_entity_id,reliability,confidence,first_observed_at,last_observed_at,last_confirmed_at,stale_after,operator_relevance,policy_relevant,evidence,supersedes_id,updated_at";

export type GovernedMemoryContext = {
  items: MemoryEntry[];
  dependencies: MemoryDependency[];
  keysUsed: string[];
  attentionCount: number;
};

async function readRows(supabase: SupabaseAdmin, workspaceId: string): Promise<MemoryRow[]> {
  const extended = await supabase.from("os_memory_entries").select(EXTENDED_SELECT).eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
  if (!extended.error) return (extended.data ?? []) as MemoryRow[];
  const legacy = await supabase.from("os_memory_entries").select("id,type,label,summary,content,tags,agent_scope,field_count,updated_at").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
  return (legacy.data ?? []) as MemoryRow[];
}

/** Read the canonical workspace context without granting it authority over provider truth. */
export async function loadGovernedMemoryContext(input: { supabase: SupabaseAdmin; workspaceId: string; operatorKey?: string }): Promise<GovernedMemoryContext> {
  const allEntries = (await readRows(input.supabase, input.workspaceId)).map((row) => normalizeMemoryRow(row));
  const resolved = resolveMemoryFacts(allEntries);
  const relevant = input.operatorKey
    ? resolved.filter((fact) => !fact.effective?.operatorRelevance?.length || fact.effective.operatorRelevance.includes(input.operatorKey ?? ""))
    : resolved;
  const items = relevant.flatMap((fact) => fact.effective ? [fact.effective] : []);
  const dependencies = memoryDependenciesForEntries(items);
  return {
    items,
    dependencies,
    keysUsed: items.map((entry) => `os_memory_entries:${entry.id}`),
    attentionCount: items.filter((entry) => entry.reliability === "stale" || entry.conflict || entry.reliability === "missing").length,
  };
}

export async function loadCurrentMemoryDependencies(input: { supabase: SupabaseAdmin; workspaceId: string; dependencies: MemoryDependency[] }): Promise<MemoryDependency[]> {
  if (!input.dependencies.length) return [];
  const allEntries = (await readRows(input.supabase, input.workspaceId)).map((row) => normalizeMemoryRow(row));
  const facts = resolveMemoryFacts(allEntries);
  return input.dependencies.map((dependency) => {
    const fact = facts.find((candidate) => candidate.canonicalKey === dependency.canonicalKey);
    const effective = fact?.effective;
    return effective ? memoryDependenciesForEntries([{ ...effective, policyRelevant: true }])[0] : { ...dependency, id: "missing", valueFingerprint: "missing", reliability: "missing", freshness: "unknown", conflict: false };
  });
}

export { memoryDependencyFingerprint };
