import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getWorkspaceOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Re-read connector truth and the derived live-operator readiness together.
 *
 * Auterim does not maintain a second operator-access table: readiness is a
 * projection of verified connector truth, capability requirements, policy and
 * activation state. This helper is the one server-side reconciliation seam
 * for connector events that need an immediate post-save read; normal page/API
 * reads call the same derivation directly.
 */
export async function reconcileConnectorState(input: {
  workspaceId: string;
  connectorKey: string;
  supabase?: SupabaseAdmin;
}): Promise<{ connector: SafeConnectorTruth | null; readiness: OperatorReadiness[] }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [truth, readiness] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    getWorkspaceOperatorReadiness({ workspaceId: input.workspaceId, supabase }),
  ]);
  return {
    connector: truth.find((row) => row.connectorKey === input.connectorKey) ?? null,
    readiness,
  };
}
