const PREVIEW = {
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
  supportLevel: "none"
};
function resolveWorkspacePlanTier(workspace) {
  if (workspace.planTier) return workspace.planTier;
  const raw = (workspace.plan || "").toLowerCase();
  if (raw.includes("enterprise")) return "enterprise";
  if (raw.includes("operator")) return "operator";
  if (raw.includes("scale")) return "scale";
  if (raw.includes("growth") || raw.includes("workforce")) return "growth";
  if (raw.includes("starter") || raw.includes("foundation")) return "starter";
  return "preview";
}
function resolveWorkspaceBillingStatus(workspace) {
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
function getEntitlements(workspace) {
  const planTier = resolveWorkspacePlanTier(workspace);
  const billingStatus = resolveWorkspaceBillingStatus(workspace);
  const isPaidActive = billingStatus === "active" || billingStatus === "trialing";
  if (planTier === "preview" || !isPaidActive) {
    return {
      ...PREVIEW,
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt
    };
  }
  if (planTier === "starter") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 3,
      connectorsLimit: 3,
      actionsLimit: 1e3,
      logRetentionDays: 30,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: false,
      canUseCompanyMemoryGraph: false,
      insights: false,
      features: { insights: false },
      supportLevel: "email"
    };
  }
  if (planTier === "growth") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 8,
      connectorsLimit: 8,
      actionsLimit: 5e3,
      logRetentionDays: 90,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      insights: true,
      features: { insights: true },
      supportLevel: "priority"
    };
  }
  if (planTier === "scale") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 20,
      connectorsLimit: 20,
      actionsLimit: 2e4,
      logRetentionDays: 180,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      insights: true,
      features: { insights: true },
      supportLevel: "priority"
    };
  }
  if (planTier === "operator") {
    return {
      planTier,
      billingStatus,
      trialEndsAt: workspace.trialEndsAt,
      operatorsLimit: 12,
      connectorsLimit: "standard_all",
      actionsLimit: 1e5,
      logRetentionDays: 180,
      canUseRealConnectors: true,
      canRunRealActions: true,
      canUseSuggestedWorkflows: true,
      canUseAdvancedPolicies: true,
      canUseCompanyMemoryGraph: true,
      insights: true,
      features: { insights: true },
      supportLevel: "dedicated"
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
    supportLevel: "enterprise"
  };
}
function canAccessInsights(workspace) {
  return getEntitlements(workspace).features.insights;
}
function isPreviewWorkspace(workspace) {
  return getEntitlements(workspace).planTier === "preview" || getEntitlements(workspace).billingStatus === "preview";
}
export {
  canAccessInsights,
  getEntitlements,
  isPreviewWorkspace,
  resolveWorkspaceBillingStatus,
  resolveWorkspacePlanTier
};
