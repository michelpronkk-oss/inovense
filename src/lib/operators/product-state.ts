// Shared operator product-state model (Pass 2B).
//
// Single place that turns the already-authoritative sources - OperatorReadiness
// (readiness.ts, which itself already folds in the shared capability graph and
// real execution eligibility), OperatorActivationState (activation.ts), and
// real connector truth/impact (connectors/truth.ts + connector-requirements.ts)
// - into one concise, deterministic product state per operator. Nothing here
// re-derives readiness, billing eligibility, or capability graphs; it only
// combines results that already exist elsewhere.
//
// computeOperatorProductState() is the pure precedence decision (no IO, no
// cross-file value dependency at all - only type imports, which a TS
// transform erases at runtime). getWorkspaceOperatorProductStates() is the
// IO-loading wrapper real routes call. Every consumer (`/app/agents`,
// dashboard lifecycle, the connectors page, and the three operator detail
// pages) must go through one of these two functions - never re-derive a
// competing "configured/available/ready" vocabulary locally.

import { getOperatorActivationState, type OperatorActivationState } from "@/lib/operators/activation";
import { getWorkspaceOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import {
  getOperatorConnectorReadiness,
  getConnectedRequiredConnectorKeys,
  getWorkspaceConnectorImpact,
  getRequiredConnectorHealth,
  type RequiredCapabilityHealth,
} from "@/lib/operators/connector-requirements";
import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { humanizeCapabilities } from "@/lib/operators/capability-labels";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** The live operators with shared product state. Other registry entries remain previews/planned. */
export const REAL_OPERATOR_KEYS: OperatorKey[] = ["revenue", "client_flow", "operations", "support"];

export type OperatorProductState =
  | "needs_setup"
  | "needs_attention"
  | "ready_to_activate"
  | "plan_required"
  | "billing_attention"
  | "suspended"
  | "paused"
  | "active"
  | "active_limited"
  | "enhanced";

export type OperatorAttentionSeverity = "informational" | "attention" | "blocking";

export type OperatorRemediation = {
  connectorKey: string;
  connectorName: string;
  severity: OperatorAttentionSeverity;
  label: string;
  href: string;
  reason: string;
  impact: string;
};

export type OperatorDegradedInfo = {
  /** Display names, not raw connector keys. */
  unhealthyConnectors: string[];
  lostCapabilities: string[];
  stillAvailableCapabilities: string[];
  impact: "required" | "optional";
  issues: OperatorRemediation[];
};

export type OperatorProductStateResult = {
  operatorKey: OperatorKey;
  operatorName: string;
  state: OperatorProductState;
  label: string;
  description: string;
  connectedSystems: string[];
  connectedCoreSystems: string[];
  availableNow: string[];
  nextAction: { label: string; href: string } | null;
  lifecycle: "available_to_unlock" | "ready_to_activate" | "active" | "paused";
  health: "healthy" | "limited_context" | "needs_attention" | "billing_attention";
  impact: string;
  missingCoreCapabilities: string[];
  missingOptionalCapabilities: string[];
  requiredActions: OperatorRemediation[];
  /** Non-null only when an optional (enhancement) or required connector for this operator is currently unhealthy. Independent of `state` - an operator can be `active` and still carry a `degraded` (enhancement-only) entry. */
  degraded: OperatorDegradedInfo | null;
};

type OperatorCoreConfiguration = {
  ready: boolean;
  connectorKey: string | null;
};

/**
 * The one deterministic precedence decision (STATE PRECEDENCE):
 *   1. Hard requirements missing / not built yet -> needs_setup (always wins)
 *   2. Required connector present but unhealthy -> needs_attention
 *   3. Billing/plan ineligible -> plan_required | billing_attention | suspended
 *   4. Explicitly turned off after being set up -> paused
 *   5. Ready, never activated -> ready_to_activate
 *   6/7. Running -> active, or enhanced when a real optional capability is also live
 *
 * Pure: takes already-resolved primitives, performs no IO, and imports
 * nothing but types, so it can be executed directly in a runtime test
 * without stubbing any cross-module dependency.
 */
export function computeOperatorProductState(input: {
  readiness: Pick<OperatorReadiness, "status" | "executionEligibility">;
  activation: Pick<OperatorActivationState, "activated" | "activatedAt" | "deactivatedAt"> | null;
  requiredConnectorHealth: RequiredCapabilityHealth;
  hasHealthyOptionalCapability: boolean;
  hasOptionalDegradation?: boolean;
}): OperatorProductState {
  const { readiness, activation, requiredConnectorHealth, hasOptionalDegradation = false } = input;

  const activated = Boolean(activation?.activated);
  const everActivated = Boolean(activation?.activatedAt || activation?.deactivatedAt);

  // Planned operators are not runnable regardless of saved activation state.
  if (readiness.status === "coming_next") return "needs_setup";

  // Once legitimately activated, missing or unhealthy core capability is an
  // operational failure, not onboarding. Inactive operators remain unlockable.
  if (requiredConnectorHealth === "missing" || readiness.status === "missing_connector") {
    return activated ? "needs_attention" : "needs_setup";
  }

  // 2. Required connector present but currently unhealthy (it was set up, then broke).
  if (requiredConnectorHealth === "unhealthy") return activated ? "needs_attention" : "needs_setup";

  // 3. Billing/plan ineligibility - checked before activation, since real
  // execution cannot happen either way once hard requirements are met.
  // readiness.status === "upgrade_required" (operator not on this plan tier)
  // folds in here too - for the three real operators this only ever
  // co-occurs with executionEligibility.status "plan_required" (preview
  // tier), so it is never a competing/contradictory signal.
  const eligibility = readiness.executionEligibility;
  if (readiness.status === "upgrade_required" || !eligibility.eligible) {
    if (eligibility.status === "billing_attention") return "billing_attention";
    if (eligibility.status === "suspended") return "suspended";
    return "plan_required";
  }

  // 4. Explicitly turned off after being set up (distinct from never having been turned on).
  if (!activated && everActivated) return "paused";

  // 5. Ready and eligible, but never activated.
  if (!activated) return "ready_to_activate";

  // Running operators stay active. Optional connector degradation is exposed
  // as limited context while their core responsibility continues normally.
  return hasOptionalDegradation ? "active_limited" : "active";
}

const STATE_LABEL: Record<OperatorProductState, string> = {
  needs_setup: "Available to unlock",
  needs_attention: "Needs attention",
  ready_to_activate: "Ready to activate",
  plan_required: "Plan required",
  billing_attention: "Billing needs attention",
  suspended: "Billing suspended",
  paused: "Paused",
  active: "Active",
  active_limited: "Active · Limited context",
  enhanced: "Active",
};

function coreResponsibility(operatorKey: OperatorKey): string {
  if (operatorKey === "revenue") return "Revenue monitoring and approval-gated follow-up";
  if (operatorKey === "client_flow") return "Customer email monitoring and approval-gated replies";
  if (operatorKey === "support") return "Support request monitoring and approval-gated responses";
  return "Project monitoring and approval-gated operational updates";
}

/** Copy translation only - never exposes capability ids, "execution eligibility", or raw billing enum values to customers. */
function describeState(input: {
  state: OperatorProductState;
  operatorName: string;
  operatorKey: OperatorKey;
  nextSetupStep: string;
  degraded: OperatorDegradedInfo | null;
}): string {
  const { state, operatorName, operatorKey, nextSetupStep, degraded } = input;
  switch (state) {
    case "needs_setup":
      return nextSetupStep || `Connect a required system to set up ${operatorName}.`;
    case "needs_attention":
      return degraded?.issues[0]?.impact ?? `${coreResponsibility(operatorKey)} is unavailable until its required connection is restored.`;
    case "plan_required":
      return "Your setup is complete. Start a plan to begin continuous execution.";
    case "billing_attention":
      return "Billing needs attention. Continuous work is paused until this is resolved.";
    case "suspended":
      return "Billing is suspended. Continuous work cannot run until this is resolved.";
    case "paused":
      return "Auterim will keep your configuration but stop continuous monitoring.";
    case "ready_to_activate":
      return `Your setup is ready. Turn on ${operatorName} to start continuous monitoring.`;
    case "enhanced":
      return `${operatorName} is monitoring with added context from connected systems.`;
    case "active_limited":
      return degraded?.issues[0]?.impact ?? `${operatorName} is active with temporarily limited optional context.`;
    case "active":
    default:
      return `${operatorName} is monitoring and holding risky actions for approval.`;
  }
}

function nextActionFor(state: OperatorProductState, operatorHref: string, remediation: OperatorRemediation | null, operatorKey: OperatorKey): { label: string; href: string } | null {
  switch (state) {
    case "needs_setup":
      return operatorKey === "operations"
        ? { label: "Add project management", href: "/connectors?discover=1&category=project_management" }
        : operatorKey === "support"
          ? { label: "Add customer support", href: "/connectors?discover=1&category=support" }
        : { label: "Add customer communication", href: "/connectors?discover=1&category=email_calendar" };
    case "needs_attention":
    case "active_limited":
      return remediation ? { label: remediation.label, href: remediation.href } : { label: "Review connections", href: "/connectors" };
    case "ready_to_activate":
      return { label: "Activate", href: operatorHref };
    case "plan_required":
      return { label: "Start plan", href: "/plans" };
    case "billing_attention":
    case "suspended":
      return { label: "Update billing", href: "/plans" };
    case "paused":
      return { label: "Resume", href: operatorHref };
    case "active":
    case "enhanced":
    default:
      return { label: "Open operator", href: operatorHref };
  }
}

function connectedKeysFromTruth(truth: SafeConnectorTruth[]): string[] {
  return truth.filter((row) => row.status === "connected" || row.status === "healthy").map((row) => row.connectorKey);
}

function unhealthyConnectorKeys(truth: SafeConnectorTruth[]): string[] {
  return truth.filter((row) => row.status === "reconnect_required" || row.status === "error").map((row) => row.connectorKey);
}

function connectorDisplayName(connectorKey: string): string {
  return getConnectorDefinition(connectorKey)?.displayName ?? connectorKey;
}

function connectorRemediationHref(connectorKey: string): string {
  return `/connectors?setup=${encodeURIComponent(connectorKey)}`;
}

function remediationImpact(input: { operatorKey: OperatorKey; connectorName: string; impact: "required" | "optional"; lostCapabilities: string[] }): string {
  const lost = input.lostCapabilities.join(", ").toLowerCase();
  if (input.impact === "required") {
    if (input.operatorKey === "client_flow") return `Customer communication is unavailable because ${input.connectorName} needs attention. Client Flow cannot monitor new customer messages until this is fixed.`;
    if (input.operatorKey === "revenue") return `Revenue monitoring is unavailable because ${input.connectorName} needs attention. New opportunities cannot be monitored until this is fixed.`;
    if (input.operatorKey === "support") return `Customer support is unavailable because ${input.connectorName} needs attention. New support work cannot be monitored until this is fixed.`;
    return `Project monitoring is unavailable because ${input.connectorName} needs attention. Operations cannot monitor project work until this is fixed.`;
  }
  if (input.operatorKey === "client_flow") return `${input.connectorName} is unavailable, so ${lost || "optional context"} is temporarily limited. Customer email monitoring and approval-gated replies continue normally.`;
  if (input.operatorKey === "revenue") return `${input.connectorName} is unavailable, so ${lost || "optional context"} is temporarily limited. Revenue monitoring and approval-gated follow-up continue normally.`;
  if (input.operatorKey === "support") return `${input.connectorName} is unavailable, so ${lost || "optional context"} is temporarily limited. Core support monitoring and approval-gated responses continue normally.`;
  return `${input.connectorName} is unavailable, so ${lost || "optional context"} is temporarily limited. Core project monitoring continues normally.`;
}

/** Degraded info independent of `state`: any unhealthy connector (required or optional) currently affecting this operator, real-data derived via getWorkspaceConnectorImpact. Never destroys saved configuration - purely descriptive. */
function computeDegraded(operatorKey: OperatorKey, truth: SafeConnectorTruth[]): OperatorDegradedInfo | null {
  const unhealthyKeys = unhealthyConnectorKeys(truth);
  if (!unhealthyKeys.length) return null;

  const affectingKeys: string[] = [];
  const issues: OperatorRemediation[] = [];
  const lostCapabilities = new Set<string>();
  const stillAvailableCapabilities = new Set<string>();

  for (const connectorKey of unhealthyKeys) {
    const impact = getWorkspaceConnectorImpact({ connectorKey, workspaceConnectorTruth: truth });
    const forThisOperator = impact.affectedOperators.find((entry) => entry.operatorKey === operatorKey);
    if (!forThisOperator) continue;
    affectingKeys.push(connectorKey);
    for (const capability of forThisOperator.lostCapabilities) lostCapabilities.add(capability);
    for (const capability of forThisOperator.stillAvailableCapabilities) stillAvailableCapabilities.add(capability);
    const connectorName = connectorDisplayName(connectorKey);
    const humanLost = humanizeCapabilities(forThisOperator.lostCapabilities);
    const issueImpact = forThisOperator.impact === "hard_requirement" ? "required" : "optional";
    issues.push({
      connectorKey,
      connectorName,
      severity: issueImpact === "required" ? "blocking" : "attention",
      label: `Fix ${connectorName}`,
      href: connectorRemediationHref(connectorKey),
      reason: `${connectorName} needs to be reconnected.`,
      impact: remediationImpact({ operatorKey, connectorName, impact: issueImpact, lostCapabilities: humanLost }),
    });
  }

  if (!affectingKeys.length) return null;
  return {
    unhealthyConnectors: affectingKeys.map(connectorDisplayName),
    lostCapabilities: humanizeCapabilities(Array.from(lostCapabilities)),
    stillAvailableCapabilities: humanizeCapabilities(Array.from(stillAvailableCapabilities)),
    impact: issues.some((issue) => issue.severity === "blocking") ? "required" : "optional",
    issues,
  };
}

function operatorHref(operatorKey: OperatorKey): string {
  return `/agents/${operatorKey === "client_flow" ? "client-flow" : operatorKey}`;
}

/**
 * Builds the full product-state result for one operator from already-loaded
 * readiness/activation/truth. Used by both the batch loader below and by any
 * caller that already has these three pieces loaded this request (avoiding a
 * duplicate round trip).
 */
export function buildOperatorProductState(input: {
  readiness: OperatorReadiness;
  activation: OperatorActivationState | null;
  truth: SafeConnectorTruth[];
  coreConfiguration?: OperatorCoreConfiguration;
}): OperatorProductStateResult {
  const { readiness, activation, truth } = input;
  const operator = getOperatorDefinition(readiness.operatorKey);
  const operatorName = operator?.name ?? readiness.operatorKey;
  const connectedKeys = connectedKeysFromTruth(truth);
  const optionalReadiness = getOperatorConnectorReadiness(readiness.operatorKey, connectedKeys);
  const requiredConnectorHealth = input.coreConfiguration?.ready === false
    ? "missing"
    : getRequiredConnectorHealth(readiness.operatorKey, truth);
  const hasHealthyOptionalCapability = Boolean(optionalReadiness && optionalReadiness.satisfiedOptional.length > 0);
  const degraded = computeDegraded(readiness.operatorKey, truth);

  const state = computeOperatorProductState({
    readiness,
    activation,
    requiredConnectorHealth,
    hasHealthyOptionalCapability,
    hasOptionalDegradation: degraded?.impact === "optional",
  });

  const readinessModel = optionalReadiness;
  const missingCoreCapabilities = humanizeCapabilities(readinessModel?.missingRequired ?? []);
  const missingOptionalCapabilities = humanizeCapabilities(readinessModel?.missingOptional ?? []);
  const configurationAction: OperatorRemediation | null = input.coreConfiguration?.ready === false && input.coreConfiguration.connectorKey
    ? {
        connectorKey: input.coreConfiguration.connectorKey,
        connectorName: connectorDisplayName(input.coreConfiguration.connectorKey),
        severity: activation?.activated ? "blocking" : "informational",
        label: `Configure ${connectorDisplayName(input.coreConfiguration.connectorKey)}`,
        href: `/connectors?setup=${input.coreConfiguration.connectorKey}-project`,
        reason: `Choose the ${connectorDisplayName(input.coreConfiguration.connectorKey)} project this operator may monitor.`,
        impact: activation?.activated
          ? "Core project monitoring cannot continue until a bounded project scope is selected."
          : "A bounded project scope is required before Operations can be activated.",
      }
    : null;
  const requiredActions = [...(configurationAction ? [configurationAction] : []), ...(degraded?.issues ?? [])];
  const lifecycle = state === "needs_setup" ? "available_to_unlock" : state === "ready_to_activate" ? "ready_to_activate" : state === "paused" ? "paused" : "active";
  const health = state === "needs_attention" ? "needs_attention" : state === "active_limited" ? "limited_context" : state === "billing_attention" || state === "suspended" || state === "plan_required" ? "billing_attention" : "healthy";
  const impact = state === "active_limited"
    ? "Core work continues with reduced optional context."
    : state === "needs_attention"
      ? "Core work is blocked until the required connection is restored."
      : state === "active"
        ? "Core work is running normally."
        : "No operator work is currently running.";

  return {
    operatorKey: readiness.operatorKey,
    operatorName,
    state,
    label: STATE_LABEL[state],
    description: describeState({ state, operatorName, operatorKey: readiness.operatorKey, nextSetupStep: readiness.nextSetupStep, degraded }),
    connectedSystems: (readiness.availableConnectorKeys ?? readiness.connectedRequiredConnectors).map(connectorDisplayName),
    connectedCoreSystems: getConnectedRequiredConnectorKeys(readiness.operatorKey, input.truth).map(connectorDisplayName),
    availableNow: readiness.availableBusinessActions ?? humanizeOperatorActions(readiness.availableActions ?? []),
    nextAction: nextActionFor(state, operatorHref(readiness.operatorKey), requiredActions[0] ?? null, readiness.operatorKey),
    lifecycle,
    health,
    impact,
    missingCoreCapabilities,
    missingOptionalCapabilities,
    requiredActions,
    degraded,
  };
}

/**
 * IO-loading entry point: loads live readiness (readiness.ts), real
 * activation state (activation.ts), and real connector truth
 * (connectors/truth.ts) for the workspace's three real operators, then
 * builds each one's product state. This is the single function `/app/agents`,
 * the dashboard, and the connectors page should call for this - never
 * re-derive readiness/activation/truth locally.
 */
export async function getWorkspaceOperatorProductStates(input: {
  workspaceId: string;
  supabase?: SupabaseAdmin;
}): Promise<OperatorProductStateResult[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [readinessList, truth, workspacePolicy, projectCredentials] = await Promise.all([
    getWorkspaceOperatorReadiness({ workspaceId: input.workspaceId }),
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    loadWorkspacePolicySettings({ workspaceId: input.workspaceId, supabase }),
    supabase.from("os_connector_credentials").select("connector_key,metadata").eq("workspace_id", input.workspaceId).in("connector_key", ["asana", "jira"]),
  ]);

  const credentialMetadata = new Map((projectCredentials.data ?? []).map((row) => [String(row.connector_key), (row.metadata ?? {}) as Record<string, unknown>]));
  const healthyProjectKeys = truth.filter((row) => ["trello", "asana", "jira"].includes(row.connectorKey) && (row.status === "connected" || row.status === "healthy")).map((row) => row.connectorKey);
  const configuredProjectKey = healthyProjectKeys.find((connectorKey) => {
    if (connectorKey === "trello") return Boolean(workspacePolicy.trello.defaultBoardId && workspacePolicy.trello.defaultListId);
    const metadata = credentialMetadata.get(connectorKey);
    return Boolean(metadata && typeof metadata.selectedProjectId === "string" && metadata.selectedProjectId);
  }) ?? null;
  const operationsConfiguration: OperatorCoreConfiguration = {
    ready: configuredProjectKey !== null,
    connectorKey: configuredProjectKey ?? healthyProjectKeys[0] ?? null,
  };

  const realReadiness = readinessList.filter((item) => REAL_OPERATOR_KEYS.includes(item.operatorKey));
  const activationStates = await Promise.all(
    realReadiness.map((item) => getOperatorActivationState({ workspaceId: input.workspaceId, operatorKey: item.operatorKey, supabase })),
  );

  return realReadiness.map((readiness, index) => buildOperatorProductState({
    readiness,
    activation: activationStates[index],
    truth,
    coreConfiguration: readiness.operatorKey === "operations" ? operationsConfiguration : undefined,
  }));
}

export async function getOperatorProductState(input: {
  workspaceId: string;
  operatorKey: string;
}): Promise<OperatorProductStateResult | null> {
  if (!REAL_OPERATOR_KEYS.includes(input.operatorKey as OperatorKey)) return null;
  const all = await getWorkspaceOperatorProductStates({ workspaceId: input.workspaceId });
  return all.find((item) => item.operatorKey === input.operatorKey) ?? null;
}
