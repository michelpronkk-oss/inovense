import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { ExecutionLog } from "@/lib/os/types";
import { eventLabel } from "@/lib/events/presentation-registry";
import { decodePageCursor, encodePageCursor, boundedLimit } from "@/lib/server/pagination";

type Row = Record<string, unknown>;

export type ExecutionLogView = ExecutionLog & {
  eventLabel: string;
  operatorKey: string | null;
};

export type ExecutionLogPage = {
  logs: ExecutionLogView[];
  lastUpdatedAt: string | null;
  hasMore: boolean;
  nextCursor: string | null;
};

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};

const OPERATOR_META: Record<string, { mark: string; color: string }> = {
  revenue: { mark: "RV", color: "#4DE8E1" },
  client_flow: { mark: "CF", color: "#5B8DEF" },
  operations: { mark: "OP", color: "#51D88A" },
  support: { mark: "SU", color: "#66D0E0" },
};

function logStatus(level: unknown, metadata: Row): ExecutionLog["status"] {
  const explicit = text(metadata.status);
  if (explicit === "ok" || explicit === "warn" || explicit === "error" || explicit === "waiting") return explicit;
  if (level === "error") return "error";
  if (level === "warn") return "warn";
  if (metadata.waitingForApproval === true) return "waiting";
  return "ok";
}

function latestTimestamp(rows: ExecutionLogView[]): string | null {
  return rows.map((row) => row.ts).filter((value) => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

export async function getExecutionLogPage(input: { workspaceId: string; limit?: number; cursor?: string | null }): Promise<ExecutionLogPage> {
  const supabase = createSupabaseAdmin();
  const limit = boundedLimit(input.limit, 200, 500);
  const cursor = decodePageCursor(input.cursor);
  let logsQuery = supabase.from("os_operator_run_logs").select("id,run_id,level,event_type,message,metadata,created_at").eq("workspace_id", input.workspaceId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
  if (cursor) logsQuery = cursor.id
    ? logsQuery.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`)
    : logsQuery.lt("created_at", cursor.at);
  const [logsResult, runsResult] = await Promise.all([
    logsQuery,
    supabase.from("os_operator_runs").select("id,operator_key,status").eq("workspace_id", input.workspaceId).limit(500),
  ]);
  if (logsResult.error || runsResult.error) throw new Error("Execution logs are temporarily unavailable.");

  const runById = new Map((runsResult.data ?? []).map((row) => [String(row.id), row as Row]));
  const rows = (logsResult.data ?? []).map((row) => {
    const source = row as Row;
    const metadata = record(source.metadata);
    const run = runById.get(String(source.run_id));
    const operatorKey = text(metadata.operatorKey) ?? text(run?.operator_key);
    const operatorMeta = operatorKey ? OPERATOR_META[operatorKey] : undefined;
    const event = text(source.event_type) ?? "execution.event";
    const timestamp = text(source.created_at) ?? new Date(0).toISOString();
    const durationMs = typeof metadata.durationMs === "number" && Number.isFinite(metadata.durationMs) ? `${metadata.durationMs}ms` : "-";
    return {
      id: String(source.id),
      ts: timestamp,
      runId: String(source.run_id),
      agentId: operatorKey ?? "system",
      agentMark: operatorMeta?.mark ?? "OS",
      agentColor: operatorMeta?.color ?? "#4DE8E1",
      event,
      eventLabel: eventLabel(event),
      message: text(source.message) ?? "Execution event recorded.",
      duration: durationMs,
      status: logStatus(source.level, metadata),
      actorType: operatorKey ? "operator" : "system",
      operatorKey,
    } satisfies ExecutionLogView;
  });
  const visible = rows.slice(0, limit);
  const last = visible.at(-1);
  return {
    logs: visible,
    lastUpdatedAt: latestTimestamp(visible),
    hasMore: rows.length > visible.length,
    nextCursor: rows.length > visible.length && last ? encodePageCursor({ at: last.ts, id: last.id }) : null,
  };
}
