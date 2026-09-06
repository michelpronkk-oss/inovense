// Capability-diff-driven copy: "connecting X unlocks Y for operator Z".
//
// Never hardcodes prose per connector - always derived from real capability
// data (getOperatorConnectorReadiness) so it can't drift from what the
// connector/operator registries actually declare, and never fabricates a
// capability a connector does not really provide.

import { getConnectorDefinition, listConnectors } from "@/lib/connectors/registry";
import { getOperatorDefinition, OPERATOR_REGISTRY, type OperatorKey } from "@/lib/operators/registry";
import { getOperatorConnectorReadiness } from "@/lib/operators/connector-requirements";

export type OperatorUnlockDelta = {
  operatorKey: OperatorKey;
  operatorName: string;
  becameReady: boolean;
  newlySatisfiedOptionalCount: number;
};

/**
 * Diffs an operator's connector readiness with and without `connectorKey`
 * present in the workspace's connected-connector set. Only reports a real
 * change - if the connector does not affect this operator's declared
 * required/optional capabilities at all, no delta is returned.
 */
export function getUnlockDeltaForConnector(input: {
  connectorKey: string;
  connectedConnectorKeys: string[];
}): OperatorUnlockDelta[] {
  const before = input.connectedConnectorKeys.filter((key) => key !== input.connectorKey);
  const after = before.includes(input.connectorKey) ? before : [...before, input.connectorKey];

  const deltas: OperatorUnlockDelta[] = [];
  for (const operator of OPERATOR_REGISTRY) {
    const readinessBefore = getOperatorConnectorReadiness(operator.key, before);
    const readinessAfter = getOperatorConnectorReadiness(operator.key, after);
    if (!readinessBefore || !readinessAfter) continue;

    const becameReady = !readinessBefore.ready && readinessAfter.ready;
    const newlySatisfiedOptionalCount = readinessAfter.satisfiedOptional.length - readinessBefore.satisfiedOptional.length;

    if (!becameReady && newlySatisfiedOptionalCount <= 0) continue;

    deltas.push({
      operatorKey: operator.key,
      operatorName: operator.name,
      becameReady,
      newlySatisfiedOptionalCount: Math.max(0, newlySatisfiedOptionalCount),
    });
  }
  return deltas;
}

/**
 * Human copy for a just-completed connector OAuth/managed-auth connection,
 * derived entirely from the real capability deltas above. Falls back to a
 * generic confirmation when the connector does not change any operator's
 * declared readiness (still true, still not fabricated).
 */
export function unlockMessageForConnector(input: {
  connectorKey: string;
  connectedConnectorKeys: string[];
}): string {
  const def = getConnectorDefinition(input.connectorKey);
  const displayName = def?.displayName ?? input.connectorKey;
  const deltas = getUnlockDeltaForConnector(input);
  if (deltas.length === 0) return `${displayName} connected.`;

  const readyNow = deltas.filter((delta) => delta.becameReady);
  const enriched = deltas.filter((delta) => !delta.becameReady && delta.newlySatisfiedOptionalCount > 0);

  const parts: string[] = [];
  if (readyNow.length) {
    parts.push(`${readyNow.map((delta) => delta.operatorName).join(", ")} ${readyNow.length === 1 ? "is" : "are"} now ready to configure`);
  }
  if (enriched.length) {
    parts.push(`${enriched.map((delta) => delta.operatorName).join(", ")} gained added context`);
  }
  return `${displayName} connected. ${parts.join(" and ")}.`;
}

/** Real connector ids the workspace said it uses during onboarding but has not connected yet, ordered as onboarding recorded them. */
export function getUnconnectedOnboardingSystems(input: {
  onboardingSystems: string[];
  connectedConnectorKeys: string[];
}): string[] {
  const connected = new Set(input.connectedConnectorKeys);
  const validKeys = new Set(listConnectors().map((def) => def.connectorKey));
  return input.onboardingSystems.filter((key) => validKeys.has(key) && !connected.has(key));
}

export function operatorDisplayName(operatorKey: string): string {
  return getOperatorDefinition(operatorKey)?.name ?? operatorKey.replace(/_/g, " ");
}
