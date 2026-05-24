import type { Workspace } from "@/lib/os/types";

export type PlanTier = "preview" | "starter" | "growth" | "operator" | "enterprise";
export type BillingStatus = "preview" | "trialing" | "active" | "past_due" | "canceled";

export interface Entitlements {
  planTier: PlanTier;
  billingStatus: BillingStatus;
  trialEndsAt?: string;
  operatorsLimit: number;
  connectorsLimit: number | "standard_all" | "custom";
  actionsLimit: number | "demo_only";
  logRetentionDays: number | "preview";
  canUseRealConnectors: boolean;
  canRunRealActions: boolean;
  canUseSuggestedWorkflows: boolean;
  canUseAdvancedPolicies: boolean;
  canUseCompanyMemoryGraph: boolean;
  supportLevel: "none" | "email" | "priority" | "dedicated" | "enterprise";
}

const PREVIEW: Entitlements = {
  planTier: "preview",
  billingStatus: "preview",
  operatorsLimit: 1,
  connectorsLimit: 0,
  actionsLimit: "demo_only",
  logRetentionDays: "preview",
  canUseRealConnectors: false,
  canRunRealActions: false,
  canUseSuggestedWorkflows: true,
  canUseAdvancedPolicies: false,
  canUseCompanyMemoryGraph: true,
  supportLevel: "none",
};

export function resolveWorkspacePlanTier(workspace: Workspace): PlanTier {
  if (workspace.planTier) return workspace.planTier;
  const raw = (workspace.plan || "").toLowerCase();
  if (raw.includes("enterprise")) return "enterprise";
  if (raw.includes("operator")) return "operator";
  if (raw.includes("growth")) return "growth";
  if (raw.includes("starter")) return "starter";
  return "preview";
}

export function resolveWorkspaceBillingStatus(workspace: Workspace): BillingStatus {
  if (workspace.billingStatus) return workspace.billingStatus;
  if (workspace.trialEndsAt) {
    return new Date(workspace.trialEndsAt).getTime() > Date.now() ? "trialing" : "canceled";
  }
  return resolveWorkspacePlanTier(workspace) === "preview" ? "preview" : "active";
}

export function getEntitlements(workspace: Workspace): Entitlements {
  const planTier = resolveWorkspacePlanTier(workspace);
  const billingStatus = resolveWorkspaceBillingStatus(workspace);
  const isPaidActive = billingStatus === "active" || billingStatus === "trialing";

  if (planTier === "preview" || !isPaidActive) {
    return {
      ...PREVIEW,
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
    };
  }

  if (planTier === "starter") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 2,
      connectorsLimit: 5,
      actionsLimit: 2000,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: false,
      canUseCompanyMemoryGraph: false,
      supportLevel: "email",
    };
  }

  if (planTier === "growth") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 5,
      connectorsLimit: 15,
      actionsLimit: 25000,
      logRetentionDays: 90,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      supportLevel: "priority",
    };
  }

  if (planTier === "operator") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 12,
      connectorsLimit: "standard_all",
      actionsLimit: 100000,
      logRetentionDays: 180,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      supportLevel: "dedicated",
    };
  }

  return {
    planTier: "enterprise",
    billingStatus,
    trialEndsAt: workspace.trialEndsAt,
    operatorsLimit: Number.MAX_SAFE_INTEGER,
    connectorsLimit: "custom",
    actionsLimit: Number.MAX_SAFE_INTEGER,
    logRetentionDays: 365,
    canUseRealConnectors: true,
    canRunRealActions: true,
    canUseSuggestedWorkflows: true,
    canUseAdvancedPolicies: true,
    canUseCompanyMemoryGraph: true,
    supportLevel: "enterprise",
  };
}

export function isPreviewWorkspace(workspace: Workspace): boolean {
  return getEntitlements(workspace).planTier === "preview" || getEntitlements(workspace).billingStatus === "preview";
}
