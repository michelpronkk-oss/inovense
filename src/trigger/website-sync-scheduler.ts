import { schedules } from "@trigger.dev/sdk/v3";
import { runAutonomousReconciliation } from "@/lib/runtime/autonomous-reconciliation";
import { withTaskHeartbeat } from "@/lib/runtime/task-heartbeat";

/** One shared scheduler fans out bounded due-source work; it does not create a
 * permanent cron per customer workspace. */
export const websiteSyncScheduler = schedules.task({
  id: "website-sync-scheduler",
  cron: { pattern: "*/15 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 15_000, randomize: true },
  queue: { name: "website-sync-scheduler", concurrencyLimit: 1 },
  run: () => withTaskHeartbeat({ taskId: "website-sync-scheduler", expectedCadenceMinutes: 15 }, () => runAutonomousReconciliation({})),
});
