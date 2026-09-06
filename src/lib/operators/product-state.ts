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
  getWorkspaceConnectorImpact,
  getRequiredConnectorHealth,
  type RequiredCapabilityHealth,
} from "@/lib/operators/connector-requirements";
import { getOperatorDefinition, type OperatorKey } from "@/lib/operators/registry";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { humanizeCapabilities } from "@/lib/operators/capability-labels";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** The three operators this pass covers. Other registry entries are previews/planned and are out of scope for this state model. */
export const REAL_OPERATOR_KEYS: OperatorKey[] = ["revenue", "client_flow", "operations"];

export type OperatorProductState =
  | "needs_setup"
  | "needs_attention"
  | "ready_to_activate"
  | "plan_required"
  | "billing_attention"
  | "suspended"
  | "paused"
  | "active"
  | "enhanced";

export type OperatorDegradedInfo = {
  /** Display names, not raw connector keys. */
  unhealthyConnectors: string[];
  lostCapabilities: string[];
  stillAvailableCapabilities: string[];
};

export type OperatorProductStateResult = {
  operatorKey: OperatorKey;
  operatorName: string;
  state: OperatorProductState;
  label: string;
  description: string;
  connectedSystems: string[];
  availableNow: string[];
  nextAction: { label: string; href: string } | null;
  /** Non-null only when an optional (enhancement) or required connector for this operator is currently unhealthy. Independent of `state` - an operator can be `active` and still carry a `degraded` (enhancement-only) entry. */
  degraded: OperatorDegradedInfo | null;
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
}): OperatorProductState {
  const { readiness, activation, requiredConnectorHealth, hasHealthyOptionalCapability } = input;

  // 1. Hard requirements missing or not built yet - outranks everything else.
  if (readiness.status === "coming_next") return "needs_setup";
  if (requiredConnectorHealth === "missing" || readiness.status === "missing_connector") return "needs_setup";

  // 2. Required connector present but currently unhealthy (it was set up, then broke).
  if (requiredConnectorHealth === "unhealthy") return "needs_attention";

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

  const activated = Boolean(activation?.activated);
  const everActivated = Boolean(activation?.activatedAt || activation?.deactivatedAt);

  // 4. Explicitly turned off after being set up (distinct from never having been turned on).
  if (!activated && everActivated) return "paused";

  // 5. Ready and eligible, but never activated.
  if (!activated) return "ready_to_activate";

  // 6/7. Running - "enhanced" only when a real optional capability is also live, never forced.
  return hasHealthyOptionalCapability ? "enhanced" : "active";
}

const STATE_LABEL: Record<OperatorProductState, string> = {
  needs_setup: "Needs setup",
  needs_attention: "Needs attention",
  ready_to_activate: "Ready to activate",
  plan_required: "Plan required",
  billing_attention: "Billing needs attention",
  suspended: "Billing suspended",
  paused: "Paused",
  active: "Active",
  enhanced: "Active",
};

/** Copy translation only - never exposes capability ids, "execution eligibility", or raw billing enum values to customers. */
function describeState(input: {
  state: OperatorProductState;
  operatorName: string;
  nextSetupStep: string;
  degraded: OperatorDegradedInfo | null;
}): string {
  const { state, operatorName, nextSetupStep, degraded } = input;
  switch (state) {
    case "needs_setup":
      return nextSetupStep || `Connect a required system to set up ${operatorName}.`;
    case "needs_attention":
      return degraded?.unhealthyConnectors.length
        ? `Reconnect ${degraded.unhealthyConnectors.join(", ")} to resume ${operatorName}.`
        : `Reconnect the affected system to resume ${operatorName}.`;
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
    case "active":
    default:
      return `${operatorName} is monitoring and holding risky actions for approval.`;
  }
}

function nextActionFor(state: OperatorProductState, operatorHref: string): { label: string; href: string } | null {
  switch (state) {
    case "needs_setup":
      return { label: "Connect required system", href: "/connectors" };
    case "needs_attention":
      return { label: "Reconnect system", href: "/connectors" };
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

/** Degraded info independent of `state`: any unhealthy connector (required or optional) currently affecting this operator, real-data derived via getWorkspaceConnectorImpact. Never destroys saved configuration - purely descriptive. */
function computeDegraded(operatorKey: OperatorKey, truth: SafeConnectorTruth[]): OperatorDegradedInfo | null {
  const unhealthyKeys = unhealthyConnectorKeys(truth);
  if (!unhealthyKeys.length) return null;

  const affectingKeys: string[] = [];
  const lostCapabilities = new Set<string>();
  const stillAvailableCapabilities = new Set<string>();

  for (const connectorKey of unhealthyKeys) {
    const impact = getWorkspaceConnectorImpact({ connectorKey, workspaceConnectorTruth: truth });
    const forThisOperator = impact.affectedOperators.find((entry) => entry.operatorKey === operatorKey);
    if (!forThisOperator) continue;
    affectingKeys.push(connectorKey);
    for (const capability of forThisOperator.lostCapabilities) lostCapabilities.add(capability);
    for (const capability of forThisOperator.stillAvailableCapabilities) stillAvailableCapabilities.add(capability);
  }

  if (!affectingKeys.length) return null;
  return {
    unhealthyConnectors: affectingKeys.map(connectorDisplayName),
    lostCapabilities: humanizeCapabilities(Array.from(lostCapabilities)),
    stillAvailableCapabilities: humanizeCapabilities(Array.from(stillAvailableCapabilities)),
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
}): OperatorProductStateResult {
  const { readiness, activation, truth } = input;
  const operator = getOperatorDefinition(readiness.operatorKey);
  const operatorName = operator?.name ?? readiness.operatorKey;
  const connectedKeys = connectedKeysFromTruth(truth);
  const optionalReadiness = getOperatorConnectorReadiness(readiness.operatorKey, connectedKeys);
  const requiredConnectorHealth = getRequiredConnectorHealth(readiness.operatorKey, truth);
  const hasHealthyOptionalCapability = Boolean(optionalReadiness && optionalReadiness.satisfiedOptional.length > 0);
  const degraded = computeDegraded(readiness.operatorKey, truth);

  const state = computeOperatorProductState({
    readiness,
    activation,
    requiredConnectorHealth,
    hasHealthyOptionalCapability,
  });

  return {
    operatorKey: readiness.operatorKey,
    operatorName,
    state,
    label: STATE_LABEL[state],
    description: describeState({ state, operatorName, nextSetupStep: readiness.nextSetupStep, degraded }),
    connectedSystems: (readiness.availableConnectorKeys ?? readiness.connectedRequiredConnectors).map(connectorDisplayName),
    availableNow: readiness.availableBusinessActions ?? humanizeOperatorActions(readiness.availableActions ?? []),
    nextAction: nextActionFor(state, operatorHref(readiness.operatorKey)),
    degraded,
  };
}

/**
 * IO-loading entry point: loads real readiness (readiness.ts), real
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
  const [readinessList, truth] = await Promise.all([
    getWorkspaceOperatorReadiness({ workspaceId: input.workspaceId }),
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
  ]);

  const realReadiness = readinessList.filter((item) => REAL_OPERATOR_KEYS.includes(item.operatorKey));
  const activationStates = await Promise.all(
    realReadiness.map((item) => getOperatorActivationState({ workspaceId: input.workspaceId, operatorKey: item.operatorKey, supabase })),
  );

  return realReadiness.map((readiness, index) => buildOperatorProductState({
    readiness,
    activation: activationStates[index],
    truth,
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
