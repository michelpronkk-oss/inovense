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
  run: async (payload: { workspaceId: string; events: SignalEvent[] }) => {
    return ingestSignalBatch({ workspaceId: payload.workspaceId, events: payload.events.slice(0, 100) });
  },
});
