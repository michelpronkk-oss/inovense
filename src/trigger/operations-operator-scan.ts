import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanOperationsSignals } from "@/lib/operators/operations/scan";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type OperationsOperatorScanPayload = {
  workspaceId?: string;
};

const DEFAULT_OPERATIONS_WORKSPACE_ID = "ws-atlas";
const MAX_FANOUT_WORKSPACES = 500;

// Operations Operator v1: reads Trello project boards, detects operational
// signals, and creates approval-gated actions. It never executes Slack messages
// or Trello changes directly here; everything stays behind approval.
export const operationsOperatorScan = task({
  id: "operations-operator-scan",
  run: async (payload: OperationsOperatorScanPayload) => {
    const workspaceId = payload.workspaceId?.trim() || DEFAULT_OPERATIONS_WORKSPACE_ID;
    const result = await scanOperationsSignals({ workspaceId, sourceMode: "manual" });
    return { workspaceId, ...result.body };
  },
});

type WorkspaceDiscoveryResult = { ok: true; workspaceIds: string[] } | { ok: false; error: string };

/**
 * List workspaces the daily cron should actually scan: only ones whose
 * Operations readiness (the same getOperatorReadiness() the manual scan route
 * and scanOperationsSignals() itself are consistent with) reports "ready" or
 * "draft_only" with canRunManual true - i.e. Trello is connected with a
 * selected default board. Workspaces with no Trello connection, an unpaid
 * plan, or a not-yet-built status are never scanned. A readiness check
 * failing for one workspace does not stop discovery for the rest. Mirrors
 * revenue-operator-scan.ts's listEligibleRevenueWorkspaceIds() exactly,
 * adapted for the Trello-based Operations readiness branch.
 */
async function listEligibleOperationsWorkspaceIds(): Promise<WorkspaceDiscoveryResult> {
  const supabase = createSupabaseAdmin();
  const workspacesRes = await supabase.from("os_workspaces").select("id").limit(MAX_FANOUT_WORKSPACES);
  if (workspacesRes.error) {
    return { ok: false, error: workspacesRes.error.message };
  }

  const workspaceIds = (workspacesRes.data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : String(row.id ?? "")))
    .filter((id) => id.length > 0);

  // A workspace must clear readiness (Trello connected + board selected),
  // billing eligibility (getWorkspaceExecutionEligibility - the same real
  // server-side check scanOperationsSignals() itself enforces), AND explicit
  // activation (getOperatorActivationState - os_operator_triggers.enabled for
  // trigger_type "operator_activation") to be included in the unattended
  // daily cron. An operator never explicitly activated defaults to
  // not-activated and is excluded. Mirrors revenue-operator-scan.ts exactly.
  const eligible: string[] = [];
  for (const workspaceId of workspaceIds) {
    try {
      const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "operations" });
      if (!readiness?.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
        continue;
      }
      const [eligibility, activation] = await Promise.all([
        getWorkspaceExecutionEligibility(workspaceId, supabase),
        getOperatorActivationState({ workspaceId, operatorKey: "operations", supabase }),
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

export const operationsOperatorDailyScan = schedules.task({
  id: "operations-operator-daily-scan",
  cron: {
    pattern: "0 8 * * *",
    timezone: "UTC",
  },
  run: async () => {
    const discovery = await listEligibleOperationsWorkspaceIds();

    if (!discovery.ok) {
      // Workspace discovery itself failed (e.g. a transient Supabase error).
      // Fall back to the single known production workspace rather than
      // silently scanning nobody - this preserves the previous hardcoded
      // behavior as a safety net instead of a regression.
      const fallback = await scanOperationsSignals({
        workspaceId: DEFAULT_OPERATIONS_WORKSPACE_ID,
        sourceMode: "scheduled",
      });
      return {
        fanout: false,
        discoveryError: discovery.error,
        results: [{ workspaceId: DEFAULT_OPERATIONS_WORKSPACE_ID, ok: fallback.ok, needsAttention: !fallback.ok, body: fallback.body }],
      };
    }

    if (discovery.workspaceIds.length === 0) {
      return { fanout: true, workspacesScanned: 0, workspacesNeedingAttention: [] as string[], results: [] as FanoutWorkspaceResult[] };
    }

    const results: FanoutWorkspaceResult[] = [];
    for (const workspaceId of discovery.workspaceIds) {
      // Each workspace is isolated in its own try/catch so one workspace
      // throwing (a revoked Trello token, a Supabase write failure) never
      // aborts the scan for any other workspace in the fanout.
      try {
        const result = await scanOperationsSignals({ workspaceId, sourceMode: "scheduled" });
        results.push({ workspaceId, ok: result.ok, needsAttention: !result.ok, body: result.body });
      } catch (error) {
        results.push({
          workspaceId,
          ok: false,
          needsAttention: true,
          error: error instanceof Error ? error.message : "Unknown Operations scan failure.",
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
