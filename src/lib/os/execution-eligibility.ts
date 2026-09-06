// Workspace execution eligibility.
//
// This is the single source of truth for "is this workspace allowed to have
// real (non-preview) operator work executed right now" - the concept the
// three operator scan paths and the Trigger.dev daily-cron fanouts both need
// before they create real approvals or run unattended. It is built directly
// on top of getEntitlements() (src/lib/os/entitlements.ts) and never
// re-derives or duplicates that module's billing/plan logic - it only
// relabels the already-computed `canRunRealActions` decision into a richer,
// deterministic status union that both UI copy and scheduling code can use.
//
// Always loads the real os_workspaces row server-side. Never trusts a
// client-supplied billing state.

import { getEntitlements, type BillingStatus, type PlanTier } from "@/lib/os/entitlements";
import type { Workspace } from "@/lib/os/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type ExecutionEligibilityStatus =
  | "eligible"
  | "trial"
  | "plan_required"
  | "billing_attention"
  | "suspended";

export type WorkspaceExecutionEligibility = {
  status: ExecutionEligibilityStatus;
  /** True only for "eligible" and "trial" - always kept in lockstep with getEntitlements().canRunRealActions. */
  eligible: boolean;
  planTier: PlanTier;
  billingStatus: BillingStatus;
  trialEndsAt?: string;
  /** Same value as `eligible`, exposed under entitlements' own field name for callers that already think in those terms. */
  canRunRealActions: boolean;
  reason: string;
};

/**
 * Maps the real os_workspaces billing_status (via getEntitlements(), which
 * remains the one true billing resolver) onto a deterministic execution
 * eligibility status:
 *
 *   plan_tier === "preview" (regardless of billing_status) -> "plan_required"
 *   billing_status "preview"                                -> "plan_required"
 *   billing_status "trialing"                                -> "trial"        (counts as eligible - preserves entitlements.ts's intentional trial allowance)
 *   billing_status "active"                                  -> "eligible"
 *   billing_status "past_due"                                -> "billing_attention" (was paying; a payment failed)
 *   billing_status "canceled" (or any other/unknown value)    -> "suspended"
 *
 * `eligible` is derived ONLY from entitlements.canRunRealActions - this
 * function never re-decides the paid/active boolean itself, it only gives it
 * a name.
 */
function mapBillingStatusToEligibilityStatus(planTier: PlanTier, billingStatus: BillingStatus): ExecutionEligibilityStatus {
  if (planTier === "preview" || billingStatus === "preview") return "plan_required";
  if (billingStatus === "trialing") return "trial";
  if (billingStatus === "active") return "eligible";
  if (billingStatus === "past_due") return "billing_attention";
  return "suspended";
}

function reasonForStatus(status: ExecutionEligibilityStatus, trialEndsAt?: string): string {
  switch (status) {
    case "eligible":
      return "Workspace billing is active. Real operator execution is allowed.";
    case "trial":
      return `Workspace is in its trial period${trialEndsAt ? ` (ends ${trialEndsAt})` : ""}. Trials are treated as active for execution purposes.`;
    case "plan_required":
      return "Workspace has not activated a paid plan yet. Real operator execution is not allowed until a plan is selected.";
    case "billing_attention":
      return "Workspace billing is past due. Real operator execution is paused until payment is resolved.";
    case "suspended":
    default:
      return "Workspace billing has been canceled or suspended. Real operator execution is not allowed.";
  }
}

function eligibilityFromWorkspace(workspace: Workspace): WorkspaceExecutionEligibility {
  const entitlements = getEntitlements(workspace);
  const status = mapBillingStatusToEligibilityStatus(entitlements.planTier, entitlements.billingStatus);
  return {
    status,
    eligible: entitlements.canRunRealActions,
    planTier: entitlements.planTier,
    billingStatus: entitlements.billingStatus,
    trialEndsAt: entitlements.trialEndsAt,
    canRunRealActions: entitlements.canRunRealActions,
    reason: reasonForStatus(status, entitlements.trialEndsAt),
  };
}

/**
 * Convenience path for callers that already loaded a real Workspace row this
 * request (e.g. readiness.ts, which already fetches os_workspaces) - avoids a
 * duplicate round trip. Still never trusts anything the caller did not itself
 * load from the database.
 */
export function getWorkspaceExecutionEligibilityFromWorkspace(workspace: Workspace): WorkspaceExecutionEligibility {
  return eligibilityFromWorkspace(workspace);
}

/**
 * The primary entry point: loads the real os_workspaces row for
 * `workspaceId` and returns its execution eligibility. Fails closed - any
 * lookup error or missing workspace resolves to a non-eligible
 * "plan_required" result rather than throwing or defaulting to eligible.
 */
export async function getWorkspaceExecutionEligibility(
  workspaceId: string,
  supabaseClient?: SupabaseAdmin,
): Promise<WorkspaceExecutionEligibility> {
  const supabase = supabaseClient ?? createSupabaseAdmin();
  const workspaceRes = await supabase
    .from("os_workspaces")
    .select("id,name,environment,region,plan,plan_tier,billing_status,trial_ends_at,dodo_customer_id,dodo_subscription_id,dodo_product_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceRes.error || !workspaceRes.data) {
    return {
      status: "plan_required",
      eligible: false,
      planTier: "preview",
      billingStatus: "preview",
      canRunRealActions: false,
      reason: workspaceRes.error?.message || "Workspace not found.",
    };
  }

  const workspace: Workspace = {
    id: workspaceRes.data.id,
    name: workspaceRes.data.name,
    environment: workspaceRes.data.environment,
    region: workspaceRes.data.region,
    plan: workspaceRes.data.plan,
    planTier: workspaceRes.data.plan_tier ?? undefined,
    billingStatus: workspaceRes.data.billing_status ?? undefined,
    trialEndsAt: workspaceRes.data.trial_ends_at ?? undefined,
    dodoCustomerId: workspaceRes.data.dodo_customer_id ?? undefined,
    dodoSubscriptionId: workspaceRes.data.dodo_subscription_id ?? undefined,
    dodoProductId: workspaceRes.data.dodo_product_id ?? undefined,
  };

  return eligibilityFromWorkspace(workspace);
}
