import { getBillingEntitlementsForPlan, type BillingPlanTier } from "@/lib/pricing";
import { getPlanLimits } from "@/lib/os/plans";
import type { Entitlements } from "@/lib/os/entitlements";

export type PlanUsageMetric = {
  label: string;
  value: string;
  detail: string;
};

type OperatorUsageStatus = "loading" | "unavailable";

type PlanUsageInput = {
  entitlements: Entitlements;
  activeOperators: number | null;
  operatorUsageStatus: OperatorUsageStatus;
  connectedSystems: number | null;
  activeTeamSeats: number | null;
};

function billingPlanTier(planTier: Entitlements["planTier"]): BillingPlanTier | null {
  if (planTier === "foundation" || planTier === "workforce" || planTier === "scale" || planTier === "operator") return planTier;
  return null;
}

function usageMetric(input: {
  label: string;
  count: number | null;
  unit: string;
  limit: number | "standard_all" | "custom" | null;
  hasActiveEntitlement: boolean;
  unavailableDetail?: string;
}): PlanUsageMetric {
  const { label, count, unit, limit, hasActiveEntitlement, unavailableDetail } = input;
  if (!hasActiveEntitlement) {
    return {
      label,
      value: count === null ? "—" : String(count),
      detail: count === null ? `${unavailableDetail ?? "Usage unavailable"} · no active plan entitlement` : `${unit} · no active plan entitlement`,
    };
  }

  if (count === null) {
    return {
      label,
      value: limit === null || limit === "custom" || limit === "standard_all" ? "—" : `— / ${limit}`,
      detail: unavailableDetail ?? "Usage loading",
    };
  }

  if (limit === null || limit === "custom" || limit === "standard_all" || limit === -1 || limit >= Number.MAX_SAFE_INTEGER) {
    return { label, value: String(count), detail: `${unit} · custom plan limit` };
  }

  return { label, value: `${count} / ${limit}`, detail: unit };
}

/**
 * Combine live workspace usage with plan limits only while the effective
 * billing entitlement is active. Paid plan operator/system limits come from
 * the same snapshot used by checkout and billing; team-seat limits use the
 * shared OS plan table already used by the plan cards.
 */
export function getPlanUsageMetrics(input: PlanUsageInput): PlanUsageMetric[] {
  const { entitlements } = input;
  const hasActiveEntitlement =
    (entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing") &&
    entitlements.canUseRealConnectors &&
    entitlements.canRunRealActions;

  const tier = billingPlanTier(entitlements.planTier);
  const billingEntitlements = hasActiveEntitlement && tier ? getBillingEntitlementsForPlan(tier) : null;
  const fallbackLimits = hasActiveEntitlement ? entitlements : null;
  const teamSeatLimit = hasActiveEntitlement ? getPlanLimits(entitlements.planTier).maxTeamMembers : null;

  return [
    usageMetric({
      label: "Operators",
      count: input.activeOperators,
      unit: "active",
      limit: billingEntitlements?.operatorsLimit ?? fallbackLimits?.operatorsLimit ?? null,
      hasActiveEntitlement,
      unavailableDetail: input.operatorUsageStatus === "unavailable" ? "Usage unavailable" : "Loading usage",
    }),
    usageMetric({
      label: "Connected systems",
      count: input.connectedSystems,
      unit: "connected",
      limit: billingEntitlements?.connectorsLimit ?? fallbackLimits?.connectorsLimit ?? null,
      hasActiveEntitlement,
      unavailableDetail: input.connectedSystems === null ? "Loading usage" : undefined,
    }),
    usageMetric({
      label: "Team seats",
      count: input.activeTeamSeats,
      unit: "active",
      limit: teamSeatLimit,
      hasActiveEntitlement,
      unavailableDetail: input.activeTeamSeats === null ? "Loading usage" : undefined,
    }),
  ];
}
