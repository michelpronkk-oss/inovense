// Maps the authoritative dispatch/worker lifecycle strings (see
// src/lib/runtime/orchestration-state.ts and os_operator_runs.status) to the
// short, human labels operator runtime surfaces should show instead of raw
// internal state strings. Never fabricates a state the data does not report.

export function dispatchStateLabel(dispatchStatus: string | null | undefined, fallbackStatus?: string | null): string {
  switch (dispatchStatus) {
    case "requested": return "Requested";
    case "dispatching": return "Dispatching";
    case "dispatched": return "Queued";
    case "running": return "Running";
    case "completed": return "Completed";
    case "partial":
    case "review_ready": return "Partially completed";
    case "failed":
    case "dispatch_failed": return "Failed";
    case "recoverable": return "Recovering";
    case "cancelled": return "Cancelled";
    case "superseded": return "Superseded";
    default: break;
  }
  switch (fallbackStatus) {
    case "pending": return "Requested";
    case "running": return "Running";
    case "completed": return "Completed";
    case "partial": return "Partially completed";
    case "failed": return "Failed";
    case "blocked": return "Attention required";
    default: return "Requested";
  }
}

export function isActiveDispatchState(dispatchStatus: string | null | undefined, fallbackStatus?: string | null): boolean {
  if (dispatchStatus) return ["requested", "dispatching", "dispatched", "running", "recoverable"].includes(dispatchStatus);
  return fallbackStatus === "pending" || fallbackStatus === "running";
}
