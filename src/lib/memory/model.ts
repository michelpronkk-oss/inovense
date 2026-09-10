import type { MemoryCategory, MemoryEntry, MemoryFreshness, MemorySourceType } from "@/lib/os/types";

export type MemoryReliability = NonNullable<MemoryEntry["reliability"]>;

type UnknownRecord = Record<string, unknown>;

export type MemoryRow = {
  id: string;
  type?: string | null;
  category?: string | null;
  canonical_key?: string | null;
  label: string;
  summary: string;
  content: string;
  tags?: unknown;
  agent_scope?: unknown;
  field_count?: number | null;
  source_type?: string | null;
  source_label?: string | null;
  source_ref?: string | null;
  source_connector?: string | null;
  source_entity_id?: string | null;
  reliability?: string | null;
  confidence?: string | null;
  first_observed_at?: string | null;
  last_observed_at?: string | null;
  last_confirmed_at?: string | null;
  stale_after?: string | null;
  operator_relevance?: unknown;
  policy_relevant?: boolean | null;
  evidence?: unknown;
  supersedes_id?: string | null;
  metadata?: unknown;
  updated_at: string;
};

export type MemoryDependency = {
  id: string;
  canonicalKey: string;
  valueFingerprint: string;
  reliability: MemoryReliability;
  freshness: MemoryFreshness;
  source: string;
  conflict: boolean;
};

export type ResolvedMemoryFact = {
  canonicalKey: string;
  effective: MemoryEntry | null;
  alternates: MemoryEntry[];
  reason: string;
};

const CATEGORIES: MemoryCategory[] = ["business", "commercial", "customers", "delivery", "support", "operating_rules"];
const SOURCES: MemorySourceType[] = ["owner_confirmed", "connector_observed", "derived"];
const RELIABILITIES: MemoryReliability[] = ["verified", "observed", "derived", "missing", "stale"];
const CONFIDENCES = ["low", "medium", "high"] as const;

// Freshness is domain-aware because a deal or ticket cannot use the same age
// window as a company website or an operating preference.
const FRESHNESS_DAYS: Record<MemoryCategory, number> = {
  business: 180,
  commercial: 14,
  customers: 30,
  delivery: 7,
  support: 3,
  operating_rules: 90,
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

function legacyCategory(type: string | null, tags: string[]): MemoryCategory {
  if (tags.includes("support") || tags.includes("sla")) return "support";
  if (tags.includes("delivery") || tags.includes("project")) return "delivery";
  if (tags.includes("crm") || tags.includes("revenue")) return "commercial";
  if (type === "client") return "customers";
  if (type === "market") return "commercial";
  if (type === "brand" || type === "product") return "business";
  return "operating_rules";
}

function legacySource(row: MemoryRow, metadata: UnknownRecord, tags: string[]): MemorySourceType {
  const explicit = oneOf(row.source_type ?? metadata.sourceType, SOURCES);
  if (explicit) return explicit;
  if (tags.includes("approved-learning") || row.type === "agent") return "derived";
  return row.id.startsWith("mem-onboarding-") || tags.includes("onboarding") ? "owner_confirmed" : "derived";
}

function legacyReliability(row: MemoryRow, metadata: UnknownRecord, sourceType: MemorySourceType): MemoryReliability {
  const explicit = oneOf(row.reliability ?? metadata.reliability, RELIABILITIES);
  if (explicit) return explicit;
  return sourceType === "owner_confirmed" ? "verified" : sourceType === "connector_observed" ? "observed" : "derived";
}

function sourceLabel(sourceType: MemorySourceType, row: MemoryRow, metadata: UnknownRecord): string {
  return string(row.source_label ?? metadata.sourceLabel)
    ?? (sourceType === "owner_confirmed" ? "Owner-confirmed" : sourceType === "connector_observed" ? "Connected system" : "Derived from evidence");
}

function staleAfterFor(row: MemoryRow, category: MemoryCategory, sourceType: MemorySourceType, metadata: UnknownRecord): string | null {
  const explicit = string(row.stale_after ?? metadata.staleAfter);
  if (explicit) return explicit;
  const anchor = row.last_observed_at ?? row.last_confirmed_at ?? row.updated_at;
  const timestamp = Date.parse(anchor);
  if (!Number.isFinite(timestamp)) return null;
  const days = sourceType === "owner_confirmed" ? FRESHNESS_DAYS[category] * 2 : FRESHNESS_DAYS[category];
  return new Date(timestamp + days * 86_400_000).toISOString();
}

export function memoryStaleAfter(category: MemoryCategory, sourceType: MemorySourceType, observedAt: string): string | null {
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) return null;
  const days = sourceType === "owner_confirmed" ? FRESHNESS_DAYS[category] * 2 : FRESHNESS_DAYS[category];
  return new Date(timestamp + days * 86_400_000).toISOString();
}

export function memoryFreshness(staleAfter: string | null | undefined, reliability: MemoryReliability, now = Date.now()): MemoryFreshness {
  if (reliability === "missing") return "unknown";
  if (reliability === "stale") return "stale";
  if (!staleAfter) return "unknown";
  const timestamp = Date.parse(staleAfter);
  return Number.isFinite(timestamp) && timestamp <= now ? "stale" : "fresh";
}

export function normalizeMemoryRow(row: MemoryRow, now = Date.now()): MemoryEntry {
  const metadata = record(row.metadata);
  const tags = strings(row.tags);
  const agentScope = strings(row.agent_scope);
  const category = oneOf(row.category ?? metadata.category, CATEGORIES) ?? legacyCategory(row.type ?? null, tags);
  const sourceType = legacySource(row, metadata, tags);
  const staleAfter = staleAfterFor(row, category, sourceType, metadata);
  const baseReliability = legacyReliability(row, metadata, sourceType);
  const freshness = memoryFreshness(staleAfter, baseReliability, now);
  const reliability = freshness === "stale" && baseReliability !== "missing" ? "stale" : baseReliability;
  const evidence = strings(row.evidence ?? metadata.evidence);
  const operatorRelevance = strings(row.operator_relevance ?? metadata.operatorRelevance ?? agentScope);
  return {
    id: row.id,
    type: oneOf(row.type, ["client", "brand", "process", "market", "product", "agent"] as const) ?? "process",
    label: row.label,
    summary: row.summary,
    content: row.content,
    tags,
    agentScope,
    fieldCount: typeof row.field_count === "number" ? row.field_count : 0,
    updatedAt: row.updated_at,
    canonicalKey: string(row.canonical_key ?? metadata.canonicalKey) ?? row.id,
    category,
    sourceType,
    sourceLabel: sourceLabel(sourceType, row, metadata),
    sourceRef: string(row.source_ref ?? metadata.sourceRef),
    sourceConnector: string(row.source_connector ?? metadata.sourceConnector),
    sourceEntityId: string(row.source_entity_id ?? metadata.sourceEntityId),
    reliability,
    confidence: oneOf(row.confidence ?? metadata.confidence, CONFIDENCES),
    firstObservedAt: string(row.first_observed_at ?? metadata.firstObservedAt) ?? row.updated_at,
    lastObservedAt: string(row.last_observed_at ?? metadata.lastObservedAt),
    lastConfirmedAt: string(row.last_confirmed_at ?? metadata.lastConfirmedAt),
    staleAfter,
    freshness,
    operatorRelevance,
    policyRelevant: row.policy_relevant === true || metadata.policyRelevant === true,
    evidence,
    conflict: metadata.conflict === true,
    supersedesId: string(row.supersedes_id ?? metadata.supersedesId),
  };
}

export function memorySourceRank(entry: Pick<MemoryEntry, "reliability" | "freshness">): number {
  const reliability = entry.freshness === "stale" ? "stale" : entry.reliability;
  return reliability === "verified" ? 5 : reliability === "observed" ? 4 : reliability === "derived" ? 3 : reliability === "stale" ? 2 : 1;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value) ?? "null";
  return `{${Object.keys(value as UnknownRecord).sort().map((key) => `${JSON.stringify(key)}:${stable((value as UnknownRecord)[key])}`).join(",")}}`;
}

export function memoryValueFingerprint(entry: Pick<MemoryEntry, "content" | "reliability" | "freshness" | "conflict">): string {
  const input = stable({ content: entry.content.trim().replace(/\s+/g, " "), reliability: entry.reliability, freshness: entry.freshness, conflict: entry.conflict });
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mem-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function memoryDependenciesForEntries(entries: MemoryEntry[]): MemoryDependency[] {
  return entries
    .filter((entry) => entry.policyRelevant)
    .map((entry) => ({
      id: entry.id,
      canonicalKey: entry.canonicalKey ?? entry.id,
      valueFingerprint: memoryValueFingerprint(entry),
      reliability: entry.reliability ?? "missing",
      freshness: entry.freshness ?? "unknown",
      source: entry.sourceConnector ?? entry.sourceLabel ?? entry.sourceType ?? "unknown",
      conflict: entry.conflict === true,
    }));
}

export function memoryDependencyFingerprint(dependencies: MemoryDependency[]): string | null {
  if (!dependencies.length) return null;
  return memoryValueFingerprint({
    content: stable(dependencies.slice().sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey))),
    reliability: "derived",
    freshness: "fresh",
    conflict: false,
  });
}

function resolveGroup(group: MemoryEntry[], canonicalKey: string): ResolvedMemoryFact {
  const superseded = new Set(group.flatMap((entry) => entry.supersedesId ? [entry.supersedesId] : []));
  const candidates = group.filter((entry) => !superseded.has(entry.id));
  const ordered = candidates.slice().sort((a, b) => memorySourceRank(b) - memorySourceRank(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const effective = ordered[0] ?? null;
  const values = new Set(candidates.map((entry) => entry.content.trim().replace(/\s+/g, " ")));
  const hasConflict = values.size > 1;
  const withConflict = (entry: MemoryEntry | null) => entry && hasConflict ? { ...entry, conflict: true } : entry;
  return {
    canonicalKey,
    effective: withConflict(effective),
    alternates: [...group.filter((entry) => entry.id !== effective?.id).map((entry) => hasConflict ? { ...entry, conflict: true } : entry)],
    reason: !effective ? "No effective record remains." : effective.reliability === "verified" ? "Fresh owner-confirmed context outranks observed and derived records." : effective.reliability === "observed" ? "Fresh provider observation is the highest available source." : effective.freshness === "stale" ? "Only stale context remains; runtime must fail closed when policy-critical." : "Derived context is used only as bounded supporting evidence.",
  };
}

export function resolveMemoryFacts(entries: MemoryEntry[]): ResolvedMemoryFact[] {
  const groups = new Map<string, MemoryEntry[]>();
  entries.forEach((entry) => {
    const key = entry.canonicalKey ?? entry.id;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });
  return Array.from(groups.entries()).map(([key, group]) => resolveGroup(group, key));
}

/**
 * Resolve only exact canonical identities. Conflicting evidence is retained
 * as separate entries and marked, never silently overwritten.
 */
export function resolveMemoryEntries(entries: MemoryEntry[]): MemoryEntry[] {
  return resolveMemoryFacts(entries).flatMap((fact) => fact.effective ? [fact.effective, ...fact.alternates] : fact.alternates).sort((a, b) => {
    const rank = memorySourceRank(b) - memorySourceRank(a);
    return rank || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function memorySummary(entries: MemoryEntry[]) {
  return {
    verified: entries.filter((entry) => entry.reliability === "verified").length,
    observed: entries.filter((entry) => entry.reliability === "observed").length,
    derived: entries.filter((entry) => entry.reliability === "derived").length,
    attention: entries.filter((entry) => entry.reliability === "stale" || entry.reliability === "missing" || entry.conflict || (entry.reliability === "derived" && entry.confidence === "low")).length,
  };
}
