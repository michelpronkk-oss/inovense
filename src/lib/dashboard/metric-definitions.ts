import type { DashboardMetric } from "@/lib/product/presentation-models";

/** Canonical dashboard semantics. These contracts are deliberately explicit:
 * a metric is only allowed to contribute when its authoritative source and
 * freshness rules are satisfied. */
export type DashboardMetricContract = {
  key: string;
  name: string;
  authoritativeSource: string;
  window: string | null;
  inclusion: string;
  exclusion: string;
  freshness: string;
  emptyState: string;
  drilldownRoute: string | null;
  testCoverage: string[];
};

export const DASHBOARD_METRIC_CONTRACTS: Record<string, DashboardMetricContract> = {
  liveWorkforce: {
    key: "liveWorkforce", name: "Live workforce", authoritativeSource: "operator product state", window: "current",
    inclusion: "active, active_limited, or enhanced operators", exclusion: "setup-ready, paused, or unknown operators",
    freshness: "server bootstrap or explicit realtime refresh", emptyState: "No operators are active yet.", drilldownRoute: "/agents",
    testCoverage: ["operator state mapping", "unknown state excluded"],
  },
  awaitingApproval: {
    key: "awaitingApproval", name: "Awaiting approval", authoritativeSource: "os_approvals.status", window: "current",
    inclusion: "pending approvals in the active workspace", exclusion: "resolved, rejected, skipped, or cross-workspace rows",
    freshness: "persisted query timestamp", emptyState: "No work is waiting for approval.", drilldownRoute: "/approvals",
    testCoverage: ["workspace scope", "pending-only count"],
  },
  connectedSystems: {
    key: "connectedSystems", name: "Connected systems", authoritativeSource: "connector truth/readiness", window: "current",
    inclusion: "connected and healthy/executable connector truth", exclusion: "onboarding selections, preview rows, unavailable catalog entries",
    freshness: "connector truth last checked timestamp", emptyState: "No systems are verified yet.", drilldownRoute: "/connectors",
    testCoverage: ["healthy connector truth", "missing connector truth"],
  },
  actionsExecuted: {
    key: "actionsExecuted", name: "Actions executed", authoritativeSource: "normalized activity execution evidence", window: "7d",
    inclusion: "completed execution items with persisted evidence", exclusion: "prepared, blocked, failed, or simulated work",
    freshness: "activity query timestamp", emptyState: "No actions have completed in this window.", drilldownRoute: "/activity",
    testCoverage: ["prepared excluded", "blocked excluded", "execution evidence included"],
  },
};
export const DASHBOARD_METRIC_DEFINITIONS = {
  liveWorkforce: DASHBOARD_METRIC_CONTRACTS.liveWorkforce.inclusion + "; " + DASHBOARD_METRIC_CONTRACTS.liveWorkforce.exclusion + ".",
  awaitingApproval: DASHBOARD_METRIC_CONTRACTS.awaitingApproval.inclusion + ".",
  connectedSystems: DASHBOARD_METRIC_CONTRACTS.connectedSystems.inclusion + "; " + DASHBOARD_METRIC_CONTRACTS.connectedSystems.exclusion + ".",
  actionsExecuted: DASHBOARD_METRIC_CONTRACTS.actionsExecuted.inclusion + "; " + DASHBOARD_METRIC_CONTRACTS.actionsExecuted.exclusion + ".",
} as const;

export function dashboardMetricFromContract(contract: DashboardMetricContract, value: number | string, freshness: DashboardMetric["freshness"]): DashboardMetric {
  return {
    key: contract.key,
    name: contract.name,
    value,
    source: contract.authoritativeSource,
    window: contract.window,
    freshness,
    emptyState: contract.emptyState,
    drilldownRoute: contract.drilldownRoute,
  };
}

export function isLiveWorkforceState(state: string | null | undefined): boolean {
  return state === "active" || state === "active_limited" || state === "enhanced";
}

export function countLiveWorkforce(states: Array<{ state?: string | null }>): number {
  return states.filter((item) => isLiveWorkforceState(item.state)).length;
}
