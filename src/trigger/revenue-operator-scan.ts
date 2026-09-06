import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanRevenueOpportunities } from "@/lib/operators/revenue/scan";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type RevenueOperatorScanPayload = {
  workspaceId: string;
};

const DEFAULT_REVENUE_SCAN_WORKSPACE_ID = "ws-atlas";
const MAX_FANOUT_WORKSPACES = 500;

export const revenueOperatorScan = task({
  id: "revenue-operator-scan",
  run: async (payload: RevenueOperatorScanPayload) => {
    const workspaceId = payload.workspaceId?.trim();
    if (!workspaceId) {
      return {
        status: "invalid_payload",
        message: "workspaceId is required.",
      };
    }

    const result = await scanRevenueOpportunities({ workspaceId, sourceMode: "manual" });
    return result.body;
  },
});

type WorkspaceDiscoveryResult = { ok: true; workspaceIds: string[] } | { ok: false; error: string };

/**
 * List workspaces the daily cron should actually scan: only ones whose
 * Revenue readiness (same getOperatorReadiness() the manual scan route and
 * scanRevenueOpportunities() itself use) reports "ready" or "draft_only" with
 * canRunManual true - i.e. a real email connector (Gmail or Microsoft 365) is
 * connected. Workspaces with no connector, an unpaid plan, or a not-yet-built
 * status are never scanned. A readiness check failing for one workspace does
 * not stop discovery for the rest.
 */
async function listEligibleRevenueWorkspaceIds(): Promise<WorkspaceDiscoveryResult> {
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
      const readiness = await getOperatorReadiness({ workspaceId, operatorKey: "revenue" });
      if (readiness?.canRunManual && (readiness.status === "ready" || readiness.status === "draft_only")) {
        eligible.push(workspaceId);
      }
    } catch {
      // A broken readiness check for one workspace must never block discovery
      // for the others - it simply is not scanned this run.
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

export const revenueOperatorDailyScan = schedules.task({
  id: "revenue-operator-daily-scan",
  cron: {
    pattern: "0 7 * * *",
    timezone: "UTC",
  },
  run: async () => {
    const discovery = await listEligibleRevenueWorkspaceIds();

    if (!discovery.ok) {
      // Workspace discovery itself failed (e.g. a transient Supabase error).
      // Fall back to the single known production workspace rather than
      // silently scanning nobody - this preserves the previous hardcoded
      // behavior as a safety net instead of a regression.
      const fallback = await scanRevenueOpportunities({
        workspaceId: DEFAULT_REVENUE_SCAN_WORKSPACE_ID,
        sourceMode: "scheduled",
      });
      return {
        fanout: false,
        discoveryError: discovery.error,
        results: [{ workspaceId: DEFAULT_REVENUE_SCAN_WORKSPACE_ID, ok: fallback.ok, needsAttention: !fallback.ok, body: fallback.body }],
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
        const result = await scanRevenueOpportunities({ workspaceId, sourceMode: "scheduled" });
        results.push({ workspaceId, ok: result.ok, needsAttention: !result.ok, body: result.body });
      } catch (error) {
        results.push({
          workspaceId,
          ok: false,
          needsAttention: true,
          error: error instanceof Error ? error.message : "Unknown revenue scan failure.",
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
