export const TERMINAL_DISPATCH_STATUSES = ["completed", "failed", "cancelled", "superseded"] as const;
export const ACTIVE_DISPATCH_STATUSES = ["requested", "dispatching", "dispatched", "running"] as const;
export const RETRYABLE_DISPATCH_STATUSES = ["dispatch_failed", "recoverable"] as const;

export type DispatchStatus =
  | (typeof ACTIVE_DISPATCH_STATUSES)[number]
  | (typeof TERMINAL_DISPATCH_STATUSES)[number]
  | (typeof RETRYABLE_DISPATCH_STATUSES)[number];

export function isTerminalDispatchStatus(status: string | null | undefined): boolean {
  return TERMINAL_DISPATCH_STATUSES.includes(status as (typeof TERMINAL_DISPATCH_STATUSES)[number]);
}

export function isProviderAccepted(status: string | null | undefined): boolean {
  return status === "dispatched" || status === "running";
}

export function isDispatchRetryable(status: string | null | undefined): boolean {
  return status === "requested" || status === "dispatch_failed" || status === "recoverable";
}

export function shouldRecoverDispatch(input: { status: string; referenceAt: string | null | undefined; nowMs: number; staleAfterMs: number }): boolean {
  if (!input.referenceAt || isTerminalDispatchStatus(input.status)) return false;
  const referenceMs = Date.parse(input.referenceAt);
  return Number.isFinite(referenceMs) && input.nowMs - referenceMs >= input.staleAfterMs;
}
