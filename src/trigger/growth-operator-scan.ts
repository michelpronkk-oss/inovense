import { task } from "@trigger.dev/sdk/v3";
import { runGrowthOperatorScan } from "@/lib/operators/growth/runtime";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

export const growthOperatorScan = task({
  id: "growth-operator-scan",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 15_000, randomize: true },
  queue: { name: "operator-scans", concurrencyLimit: 2 },
  run: async (payload: { workspaceId: string; runId: string }) => {
    if (!payload.workspaceId?.trim() || !payload.runId?.trim()) return { status: "invalid_payload" };
    return withTaskHeartbeat({ taskId: "growth-operator-scan", expectedCadenceMinutes: 60 }, () => runGrowthOperatorScan({ workspaceId: payload.workspaceId, runId: payload.runId }));
  },
});
