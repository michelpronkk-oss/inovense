import { task } from "@trigger.dev/sdk/v3";
import { scanRevenueOpportunities } from "@/lib/operators/revenue/scan";

type RevenueOperatorScanPayload = {
  workspaceId: string;
};

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
