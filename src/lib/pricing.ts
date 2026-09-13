import { PLAN_LABELS, PLAN_SLUGS, type PlanSlug } from "@/lib/plan-identity";

export type PublicPlanTier = PlanSlug;
export type LegacyBillingPlanTier = "operator";
export type BillingPlanTier = PublicPlanTier | LegacyBillingPlanTier;
export type CheckoutPlanTier = PublicPlanTier;

// Explicit commercial ordering. Do not infer upgrade paths alphabetically.
export const SELF_SERVE_PLAN_ORDER: readonly CheckoutPlanTier[] = PLAN_SLUGS;

export function getSelfServePlanRank(plan: CheckoutPlanTier): number {
  return SELF_SERVE_PLAN_ORDER.indexOf(plan);
}

export type PricingPlan = {
  plan: PublicPlanTier;
  plan_tier: PublicPlanTier;
  plan_name: string;
  price: string;
  period: string;
  tagline: string;
  billingLabel: string;
  cta: string;
  featured?: boolean;
  badge?: string;
  features: string[];
  metadata: {
    billing_interval: "month";
    trial_days: number;
  operators_limit: number;
  connectors_limit: number;
  actions_limit: number;
  log_retention_days: number;
  support_level: "email" | "priority";
    setup_support?: "included";
  };
};

export const pricingPlans: PricingPlan[] = [
  {
    plan: "foundation",
    plan_tier: "foundation",
    plan_name: PLAN_LABELS.foundation,
    price: "$99",
    period: "/mo",
    tagline: "Deploy your first controlled AI operators.",
    billingLabel: "3 days free for first-time workspaces",
    cta: "Request early access",
    features: [
      "Up to 3 active operators",
      "Up to 3 connected systems",
      "1,000 controlled runs per month",
      "Approval-first execution",
      "Company memory and audit history",
      "3 days free for first-time workspaces",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 3,
      operators_limit: 3,
      connectors_limit: 3,
      actions_limit: 1000,
      log_retention_days: 30,
      support_level: "email",
    },
  },
  {
    plan: "workforce",
    plan_tier: "workforce",
    plan_name: PLAN_LABELS.workforce,
    price: "$299",
    period: "/mo",
    tagline: "Run essential work across teams with control.",
    billingLabel: "3 days free for first-time workspaces",
    badge: "Recommended",
    featured: true,
    cta: "Request early access",
    features: [
      "Up to 8 active operators",
      "Up to 8 connected systems",
      "5,000 controlled runs per month",
      "Advanced approval policies",
      "Company memory and audit history",
      "Slack and email approvals",
      "Priority support",
      "3 days free for first-time workspaces",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 3,
      operators_limit: 8,
      connectors_limit: 8,
      actions_limit: 5000,
      log_retention_days: 90,
      support_level: "email",
    },
  },
  {
    plan: "scale",
    plan_tier: "scale",
    plan_name: PLAN_LABELS.scale,
    price: "$799",
    period: "/mo",
    tagline: "Scale AI operations across more teams, systems, and workflows with higher execution capacity and deeper governance.",
    billingLabel: "3 days free for first-time workspaces",
    cta: "Request early access",
    features: [
      "Up to 20 active operators",
      "Up to 20 connected systems",
      "20,000 controlled runs per month",
      "Advanced approval policies",
      "Company memory and audit history",
      "Slack and email approvals",
      "Priority support",
      "3 days free for first-time workspaces",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 3,
      operators_limit: 20,
      connectors_limit: 20,
      actions_limit: 20000,
      log_retention_days: 180,
      support_level: "priority",
    },
  },
];

export const publicPlanFeatures = pricingPlans.map((plan) => ({
  tier: plan.plan_tier,
  name: plan.plan_name,
  features: plan.features,
}));

export function getPlanByTier(tier: PublicPlanTier): PricingPlan | undefined {
  return pricingPlans.find((plan) => plan.plan_tier === tier);
}

export type BillingEntitlementSnapshot = {
  planTier: BillingPlanTier;
  operatorsLimit: number;
  connectorsLimit: number | "standard_all";
  actionsLimit: number;
  logRetentionDays: number;
  canUseRealConnectors: boolean;
  canRunRealActions: boolean;
  supportLevel: "email" | "priority" | "dedicated";
};

export function getBillingEntitlementsForPlan(plan: BillingPlanTier): BillingEntitlementSnapshot {
  if (plan === "foundation") {
    return {
      planTier: "foundation",
      operatorsLimit: 3,
      connectorsLimit: 3,
      actionsLimit: 1000,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      supportLevel: "email",
    };
  }
  if (plan === "workforce") {
    return {
      planTier: "workforce",
      operatorsLimit: 8,
      connectorsLimit: 8,
      actionsLimit: 5000,
      logRetentionDays: 90,
      canUseRealConnectors: true,
      canRunRealActions: true,
      supportLevel: "priority",
    };
  }
  if (plan === "scale") {
    return {
      planTier: "scale",
      operatorsLimit: 20,
      connectorsLimit: 20,
      actionsLimit: 20000,
      logRetentionDays: 180,
      canUseRealConnectors: true,
      canRunRealActions: true,
      supportLevel: "priority",
    };
  }
  return {
    planTier: "operator",
    operatorsLimit: 12,
    connectorsLimit: "standard_all",
    actionsLimit: 100000,
    logRetentionDays: 180,
    canUseRealConnectors: true,
    canRunRealActions: true,
    supportLevel: "dedicated",
  };
}
