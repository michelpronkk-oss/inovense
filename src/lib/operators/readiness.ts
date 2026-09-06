import { connectorHasCapability, type Capability } from "@/lib/connectors/capabilities";
import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getOperatorConnectorReadiness, type OperatorConnectorReadiness } from "@/lib/operators/connector-requirements";
import { getEntitlements, type Entitlements, type PlanTier } from "@/lib/os/entitlements";
import { getWorkspaceExecutionEligibilityFromWorkspace, type WorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import type { Workspace } from "@/lib/os/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getOperatorDefinition, OPERATOR_REGISTRY, type ConnectorKey, type OperatorDefinition, type OperatorKey } from "@/lib/operators/registry";
import { getWorkspaceAvailableBusinessActions, type WorkspaceAvailableBusinessActions } from "@/lib/operators/available-business-actions";

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
  availableBusinessActions: string[];
  availableConnectorKeys: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  /**
   * Full workspace billing/plan eligibility detail from
   * getWorkspaceExecutionEligibility() (src/lib/os/execution-eligibility.ts)
   * - the same real, server-enforced billing gate the three operator scan
   * paths check before creating new approvals. `canExecuteRealActions`
   * above is `canRunManual && executionEligibility.eligible`; this field is
   * exposed so Pass 2's UI can show the real reason (trial, plan required,
   * billing attention, suspended) without re-deriving it.
   */
  executionEligibility: WorkspaceExecutionEligibility;
  reason: string;
};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const GENERIC_TRUTH_CONNECTORS: ConnectorKey[] = ["gmail", "hubspot", "microsoft", "trello"];

function connectorConnected(connectorKey: ConnectorKey, truth: SafeConnectorTruth[]): boolean {
  if (!GENERIC_TRUTH_CONNECTORS.includes(connectorKey)) return false;
  return truth.some((connector) =>
    connector.connectorKey === connectorKey
    && (connector.status === "connected" || connector.status === "healthy")
  );
}

/**
 * Connector-agnostic capability check: any connector the workspace actually
 * has connected (status connected/healthy) that provides this capability.
 * This is how Gmail and Microsoft 365 both satisfy "an email connector is
 * connected" without operators special-casing either connector by name, and
 * lets any future email connector light up the same operators automatically.
 */
function connectedConnectorsWithCapability(capability: Capability, truth: SafeConnectorTruth[]): ConnectorKey[] {
  return truth
    .filter((connector) => connector.status === "connected" || connector.status === "healthy")
    .filter((connector) => connectorHasCapability(connector.connectorKey, capability))
    .map((connector) => connector.connectorKey as ConnectorKey);
}

function getConnectedRequiredConnectors(operator: OperatorDefinition, truth: SafeConnectorTruth[]): ConnectorKey[] {
  return operator.requiredConnectors.filter((connector) => connectorConnected(connector, truth));
}

function connectedConnectorKeysFromTruth(truth: SafeConnectorTruth[]): string[] {
  return truth
    .filter((connector) => connector.status === "connected" || connector.status === "healthy")
    .map((connector) => connector.connectorKey);
}

/**
 * The generic capability base every operator branch below builds on top of:
 * which capabilities does this workspace actually have, given real connector
 * truth, per the shared declarative capability graph
 * (OPERATOR_CONNECTOR_REQUIREMENTS in connector-requirements.ts +
 * capabilities.ts). Operator-specific business rules that follow in
 * evaluateOperator() (HubSpot-vs-Salesforce-vs-neither for Revenue, Trello
 * board-selected + proven-run-log activity for Operations, etc.) are
 * additional conditions layered on top of this - they are not
 * re-derivations of "is a required capability connected".
 */
function getWorkspaceCapabilityReadiness(operator: OperatorDefinition, truth: SafeConnectorTruth[]): OperatorConnectorReadiness | null {
  return getOperatorConnectorReadiness(operator.key, connectedConnectorKeysFromTruth(truth));
}

function planAllows(operator: OperatorDefinition, planTier: PlanTier): boolean {
  return operator.planAvailability.includes(planTier);
}

function getNextConnectorStep(missing: ConnectorKey[]): string {
  const first = missing[0];
  if (first === "gmail") return "Connect Gmail with real OAuth.";
  if (first === "microsoft") return "Connect Microsoft 365 with real OAuth.";
  if (first === "hubspot") return "Connect HubSpot through Nango.";
  if (first === "trello") return "Connect Trello and select a default board.";
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

type BaseResultInput = {
  operator: OperatorDefinition;
  status: OperatorReadinessStatus;
  connectedRequired: ConnectorKey[];
  missingRequired: ConnectorKey[];
  entitlements: Entitlements;
  executionEligibility: WorkspaceExecutionEligibility;
  reason: string;
  nextSetupStep: string;
  canRunManual?: boolean;
  availability: WorkspaceAvailableBusinessActions;
};

function buildBaseResult(input: BaseResultInput): OperatorReadiness {
  const canRunManual = Boolean(input.canRunManual);
  return {
    operatorKey: input.operator.key,
    status: input.status,
    readinessPercent: readinessPercent(input.operator, input.connectedRequired, input.missingRequired, input.status),
    missingRequiredConnectors: input.missingRequired,
    connectedRequiredConnectors: input.connectedRequired,
    optionalConnectors: input.operator.optionalConnectors,
    availableActions: canRunManual ? input.availability.actionIds : [],
    availableBusinessActions: canRunManual ? input.availability.labels : [],
    availableConnectorKeys: input.availability.relevantConnectorKeys,
    approvalRequiredActions: input.operator.approvalRequiredActions,
    blockedActions: input.operator.blockedActions,
    nextSetupStep: input.nextSetupStep,
    canRunManual,
    // Real server-side billing enforcement now backs this value - see
    // getWorkspaceExecutionEligibility() and its use in the three operator
    // scan paths, which check the exact same eligibility.eligible boolean
    // before creating new approvals.
    canExecuteRealActions: canRunManual && input.executionEligibility.eligible,
    executionEligibility: input.executionEligibility,
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
  // os_approvals.workspace_id is a real, backfilled column (see
  // 20260618_os_approvals_workspace_scope.sql) - filter at the DB level
  // instead of pulling an unscoped page of rows and matching client-side.
  const approvals = await supabase
    .from("os_approvals")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (approvals.error) return false;
  return Boolean(approvals.data?.length);
}

async function hasWorkspaceScopedLogs(workspaceId: string, supabase: SupabaseAdmin): Promise<boolean> {
  // os_operator_run_logs.workspace_id is `not null references os_workspaces`
  // (see 20260618_os_operator_runtime.sql) and is populated for real by
  // logOperatorEvent() on every operator run step. This is the actual
  // workspace-scoped execution log table - unlike the legacy os_execution_logs
  // table (20260523_os_dashboard_tables.sql), which has no workspace_id column
  // at all and is not workspace-scoped.
  const logs = await supabase
    .from("os_operator_run_logs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (logs.error) return false;
  return Boolean(logs.data?.length);
}

async function getWorkspaceRuntimeSignals(workspaceId: string, supabase: SupabaseAdmin) {
  const [hasApprovalActivity, workspaceScopedLogs] = await Promise.all([
    hasWorkspaceApprovalActivity(workspaceId, supabase),
    hasWorkspaceScopedLogs(workspaceId, supabase),
  ]);
  return {
    hasApprovalActivity,
    hasWorkspaceScopedLogs: workspaceScopedLogs,
  };
}

function evaluateOperator(input: {
  operator: OperatorDefinition;
  truth: SafeConnectorTruth[];
  entitlements: Entitlements;
  executionEligibility: WorkspaceExecutionEligibility;
  runtimeSignals: { hasApprovalActivity: boolean; hasWorkspaceScopedLogs: boolean };
}): OperatorReadiness {
  const { operator, truth, entitlements, executionEligibility, runtimeSignals } = input;
  const connectedRequired = getConnectedRequiredConnectors(operator, truth);
  const missingRequired = operator.requiredConnectors.filter((connector) => !connectedRequired.includes(connector));
  // The shared capability-graph base (connector-requirements.ts +
  // capabilities.ts) every branch below is built on top of - see
  // getWorkspaceCapabilityReadiness's doc comment.
  const capabilityReadiness = getWorkspaceCapabilityReadiness(operator, truth);
  const availability = getWorkspaceAvailableBusinessActions({ operatorKey: operator.key, connectorTruth: truth });
  const baseResult = (result: Omit<BaseResultInput, "availability">) => buildBaseResult({ ...result, availability });

  if (operator.currentReleaseStatus === "coming_next") {
    return baseResult({
      operator,
      status: "coming_next",
      connectedRequired,
      missingRequired,
      entitlements,
      executionEligibility,
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
      executionEligibility,
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
      executionEligibility,
      reason: "This operator is available as a preview planning surface only.",
      nextSetupStep: missingRequired.length ? getNextConnectorStep(missingRequired) : "Review preview capabilities.",
      canRunManual: false,
    });
  }

  if (operator.key === "revenue") {
    // Generic capability base: required = ["email.read", "email.send_after_approval"]
    // (see OPERATOR_CONNECTOR_REQUIREMENTS.revenue). connectedConnectorsWithCapability
    // stays in use only to name *which* connector (Gmail vs Microsoft 365)
    // satisfies it, for downstream connector selection and copy.
    const emailConnectors = connectedConnectorsWithCapability("email.send_after_approval", truth);
    const hasEmail = capabilityReadiness?.ready ?? emailConnectors.length > 0;
    // HubSpot-vs-Salesforce-vs-neither is a Revenue-specific business rule
    // (Revenue's write path is HubSpot-only today, see resolveRevenueCrmProvider
    // in scan.ts) layered on top of the generic capability base, not a
    // redundant connector check.
    const hasHubSpot = connectorConnected("hubspot", truth);
    if (!hasEmail) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        executionEligibility,
        reason: "Revenue readiness requires a connected email connector (Gmail or Microsoft 365).",
        nextSetupStep: "Connect Gmail or Microsoft 365.",
      });
    }
    if (!hasHubSpot) {
      return baseResult({
        operator,
        status: "draft_only",
        connectedRequired: emailConnectors,
        missingRequired: [],
        entitlements,
        executionEligibility,
        reason: `${emailConnectors[0] === "microsoft" ? "Microsoft 365" : "Gmail"} is connected, so draft and approval work is available. HubSpot is missing, so CRM execution is disabled.`,
        nextSetupStep: "Connect HubSpot through Nango for full revenue readiness.",
        canRunManual: true,
      });
    }
    return baseResult({
      operator,
      status: "ready",
      connectedRequired: emailConnectors,
      missingRequired: [],
      entitlements,
      executionEligibility,
      reason: "An email connector and HubSpot connector truth are both present.",
      nextSetupStep: "Ready for approval-gated email send and HubSpot contact/deal updates.",
      canRunManual: true,
    });
  }

  if (operator.key === "client_flow") {
    // Generic capability base: required = ["email.read", "email.send_after_approval"]
    // (see OPERATOR_CONNECTOR_REQUIREMENTS.client_flow).
    const emailConnectors = connectedConnectorsWithCapability("email.send_after_approval", truth);
    const hasEmail = capabilityReadiness?.ready ?? emailConnectors.length > 0;
    if (!hasEmail) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        executionEligibility,
        reason: "Client Flow requires a connected email connector (Gmail or Microsoft 365) for safe draft preparation.",
        nextSetupStep: "Connect Gmail or Microsoft 365.",
      });
    }
    return baseResult({
      operator,
      status: "draft_only",
      connectedRequired: emailConnectors,
      missingRequired: [],
      entitlements,
      executionEligibility,
      reason: `${emailConnectors[0] === "microsoft" ? "Microsoft 365" : "Gmail"} is connected. Drive/Notion context is not available yet, so readiness is limited to draft preparation.`,
      nextSetupStep: "Connect Drive or Notion when those connector truth checks are available.",
      canRunManual: true,
    });
  }

  if (operator.key === "operations") {
    // Operations reads Trello boards directly (see scanOperationsSignals) -
    // without a connected Trello workspace the scan cannot check a single
    // card and returns "setup_incomplete" immediately. Trello is therefore
    // the real hard requirement, not an email connector (Operations does not
    // send or draft email today). Slack stays optional: scan.ts degrades
    // gracefully and only prepares a Trello action when Slack/its channel is
    // not connected. The generic capability base (required: ["pm.tasks.read"],
    // see OPERATOR_CONNECTOR_REQUIREMENTS.operations) is ANDed in here as the
    // shared source of truth - Trello is the only connector today that
    // satisfies it, so this never changes real-world behavior, only where
    // the requirement is declared.
    const missingCapability = capabilityReadiness ? !capabilityReadiness.ready : false;
    if (missingRequired.length > 0 || missingCapability) {
      return baseResult({
        operator,
        status: "missing_connector",
        connectedRequired,
        missingRequired,
        entitlements,
        executionEligibility,
        reason: "Operations readiness requires a connected Trello workspace with a selected default board.",
        nextSetupStep: "Connect Trello and select a default board.",
      });
    }
    if (!runtimeSignals.hasApprovalActivity || !runtimeSignals.hasWorkspaceScopedLogs) {
      return baseResult({
        operator,
        status: "draft_only",
        connectedRequired,
        missingRequired: [],
        entitlements,
        executionEligibility,
        reason: "Trello is connected, but this workspace has no recorded approval or operator run-log activity yet, so Operations has not proven it can run end to end.",
        nextSetupStep: "Run a manual Operations check to generate the first workspace-scoped approval and run log.",
        canRunManual: true,
      });
    }
    return baseResult({
      operator,
      status: "ready",
      connectedRequired,
      missingRequired: [],
      entitlements,
      executionEligibility,
      reason: "Trello is connected, and this workspace has real approval and workspace-scoped run-log activity.",
      nextSetupStep: "Ready for approval-gated Slack updates and Trello card changes.",
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
      executionEligibility,
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
    executionEligibility,
    reason: "Readiness is based on release status, plan, and connector truth.",
    nextSetupStep: "Ready for manual preparation once execution is implemented.",
    canRunManual: operator.currentReleaseStatus === "ready",
  });
}

export async function getWorkspaceOperatorReadiness(input: { workspaceId: string }): Promise<OperatorReadiness[]> {
  const supabase = createSupabaseAdmin();
  const workspace = await getWorkspace(input.workspaceId, supabase);
  const entitlements = getEntitlements(workspace);
  // Same real os_workspaces row already loaded above - no duplicate query.
  const executionEligibility = getWorkspaceExecutionEligibilityFromWorkspace(workspace);
  const [truth, runtimeSignals] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    getWorkspaceRuntimeSignals(input.workspaceId, supabase),
  ]);

  return OPERATOR_REGISTRY.map((operator) => evaluateOperator({ operator, truth, entitlements, executionEligibility, runtimeSignals }));
}

export async function getOperatorReadiness(input: { workspaceId: string; operatorKey: string }): Promise<OperatorReadiness | null> {
  const operator = getOperatorDefinition(input.operatorKey);
  if (!operator) return null;

  const all = await getWorkspaceOperatorReadiness({ workspaceId: input.workspaceId });
  return all.find((item) => item.operatorKey === operator.key) ?? null;
}
