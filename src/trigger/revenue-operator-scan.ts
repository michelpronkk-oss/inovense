import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanRevenueOpportunities } from "@/lib/operators/revenue/scan";

type RevenueOperatorScanPayload = {
  workspaceId: string;
};

const DEFAULT_REVENUE_SCAN_WORKSPACE_ID = "ws-atlas";

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

    const result = await scanRevenueOpportunities({ workspaceId });
    return result.body;
  },
});

export const revenueOperatorDailyScan = schedules.task({
  id: "revenue-operator-daily-scan",
  cron: {
    pattern: "0 7 * * *",
    timezone: "UTC",
  },
  run: async () => {
    // TODO: Replace the single-workspace default with a workspace fanout once
    // operator scheduling settings exist per workspace.
    const result = await scanRevenueOpportunities({
      workspaceId: DEFAULT_REVENUE_SCAN_WORKSPACE_ID,
    });
    return {
      workspaceId: DEFAULT_REVENUE_SCAN_WORKSPACE_ID,
      ...result.body,
    };
  },
});
