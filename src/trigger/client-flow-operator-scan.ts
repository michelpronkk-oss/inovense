import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanClientFlowSignals } from "@/lib/operators/client-flow/scan";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type ClientFlowOperatorScanPayload = {
  workspaceId: string;
};

const DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID = "ws-atlas";
const MAX_FANOUT_WORKSPACES = 500;

export const clientFlowOperatorScan = task({
  id: "client-flow-operator-scan",
  run: async (payload: ClientFlowOperatorScanPayload) => {
    const workspaceId = payload.workspaceId?.trim();
    if (!workspaceId) {
      return { status: "invalid_payload", message: "workspaceId is required." };
    }
    const result = await scanClientFlowSignals({ workspaceId, sourceMode: "manual" });
    return result.body;
  },
});

type WorkspaceDiscoveryResult = { ok: true; workspaceIds: string[] } | { ok: false; error: string };

/**
 * List workspaces the daily cron should actually scan. A workspace must
 * clear all three independent gates, mirroring
 * revenue-operator-scan.ts's listEligibleRevenueWorkspaceIds() and
 * operations-operator-scan.ts's listEligibleOperationsWorkspaceIds() exactly,
 * adapted for Client Flow's email-connector-based readiness branch:
 *   1. Client Flow readiness (same getOperatorReadiness() the manual scan
 *      route and scanClientFlowSignals() itself use) reports "ready" or
 *      "draft_only" with canRunManual true - i.e. a real email connector
 *      (Gmail or Microsoft 365) is connected.
 *   2. Billing eligibility (getWorkspaceExecutionEligibility()) - the same
 *      real server-side billing check scanClientFlowSignals() itself
 *      enforces.
 *   3. Explicit activation (getOperatorActivationState()) -
 *      os_operator_triggers.enabled for trigger_type "operator_activation".
 *      An operator never explicitly activated defaults to not-activated and
 *      is excluded here.
 * A check failing for one workspace does not stop discovery for the rest.
 */
async function listEligibleClientFlowWorkspaceIds(): Promise<WorkspaceDiscoveryResult> {
  const supabase = createSupabaseAdmin();
  const workspacesRes = await supabase.from("os_workspaces").select("id").limit(MAX_FANOUT_WORKSPACES);
  if (workspacesRes.error) {
    return { ok: false, error: workspacesRes.error.message };
  }

  const workspaceIds = (workspacesRes.data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : String(row.id ?? "")))
    .filter((id) => id.length > 0);

  const eligible: string[] = [];
  for (const workspaceId of workspaceIds) {
    try {
      const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "client_flow" });
      if (!readiness?.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
        continue;
      }
      const [eligibility, activation] = await Promise.all([
        getWorkspaceExecutionEligibility(workspaceId, supabase),
        getOperatorActivationState({ workspaceId, operatorKey: "client_flow", supabase }),
      ]);
      if (eligibility.eligible && activation?.activated) {
        eligible.push(workspaceId);
      }
    } catch {
      // A broken readiness/billing/activation check for one workspace must
      // never block discovery for the others - it simply is not scanned this
      // run.
    }
  }
  return { ok: true, workspaceIds: eligible };
}

type FanoutWorkspaceResult = {
  workspaceId: string;
  ok: boolean;
  needsAttention: boolean;
  body?: unknown;
  error?: string;
};

export const clientFlowOperatorDailyScan = schedules.task({
  id: "client-flow-operator-daily-scan",
  cron: {
    pattern: "30 7 * * *",
    timezone: "UTC",
  },
  run: async () => {
    const discovery = await listEligibleClientFlowWorkspaceIds();

    if (!discovery.ok) {
      // Workspace discovery itself failed (e.g. a transient Supabase error).
      // Fall back to the single known production workspace rather than
      // silently scanning nobody - this preserves the previous hardcoded
      // behavior as a safety net instead of a regression.
      const fallback = await scanClientFlowSignals({
        workspaceId: DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID,
        sourceMode: "scheduled",
      });
      return {
        fanout: false,
        discoveryError: discovery.error,
        results: [{ workspaceId: DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID, ok: fallback.ok, needsAttention: !fallback.ok, body: fallback.body }],
      };
    }

    if (discovery.workspaceIds.length === 0) {
      return { fanout: true, workspacesScanned: 0, workspacesNeedingAttention: [] as string[], results: [] as FanoutWorkspaceResult[] };
    }

    const results: FanoutWorkspaceResult[] = [];
    for (const workspaceId of discovery.workspaceIds) {
      // Each workspace is isolated in its own try/catch so one workspace
      // throwing (a revoked token, a Gmail/Graph outage, a Supabase write
      // failure) never aborts the scan for any other workspace in the fanout.
      try {
        const result = await scanClientFlowSignals({ workspaceId, sourceMode: "scheduled" });
        results.push({ workspaceId, ok: result.ok, needsAttention: !result.ok, body: result.body });
      } catch (error) {
        results.push({
          workspaceId,
          ok: false,
          needsAttention: true,
          error: error instanceof Error ? error.message : "Unknown Client Flow scan failure.",
        });
      }
    }

    const workspacesNeedingAttention = results.filter((result) => result.needsAttention).map((result) => result.workspaceId);
    return {
      fanout: true,
      workspacesScanned: results.length,
      workspacesNeedingAttention,
      results,
    };
  },
});
