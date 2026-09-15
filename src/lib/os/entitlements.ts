import type { Workspace } from "@/lib/os/types";
import { normalizeWorkspacePlanTier, type WorkspacePlanTier } from "@/lib/plan-identity";

export type PlanTier = WorkspacePlanTier;
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
  /** Outcome intelligence is available on Workforce and Scale. */
  insights: boolean;
  features: {
    insights: boolean;
  };
  supportLevel: "none" | "email" | "priority" | "dedicated" | "enterprise";
}

export type WorkspaceAccessSummary = {
  planSlug: WorkspacePlanTier;
  planLabel: string;
  hasPlanIdentity: boolean;
  entitlementState: "preview" | "trial_active" | "active" | "inactive" | "billing_attention";
  hasUsableEntitlement: boolean;
  trialState: "none" | "active" | "ended";
  subscriptionState: BillingStatus;
  operatorCapacity: number;
  connectorCapacity: number | "standard_all" | "custom";
  seatCapacity: number;
};

function canonicalPlanLabel(planTier: WorkspacePlanTier): string {
  if (planTier === "preview") return "Preview";
  if (planTier === "foundation") return "Foundation";
  if (planTier === "workforce") return "Workforce";
  return "Scale";
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
  insights: false,
  features: { insights: false },
  supportLevel: "none",
};

export function resolveWorkspacePlanTier(workspace: Workspace): PlanTier {
  return normalizeWorkspacePlanTier(workspace.planTier ?? workspace.plan) ?? "preview";
}

export function resolveWorkspaceBillingStatus(workspace: Workspace): BillingStatus {
  // Webhook or scheduler delivery can be delayed. A stored `trialing` value
  // must never retain real execution after the provider-supplied end time.
  if (workspace.billingStatus === "trialing" && workspace.trialEndsAt) {
    const trialEnd = new Date(workspace.trialEndsAt).getTime();
    if (Number.isFinite(trialEnd) && trialEnd <= Date.now()) return "canceled";
  }
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

  if (planTier === "preview") {
    return {
      ...PREVIEW,
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
    };
  }

  // Preserve the historical plan's capacity while removing execution
  // entitlement. Configuration and connected systems remain visible after
  // cancellation, but no operator may run until access is restored.
  if (!isPaidActive) {
    const capacity = planTier === "foundation"
      ? { operatorsLimit: 3, connectorsLimit: 3, actionsLimit: 1000, logRetentionDays: 30 }
      : planTier === "workforce"
        ? { operatorsLimit: 8, connectorsLimit: 8, actionsLimit: 5000, logRetentionDays: 90 }
        : planTier === "scale"
          ? { operatorsLimit: 20, connectorsLimit: 20, actionsLimit: 20000, logRetentionDays: 180 }
          : { operatorsLimit: 12, connectorsLimit: "standard_all" as const, actionsLimit: 100000, logRetentionDays: 180 };
    return {
      planTier, billingStatus, trialEndsAt: workspace.trialEndsAt,
      ...capacity, canUseRealConnectors: false, canRunRealActions: false,
      canUseSuggestedWorkflows: true, canUseAdvancedPolicies: false,
      canUseCompanyMemoryGraph: true, insights: false, features: { insights: false },
      supportLevel: "none",
    };
  }

  if (planTier === "foundation") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 3,
      connectorsLimit: 3,
      actionsLimit: 1000,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: false,
      canUseCompanyMemoryGraph: false,
      insights: false,
      features: { insights: false },
      supportLevel: "email",
    };
  }

  if (planTier === "workforce") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 8,
      connectorsLimit: 8,
      actionsLimit: 5000,
      logRetentionDays: 90,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      insights: true,
      features: { insights: true },
      supportLevel: "priority",
    };
  }

  if (planTier === "scale") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 20,
      connectorsLimit: 20,
      actionsLimit: 20000,
      logRetentionDays: 180,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      insights: true,
      features: { insights: true },
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
      insights: true,
      features: { insights: true },
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
    insights: true,
    features: { insights: true },
    supportLevel: "enterprise",
  };
}

export function getWorkspaceAccessSummary(workspace: Workspace): WorkspaceAccessSummary {
  const entitlements = getEntitlements(workspace);
  const planSlug = entitlements.planTier;
  const trialEnd = entitlements.trialEndsAt ? Date.parse(entitlements.trialEndsAt) : Number.NaN;
  const trialState = Number.isFinite(trialEnd) ? (trialEnd > Date.now() && entitlements.billingStatus === "trialing" ? "active" : "ended") : "none";
  const entitlementState = entitlements.billingStatus === "preview" || planSlug === "preview"
    ? "preview"
    : entitlements.billingStatus === "trialing" && trialState === "active"
      ? "trial_active"
      : entitlements.billingStatus === "active"
        ? "active"
        : entitlements.billingStatus === "past_due"
          ? "billing_attention"
          : "inactive";
  return {
    planSlug,
    planLabel: canonicalPlanLabel(planSlug),
    hasPlanIdentity: planSlug !== "preview",
    entitlementState,
    hasUsableEntitlement: entitlements.canRunRealActions,
    trialState,
    subscriptionState: entitlements.billingStatus,
    operatorCapacity: entitlements.operatorsLimit,
    connectorCapacity: entitlements.connectorsLimit,
    seatCapacity: planSlug === "preview" ? 3 : planSlug === "foundation" ? 3 : planSlug === "workforce" ? 8 : 20,
  };
}

/** Authoritative server/client-safe feature check shared by Insights UI and API routes. */
export function canAccessInsights(workspace: Workspace): boolean {
  return getEntitlements(workspace).features.insights;
}

export function isPreviewWorkspace(workspace: Workspace): boolean {
  return getEntitlements(workspace).planTier === "preview" || getEntitlements(workspace).billingStatus === "preview";
}
