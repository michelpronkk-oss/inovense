import { task } from "@trigger.dev/sdk/v3";
import { ingestSignalBatch } from "@/lib/signals/store";
import type { SignalEvent } from "@/lib/signals/types";

/**
 * Internal orchestration entrypoint for bounded connector pollers and future
 * verified webhooks. It does not fetch credentials, authorize a user, invoke
 * operators, create approvals, or execute external writes.
 */
export const signalEngineIngest = task({
  id: "signal-engine-ingest",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 500, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "signal-ingest", concurrencyLimit: 4 },
  run: async (payload: { workspaceId: string; events: SignalEvent[] }) => {
    return ingestSignalBatch({ workspaceId: payload.workspaceId, events: payload.events.slice(0, 100) });
  },
});
