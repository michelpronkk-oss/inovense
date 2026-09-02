import type { PublicUserState } from "@/lib/public-user-state";

export type PublicPlanTier = "starter" | "growth" | "operator" | "enterprise";
export type CheckoutPlanTier = Exclude<PublicPlanTier, "enterprise">;

export type PricingPlan = {
  plan: PublicPlanTier;
  plan_tier: PublicPlanTier;
  plan_name: string;
  price: string;
  period: string;
  tagline: string;
  billingLabel: string;
  cta: string;
  ctaHref: string;
  featured?: boolean;
  badge?: string;
  features: string[];
  metadata: {
    billing_interval: "month";
    trial_days: number;
    operators_limit: number | "unlimited";
    connectors_limit: number | "standard_all" | "custom";
    actions_limit: number | "custom";
    log_retention_days: number | "custom";
    support_level: "email" | "priority" | "dedicated" | "enterprise";
    setup_support?: "included";
  };
};

export const dodoProductEnvKeys = {
  starter: "DODO_PRODUCT_STARTER",
  growth: "DODO_PRODUCT_GROWTH",
  operator: "DODO_PRODUCT_OPERATOR",
} as const;

export const pricingPlans: PricingPlan[] = [
  {
    plan: "starter",
    plan_tier: "starter",
    plan_name: "Auterim OS Starter",
    price: "$149",
    period: "/mo",
    tagline: "For teams starting with two controlled AI operators.",
    billingLabel: "3-day trial included",
    cta: "Get Starter",
    ctaHref: "/api/billing/dodo/checkout?plan=starter",
    features: [
      "2 active operators",
      "5 connected tools",
      "2,000 actions per month",
      "Starter workflows",
      "Approval-first execution",
      "Basic company memory",
      "30-day execution logs",
      "Email support",
      "3-day trial included",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 3,
      operators_limit: 2,
      connectors_limit: 5,
      actions_limit: 2000,
      log_retention_days: 30,
      support_level: "email",
    },
  },
  {
    plan: "growth",
    plan_tier: "growth",
    plan_name: "Auterim OS Growth",
    price: "$699",
    period: "/mo",
    tagline: "For teams running AI across revenue, client work and operations.",
    billingLabel: "Monthly or annual",
    badge: "Most chosen",
    featured: true,
    cta: "Get Growth",
    ctaHref: "/api/billing/dodo/checkout?plan=growth",
    features: [
      "Up to 5 active operators",
      "15 connected tools",
      "25,000 actions per month",
      "Suggested workflows",
      "Advanced approval policies",
      "Company memory graph",
      "90-day execution logs",
      "Slack and email approvals",
      "Priority support",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 0,
      operators_limit: 5,
      connectors_limit: 15,
      actions_limit: 25000,
      log_retention_days: 90,
      support_level: "priority",
    },
  },
  {
    plan: "operator",
    plan_tier: "operator",
    plan_name: "Auterim OS Operator",
    price: "$2,500",
    period: "/mo",
    tagline: "For companies that want their first AI operating layer implemented with us.",
    billingLabel: "Setup support included",
    cta: "Get Operator",
    ctaHref: "/api/billing/dodo/checkout?plan=operator",
    features: [
      "Revenue Operator implementation",
      "Custom workflow setup",
      "Client onboarding flows",
      "Up to 12 active operators",
      "All standard connectors",
      "100,000 actions per month",
      "Advanced policy guardrails",
      "180-day audit logs",
      "Private onboarding session",
      "Dedicated success support",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 0,
      operators_limit: 12,
      connectors_limit: "standard_all",
      actions_limit: 100000,
      log_retention_days: 180,
      support_level: "dedicated",
      setup_support: "included",
    },
  },
  {
    plan: "enterprise",
    plan_tier: "enterprise",
    plan_name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For regulated, multi-team or high-volume operations.",
    billingLabel: "Annual contract",
    cta: "Contact sales",
    ctaHref: "/contact?sales=enterprise",
    features: [
      "Unlimited operators",
      "Custom connectors and private tools",
      "SSO and SCIM",
      "SOC 2 readiness support",
      "Data residency options",
      "Custom retention and audit logs",
      "Security review",
      "SLA and dedicated success",
      "Procurement support",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 0,
      operators_limit: "unlimited",
      connectors_limit: "custom",
      actions_limit: "custom",
      log_retention_days: "custom",
      support_level: "enterprise",
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

export function resolvePublicPlanCta(
  plan: PricingPlan,
  _userState: PublicUserState,
): { label: string; href: string } {
  if (plan.plan_tier === "enterprise") {
    return { label: plan.cta, href: plan.ctaHref };
  }
  return { label: plan.cta, href: `/api/billing/dodo/checkout?plan=${plan.plan_tier}` };
}

export type BillingEntitlementSnapshot = {
  planTier: CheckoutPlanTier;
  operatorsLimit: number;
  connectorsLimit: number | "standard_all";
  actionsLimit: number;
  logRetentionDays: number;
  canUseRealConnectors: boolean;
  canRunRealActions: boolean;
  supportLevel: "email" | "priority" | "dedicated";
};

export function getBillingEntitlementsForPlan(plan: CheckoutPlanTier): BillingEntitlementSnapshot {
  const selected = pricingPlans.find((p) => p.plan_tier === plan);
  if (!selected) {
    throw new Error(`Unknown checkout plan: ${plan}`);
  }
  if (selected.plan_tier === "starter") {
    return {
      planTier: "starter",
      operatorsLimit: 2,
      connectorsLimit: 5,
      actionsLimit: 2000,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      supportLevel: "email",
    };
  }
  if (selected.plan_tier === "growth") {
    return {
      planTier: "growth",
      operatorsLimit: 5,
      connectorsLimit: 15,
      actionsLimit: 25000,
      logRetentionDays: 90,
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
