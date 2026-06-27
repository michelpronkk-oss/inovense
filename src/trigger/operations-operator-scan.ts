import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanOperationsSignals } from "@/lib/operators/operations/scan";

type OperationsOperatorScanPayload = {
  workspaceId?: string;
};

const DEFAULT_OPERATIONS_WORKSPACE_ID = "ws-atlas";

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

export const operationsOperatorDailyScan = schedules.task({
  id: "operations-operator-daily-scan",
  cron: {
    pattern: "0 8 * * *",
    timezone: "UTC",
  },
  run: async () => {
    // TODO: multi-workspace fanout. List active workspaces, run per workspace,
    // respect plan cadence/entitlements and operator enabled/disabled state.
    const result = await scanOperationsSignals({
      workspaceId: DEFAULT_OPERATIONS_WORKSPACE_ID,
      sourceMode: "scheduled",
    });
    return { workspaceId: DEFAULT_OPERATIONS_WORKSPACE_ID, ...result.body };
  },
});
