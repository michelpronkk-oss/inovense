import { schedules, task } from "@trigger.dev/sdk/v3";
import { scanClientFlowSignals } from "@/lib/operators/client-flow/scan";

type ClientFlowOperatorScanPayload = {
  workspaceId: string;
};

const DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID = "ws-atlas";

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

export const clientFlowOperatorDailyScan = schedules.task({
  id: "client-flow-operator-daily-scan",
  cron: {
    pattern: "30 7 * * *",
    timezone: "UTC",
  },
  run: async () => {
    // TODO: Replace the single-workspace default with a workspace fanout once
    // operator scheduling settings exist per workspace.
    const result = await scanClientFlowSignals({
      workspaceId: DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID,
      sourceMode: "scheduled",
    });
    return { workspaceId: DEFAULT_CLIENT_FLOW_SCAN_WORKSPACE_ID, ...result.body };
  },
});
