"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWorkspaceAdmin, AuthorizationError, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { appendMemoryVersion } from "@/lib/memory/materialize";
import type { MemoryRow } from "@/lib/memory/model";

type MemoryMutationResult = { ok: true } | { ok: false; error: string };

// connector_observed records are immutable evidence; corrections append a
// verified replacement rather than rewriting the provider observation.

async function authorizedMemoryMutation(): Promise<{ ok: true; userId: string; workspaceId: string; supabase: ReturnType<typeof createSupabaseAdmin> } | { ok: false; error: string }> {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { ok: false, error: "Sign in to manage business context." };
  const supabase = createSupabaseAdmin();
  const workspaceId = await resolveActiveWorkspaceId(user.id, supabase);
  if (!workspaceId) return { ok: false, error: "No active workspace was found." };
  try {
    await requireWorkspaceAdmin(user.id, workspaceId, supabase);
  } catch (error) {
    return { ok: false, error: error instanceof AuthorizationError ? "Only a workspace admin can manage business context." : "Could not verify workspace permissions." };
  }
  return { ok: true, userId: user.id, workspaceId, supabase };
}

async function memoryLog(supabase: ReturnType<typeof createSupabaseAdmin>, event: string, message: string) {
  await supabase.from("os_execution_logs").insert({
    id: `log-memory-${Date.now()}-${event}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event,
    message,
    duration: "-",
    status: "ok",
  });
}

export async function confirmMemoryEntryAction(memoryId: string): Promise<MemoryMutationResult> {
  const access = await authorizedMemoryMutation();
  if (!access.ok) return access;
  const row = await access.supabase.from("os_memory_entries").select("id,type,category,canonical_key,label,summary,content,tags,agent_scope,field_count,source_type,source_label,source_ref,source_connector,source_entity_id,reliability,confidence,first_observed_at,last_observed_at,last_confirmed_at,stale_after,operator_relevance,policy_relevant,evidence,supersedes_id,updated_at").eq("id", memoryId).eq("workspace_id", access.workspaceId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "That context item is no longer available." };
  const current = row.data as MemoryRow;
  const now = new Date().toISOString();
  try {
    await appendMemoryVersion({ supabase: access.supabase, memory: {
      workspaceId: access.workspaceId,
      canonicalKey: current.canonical_key ?? current.id,
      category: (current.category as "business" | "commercial" | "customers" | "delivery" | "support" | "operating_rules") ?? "operating_rules",
      label: current.label,
      summary: current.summary,
      content: current.content,
      sourceType: "owner_confirmed",
      sourceLabel: "Owner-confirmed context",
      sourceRef: `memory-correction:${memoryId}`,
      sourceConnector: null,
      sourceEntityId: memoryId,
      evidence: [...(Array.isArray(current.evidence) ? current.evidence.filter((item): item is string => typeof item === "string") : []), `supersedes:${memoryId}`],
      observedAt: now,
      lastConfirmedAt: now,
      operatorRelevance: Array.isArray(current.operator_relevance) ? current.operator_relevance.filter((item): item is string => typeof item === "string") : [],
      policyRelevant: current.policy_relevant === true,
      supersedesId: memoryId,
      reliability: "verified",
    } });
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not confirm context." }; }
  await memoryLog(access.supabase, "memory_confirmed", `Owner confirmed business context: ${row.data.label}`);
  revalidatePath("/app/memory");
  return { ok: true };
}

export async function markMemoryOutdatedAction(memoryId: string): Promise<MemoryMutationResult> {
  const access = await authorizedMemoryMutation();
  if (!access.ok) return access;
  const row = await access.supabase.from("os_memory_entries").select("id,type,category,canonical_key,label,summary,content,tags,agent_scope,field_count,source_type,source_label,source_ref,source_connector,source_entity_id,reliability,confidence,first_observed_at,last_observed_at,last_confirmed_at,stale_after,operator_relevance,policy_relevant,evidence,supersedes_id,updated_at").eq("id", memoryId).eq("workspace_id", access.workspaceId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "That context item is no longer available." };
  const now = new Date().toISOString();
  const current = row.data as MemoryRow;
  try {
    await appendMemoryVersion({ supabase: access.supabase, memory: {
      workspaceId: access.workspaceId,
      canonicalKey: current.canonical_key ?? current.id,
      category: (current.category as "business" | "commercial" | "customers" | "delivery" | "support" | "operating_rules") ?? "operating_rules",
      label: current.label,
      summary: current.summary,
      content: current.content,
      sourceType: "owner_confirmed",
      sourceLabel: "Owner marked outdated",
      sourceRef: `memory-outdated:${memoryId}`,
      sourceEntityId: memoryId,
      evidence: [`supersedes:${memoryId}`, "owner marked outdated"],
      observedAt: now,
      staleAfter: now,
      operatorRelevance: Array.isArray(current.operator_relevance) ? current.operator_relevance.filter((item): item is string => typeof item === "string") : [],
      policyRelevant: current.policy_relevant === true,
      supersedesId: memoryId,
      reliability: "stale",
    } });
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not mark context outdated." }; }
  await memoryLog(access.supabase, "memory_marked_outdated", `Owner marked business context outdated: ${row.data.label}`);
  revalidatePath("/app/memory");
  return { ok: true };
}

export async function correctMemoryEntryAction(memoryId: string, correctedContent: string, reason?: string): Promise<MemoryMutationResult> {
  const access = await authorizedMemoryMutation();
  if (!access.ok) return access;
  const row = await access.supabase.from("os_memory_entries").select("id,type,category,canonical_key,label,summary,content,operator_relevance,policy_relevant,evidence").eq("id", memoryId).eq("workspace_id", access.workspaceId).maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "That context item is no longer available." };
  const current = row.data as MemoryRow;
  const now = new Date().toISOString();
  try {
    await appendMemoryVersion({ supabase: access.supabase, memory: {
      workspaceId: access.workspaceId,
      canonicalKey: current.canonical_key ?? current.id,
      category: (current.category as "business" | "commercial" | "customers" | "delivery" | "support" | "operating_rules") ?? "operating_rules",
      label: current.label,
      summary: current.summary,
      content: correctedContent,
      sourceType: "owner_confirmed",
      sourceLabel: "Owner correction",
      sourceRef: `memory-correction:${memoryId}`,
      sourceEntityId: memoryId,
      evidence: [`supersedes:${memoryId}`, ...(reason?.trim() ? [`reason:${reason.trim().slice(0, 180)}`] : [])],
      observedAt: now,
      lastConfirmedAt: now,
      operatorRelevance: Array.isArray(current.operator_relevance) ? current.operator_relevance.filter((item): item is string => typeof item === "string") : [],
      policyRelevant: current.policy_relevant === true,
      supersedesId: memoryId,
      reliability: "verified",
    } });
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not save correction." }; }
  await memoryLog(access.supabase, "memory_corrected", `Owner corrected business context: ${current.label}`);
  revalidatePath("/app/memory");
  return { ok: true };
}
