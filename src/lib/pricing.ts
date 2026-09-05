import type { PublicUserState } from "@/lib/public-user-state";
import { appHref } from "@/lib/urls";

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
    plan_name: "Foundation",
    price: "$299",
    period: "/mo",
    tagline: "Deploy your first controlled AI operators.",
    billingLabel: "3-day trial included",
    cta: "Choose Foundation",
    ctaHref: appHref("/api/billing/dodo/checkout?plan=starter"),
    features: [
      "Up to 3 active operators",
      "Up to 3 connected systems",
      "1,000 controlled runs per month",
      "Approval-first execution",
      "Company memory and audit history",
      "30-day execution logs",
      "Email support",
      "3-day trial included",
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
    plan: "growth",
    plan_tier: "growth",
    plan_name: "Workforce",
    price: "$799",
    period: "/mo",
    tagline: "Run essential work across teams with control.",
    billingLabel: "3-day trial included",
    badge: "Most chosen",
    featured: true,
    cta: "Choose Workforce",
    ctaHref: appHref("/api/billing/dodo/checkout?plan=growth"),
    features: [
      "Up to 8 active operators",
      "Up to 8 connected systems",
      "5,000 controlled runs per month",
      "Advanced approval policies",
      "Company memory and audit history",
      "90-day execution logs",
      "Slack and email approvals",
      "Priority support",
      "3-day trial included",
    ],
    metadata: {
      billing_interval: "month",
      trial_days: 3,
      operators_limit: 8,
      connectors_limit: 8,
      actions_limit: 5000,
      log_retention_days: 90,
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

export function resolvePublicPlanCta(
  plan: PricingPlan,
  _userState: PublicUserState,
): { label: string; href: string } {
  void _userState;
  if (plan.plan_tier === "enterprise") {
    return { label: plan.cta, href: plan.ctaHref };
  }
  return { label: plan.cta, href: appHref(`/api/billing/dodo/checkout?plan=${plan.plan_tier}`) };
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
  if (plan === "starter") {
    return {
      planTier: "starter",
      operatorsLimit: 3,
      connectorsLimit: 3,
      actionsLimit: 1000,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      supportLevel: "email",
    };
  }
  if (plan === "growth") {
    return {
      planTier: "growth",
      operatorsLimit: 8,
      connectorsLimit: 8,
      actionsLimit: 5000,
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
