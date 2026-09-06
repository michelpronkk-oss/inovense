// Dashboard lifecycle state selection (Pass 2B, states A-F).
//
// Pure decision function - no IO, no re-derivation of operator product state
// (see src/lib/operators/product-state.ts, the single source of truth this
// consumes). The dashboard overview component (src/components/dashboard/overview.tsx)
// is the only real consumer; it still keeps its own literal
// `healthyConnectors === 0` check for state A (an existing, already-tested
// contract from Pass 2), but delegates every other branch (B-F) to this
// function so the precedence lives in one place and is runtime-testable in
// isolation.

export type DashboardLifecycleState = "A" | "B" | "C" | "D" | "E" | "F";

export type LifecycleOperatorState = {
  /** OperatorProductState value from product-state.ts, kept as a plain string here to avoid a value import into this pure module. */
  state: string;
  degraded?: unknown;
};

/**
 * Precedence (highest first):
 *   0. No healthy connectors at all -> A (handled by the caller's own literal check; included here for completeness/testability)
 *   1. Any operator actively running (active/enhanced) -> E - the normal
 *      operational dashboard. A degraded/needs-attention situation does NOT
 *      demote E; it is surfaced as a section inside E instead of hiding the
 *      rest of the product.
 *   2. No operator active, but something needs attention (a required
 *      connector broke, or an optional connector degraded an operator) -> F
 *   3. No operator active or attention-needing, but one or more are blocked
 *      purely by plan/billing -> D
 *   4. No operator active/attention/billing-blocked, but one or more are
 *      ready and simply not yet turned on -> C
 *   5. Otherwise (every real operator still needs setup) -> B
 */
export function selectDashboardLifecycleState(input: {
  healthyConnectorCount: number;
  operatorStates: LifecycleOperatorState[];
  anyDegraded?: boolean;
}): DashboardLifecycleState {
  if (input.healthyConnectorCount === 0) return "A";

  const active = input.operatorStates.some((item) => item.state === "active" || item.state === "enhanced");
  if (active) return "E";

  const attention = input.operatorStates.some((item) => item.state === "needs_attention" || Boolean(item.degraded)) || Boolean(input.anyDegraded);
  if (attention) return "F";

  const planBlocked = input.operatorStates.some((item) => item.state === "plan_required" || item.state === "billing_attention" || item.state === "suspended");
  if (planBlocked) return "D";

  const ready = input.operatorStates.some((item) => item.state === "ready_to_activate");
  if (ready) return "C";

  return "B";
}
