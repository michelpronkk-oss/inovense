import { task } from "@trigger.dev/sdk/v3";
import { runWebsiteSync } from "@/lib/connectors/website-sync";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

export const websiteSyncRun = task({
  id: "website-sync-run",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 30_000, randomize: true },
  queue: { name: "website-sync", concurrencyLimit: 2 },
  run: async (payload: { runId: string }) => withTaskHeartbeat({ taskId: "website-sync-run", expectedCadenceMinutes: 15 }, () => runWebsiteSync({ runId: payload.runId })),
});
