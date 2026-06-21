import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getEntitlements, type Entitlements, type PlanTier } from "@/lib/os/entitlements";
import type { Workspace } from "@/lib/os/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getOperatorDefinition, OPERATOR_REGISTRY, type ConnectorKey, type OperatorDefinition, type OperatorKey } from "@/lib/operators/registry";

export type OperatorReadinessStatus =
  | "ready"
  | "draft_only"
  | "missing_connector"
  | "upgrade_required"
  | "coming_next"
  | "preview";

export type OperatorReadiness = {
  operatorKey: OperatorKey;
  status: OperatorReadinessStatus;
  readinessPercent: number;
  missingRequiredConnectors: ConnectorKey[];
  connectedRequiredConnectors: ConnectorKey[];
  optionalConnectors: ConnectorKey[];
  availableActions: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  reason: string;
};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function connectorConnected(connectorKey: ConnectorKey, truth: SafeConnectorTruth[]): boolean {
  if (connectorKey !== "gmail" && connectorKey !== "hubspot") return false;
  return truth.some((connector) =>
    connector.connectorKey === connectorKey
    && (connector.status === "connected" || connector.status === "healthy")
  );
}

function getConnectedRequiredConnectors(operator: OperatorDefinition, truth: SafeConnectorTruth[]): ConnectorKey[] {
  return operator.requiredConnectors.filter((connector) => connectorConnected(connector, truth));
}

function planAllows(operator: OperatorDefinition, planTier: PlanTier): boolean {
  return operator.planAvailability.includes(planTier);
}

function getNextConnectorStep(missing: ConnectorKey[]): string {
  const first = missing[0];
  if (first === "gmail") return "Connect Gmail with real OAuth.";
  if (first === "hubspot") return "Connect HubSpot through Nango.";
  if (first) return `Connect ${first.replace(/_/g, " ")}.`;
  return "No connector setup required.";
}

function readinessPercent(operator: OperatorDefinition, connectedRequired: ConnectorKey[], missingRequired: ConnectorKey[], status: OperatorReadinessStatus): number {
  if (status === "coming_next") return 0;
  if (status === "preview") return 25;
  if (status === "upgrade_required") return 40;
  if (operator.requiredConnectors.length === 0) return status === "ready" ? 100 : 50;
  const connectorScore = Math.round((connectedRequired.length / operator.requiredConnectors.length) * 80);
  if (status === "ready") return Math.max(90, connectorScore + 20);
  if (status === "draft_only") return Math.max(65, connectorScore);
  if (missingRequired.length > 0) return Math.max(10, connectorScore);
  return connectorScore;
}

function baseResult(input: {
  operator: OperatorDefinition;
  status: OperatorReadinessStatus;
  connectedRequired: ConnectorKey[];
  missingRequired: ConnectorKey[];
  entitlements: Entitlements;
  reason: string;
  nextSetupStep: string;
  canRunManual?: boolean;
}): OperatorReadiness {
  const canRunManual = Boolean(input.canRunManual);
  return {
    operatorKey: input.operator.key,
    status: input.status,
    readinessPercent: readinessPercent(input.operator, input.connectedRequired, input.missingRequired, input.status),
    missingRequiredConnectors: input.missingRequired,
    connectedRequiredConnectors: input.connectedRequired,
    optionalConnectors: input.operator.optionalConnectors,
    availableActions: input.operator.allowedActions,
    approvalRequiredActions: input.operator.approvalRequiredActions,
    blockedActions: input.operator.blockedActions,
    nextSetupStep: input.nextSetupStep,
    canRunManual,
    canExecuteRealActions: canRunManual && input.entitlements.canRunRealActions,
    reason: input.reason,
  };
}

async function getWorkspace(workspaceId: string, supabase: SupabaseAdmin): Promise<Workspace> {
  const workspace = await supabase
    .from("os_workspaces")
    .select("id,name,environment,region,plan,plan_tier,billing_status,trial_ends_at,dodo_customer_id,dodo_subscription_id,dodo_product_id")
    .eq("id", workspaceId)
    .single();

  if (workspace.error || !workspace.data) {
    throw new Error(workspace.error?.message || "Workspace not found.");
  }

  return {
    id: workspace.data.id,
    name: workspace.data.name,
    environment: workspace.data.environment,
    region: workspace.data.region,
    plan: workspace.data.plan,
    planTier: workspace.data.plan_tier,
    billingStatus: workspace.data.billing_status,
    trialEndsAt: workspace.data.trial_ends_at ?? undefined,
    dodoCustomerId: workspace.data.dodo_customer_id ?? undefined,
    dodoSubscriptionId: workspace.data.dodo_subscription_id ?? undefined,
    dodoProductId: workspace.data.dodo_product_id ?? undefined,
  };
}

async function hasWorkspaceApprovalActivity(workspaceId: string, supabase: SupabaseAdmin): Promise<boolean> {
  const approvals = await supabase
    .from("os_approvals")
    .select("id, continuation_payload")
    .limit(100);

  if (approvals.error || !approvals.data?.length) return false;
  return approvals.data.some((approval) => {
    const payload = approval.continuation_payload as { workspaceId?: string } | null;
    return payload?.workspaceId === workspaceId;
  });
}

async function getWorkspaceRuntimeSignals(workspaceId: string, supabase: SupabaseAdmin) {
  return {
    hasApprovalActivity: await hasWorkspaceApprovalActivity(workspaceId, supabase),
    hasWorkspaceScopedLogs: false,
  };
}

function evaluateOperator(input: {
  operator: OperatorDefinition;
  truth: SafeConnectorTruth[];
  entitlements: Entitlements;
  runtimeSignals: { hasApprovalActivity: boolean; hasWorkspaceScopedLogs: boolean };
}): OperatorReadiness {
  const { operator, truth, entitlements, runtimeSignals } = input;
  const connectedRequired = getConnectedRequiredConnectors(operator, truth);
  const missingRequired = operator.requiredConnectors.filter((connector) => !connectedRequired.includes(connector));

  if (operator.currentReleaseStatus === "coming_next") {
    return baseResult({
      operator,
      status: "coming_next",
      connectedRequired,
      missingRequired,
      entitlements,
      reason: "This operator is not built yet.",
      nextSetupStep: "No setup is required yet.",
    });
  }

  if (!planAllows(operator, entitlements.planTier)) {
    return baseResult({
      operator,
      status: "upgrade_required",
      connectedRequired,
      missingRequired,
      entitlements,
      reason: `${operator.name} is not available on the ${entitlements.planTier} plan.`,
      nextSetupStep: "Upgrade the workspace plan.",
    });
  }

  if (operator.currentReleaseStatus === "preview") {
    return baseResult({
      operator,
      status: "preview",
      connectedRequired,
      missingRequired,
      entitlements,
      reason: "This operator is available as a preview planning surface only.",
      nextSetupStep: missingRequired.length ? getNextConnectorStep(missingRequired) : "Review preview capabilities.",
      canRunManual: false,
    });
  }

  if (operator.key === "revenue") {
    const hasGmail = connectorConnected("gmail", truth);
    const hasHubSpot = connectorConnected("hubspot", truth);
    if (!hasGmail) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        reason: "Revenue readiness requires a real Gmail credential.",
        nextSetupStep: "Connect Gmail with real OAuth.",
      });
    }
    if (!hasHubSpot) {
      return baseResult({
        operator,
        status: "draft_only",
        connectedRequired,
        missingRequired: [],
        entitlements,
        reason: "Gmail is connected, so draft and approval work is available. HubSpot is missing, so CRM execution is disabled.",
        nextSetupStep: "Connect HubSpot through Nango for full revenue readiness.",
        canRunManual: true,
      });
    }
    return baseResult({
      operator,
      status: "ready",
      connectedRequired: ["gmail"],
      missingRequired: [],
      entitlements,
      reason: "Gmail and HubSpot connector truth are both present.",
      nextSetupStep: "Ready for approval-gated Gmail send and HubSpot contact/deal updates.",
      canRunManual: true,
    });
  }

  if (operator.key === "client_flow") {
    if (!connectorConnected("gmail", truth)) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        reason: "Client Flow requires a real Gmail credential for safe draft preparation.",
        nextSetupStep: "Connect Gmail with real OAuth.",
      });
    }
    return baseResult({
      operator,
      status: "draft_only",
      connectedRequired,
      missingRequired: [],
      entitlements,
      reason: "Gmail is connected. Drive/Notion context is not available yet, so readiness is limited to draft preparation.",
      nextSetupStep: "Connect Drive or Notion when those connector truth checks are available.",
      canRunManual: true,
    });
  }

  if (operator.key === "operations") {
    if (!connectorConnected("gmail", truth)) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        reason: "Operations readiness requires Gmail plus verifiable approval/log activity.",
        nextSetupStep: "Connect Gmail with real OAuth.",
      });
    }
    if (!runtimeSignals.hasApprovalActivity || !runtimeSignals.hasWorkspaceScopedLogs) {
      return baseResult({
        operator,
        status: "draft_only",
        connectedRequired,
        missingRequired: [],
        entitlements,
        reason: "Gmail is connected, but approval/log activity is not fully workspace-scoped yet.",
        nextSetupStep: "Add workspace-scoped approval and execution log tables before marking Operations ready.",
        canRunManual: true,
      });
    }
    return baseResult({
      operator,
      status: "ready",
      connectedRequired,
      missingRequired: [],
      entitlements,
      reason: "Gmail, approvals, and workspace-scoped logs are available.",
      nextSetupStep: "Ready for manual preparation once execution is implemented.",
      canRunManual: true,
    });
  }

  if (missingRequired.length > 0) {
    return baseResult({
      operator,
      status: "missing_connector",
      connectedRequired,
      missingRequired,
      entitlements,
      reason: `${operator.name} is missing required connector truth.`,
      nextSetupStep: getNextConnectorStep(missingRequired),
    });
  }

  return baseResult({
    operator,
    status: operator.currentReleaseStatus === "ready" ? "ready" : "preview",
    connectedRequired,
    missingRequired,
    entitlements,
    reason: "Readiness is based on release status, plan, and connector truth.",
    nextSetupStep: "Ready for manual preparation once execution is implemented.",
    canRunManual: operator.currentReleaseStatus === "ready",
  });
}

export async function getWorkspaceOperatorReadiness(input: { workspaceId: string }): Promise<OperatorReadiness[]> {
  const supabase = createSupabaseAdmin();
  const workspace = await getWorkspace(input.workspaceId, supabase);
  const entitlements = getEntitlements(workspace);
  const [truth, runtimeSignals] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    getWorkspaceRuntimeSignals(input.workspaceId, supabase),
  ]);

  return OPERATOR_REGISTRY.map((operator) => evaluateOperator({ operator, truth, entitlements, runtimeSignals }));
}

export async function getOperatorReadiness(input: { workspaceId: string; operatorKey: string }): Promise<OperatorReadiness | null> {
  const operator = getOperatorDefinition(input.operatorKey);
  if (!operator) return null;

  const all = await getWorkspaceOperatorReadiness({ workspaceId: input.workspaceId });
  return all.find((item) => item.operatorKey === operator.key) ?? null;
}
