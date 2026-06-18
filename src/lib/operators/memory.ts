import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { operatorRuntimeId } from "@/lib/operators/logging";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export async function createOperatorMemory(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  operatorKey: string;
  memoryType: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  sourceRunId?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}) {
  return input.supabase.from("os_operator_memory").insert({
    id: operatorRuntimeId("opmem"),
    workspace_id: input.workspaceId,
    operator_key: input.operatorKey,
    memory_type: input.memoryType,
    title: input.title,
    content: input.content,
    metadata: input.metadata ?? {},
    source_run_id: input.sourceRunId ?? null,
    approval_status: input.approvalStatus ?? "pending",
  });
}
