import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

let seq = 0;

export function operatorRuntimeId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function logOperatorEvent(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  level?: "debug" | "info" | "warn" | "error";
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return input.supabase.from("os_operator_run_logs").insert({
    id: operatorRuntimeId("oplog"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    level: input.level ?? "info",
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata ?? {},
  });
}

export async function recordOperatorUsage(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  operatorKey: string;
  eventType: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  return input.supabase.from("os_operator_usage_events").insert({
    id: operatorRuntimeId("opusage"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    operator_key: input.operatorKey,
    event_type: input.eventType,
    quantity: input.quantity ?? 1,
    metadata: input.metadata ?? {},
  });
}
