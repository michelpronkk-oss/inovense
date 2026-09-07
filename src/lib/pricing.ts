import { getPublicSignInHref, getPublicWorkspaceCta, type PublicUserState } from "@/lib/public-user-state";
import { appHref } from "@/lib/urls";

// `starter` and `growth` are persisted legacy keys for Foundation and
// Workforce. Keep them stable so current workspaces and Dodo subscriptions
// continue to resolve. `operator` remains a legacy billed tier; it is not a
// self-serve offer.
export type PublicPlanTier = "starter" | "growth" | "scale";
export type LegacyBillingPlanTier = "operator";
export type BillingPlanTier = PublicPlanTier | LegacyBillingPlanTier;
export type CheckoutPlanTier = PublicPlanTier;

// Explicit commercial ordering. Do not infer upgrade paths alphabetically.
export const SELF_SERVE_PLAN_ORDER: readonly CheckoutPlanTier[] = ["starter", "growth", "scale"];

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
  ctaHref: string;
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

export const dodoProductEnvKeys = {
  starter: "DODO_PRODUCT_STARTER",
  growth: "DODO_PRODUCT_GROWTH",
  scale: "DODO_PRODUCT_SCALE",
  operator: "DODO_PRODUCT_OPERATOR",
} as const satisfies Record<BillingPlanTier, string>;

export const pricingPlans: PricingPlan[] = [
  {
    plan: "starter",
    plan_tier: "starter",
    plan_name: "Foundation",
    price: "$99",
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
    price: "$299",
    period: "/mo",
    tagline: "Run essential work across teams with control.",
    billingLabel: "3-day trial included",
    badge: "Recommended",
    featured: true,
    cta: "Choose Workforce",
    ctaHref: appHref("/api/billing/dodo/checkout?plan=growth"),
    features: [
      "Up to 8 active operators",
      "Up to 8 connected systems",
      "5,000 controlled runs per month",
      "Advanced approval policies",
      "Company memory and audit history",
      "3-day trial included",
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
    plan_name: "Scale",
    price: "$799",
    period: "/mo",
    tagline: "Scale AI operations across more systems and workflows.",
    billingLabel: "3-day trial included",
    cta: "Choose Scale",
    ctaHref: appHref("/api/billing/dodo/checkout?plan=scale"),
    features: [
      "Up to 20 active operators",
      "Up to 20 connected systems",
      "20,000 controlled runs per month",
      "Advanced approval policies",
      "Company memory and audit history",
      "Priority support",
      "3-day trial included",
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

export function resolvePublicPlanCta(
  plan: PricingPlan,
  userState: PublicUserState,
): { label: string; href: string } {
  if (userState !== "signed_in") {
    if (userState === "guest" || userState === "registered" || userState === "loading") {
      return { label: "Sign in to choose", href: getPublicSignInHref() };
    }
    const workspaceCta = getPublicWorkspaceCta(userState);
    return { label: "Complete setup", href: workspaceCta.href };
  }
  return { label: plan.cta, href: appHref(`/api/billing/dodo/checkout?plan=${plan.plan_tier}`) };
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
