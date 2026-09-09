import { getOperatorConnectorRequirement } from "@/lib/operators/connector-requirements";
import type { OperatorKey } from "@/lib/operators/registry";

export type OperatorCapabilityCopy = {
  required: string[];
  optional: string[];
};

const GROUP_LABELS: Array<[string, string]> = [
  ["pm.", "Project management"],
  ["email.", "Customer communication"],
  ["support.", "Customer support"],
  ["crm.", "CRM"],
  ["chat.", "Team communication"],
  ["docs.", "Documents & knowledge"],
  ["calendar.", "Calendar"],
  ["billing.", "Billing"],
  ["analytics.", "Analytics"],
];

function capabilityGroup(capability: string): string {
  return GROUP_LABELS.find(([prefix]) => capability.startsWith(prefix))?.[1] ?? "Connected business context";
}

function unique(values: string[]) { return Array.from(new Set(values)); }

export function getOperatorCapabilityCopy(operatorKey: string): OperatorCapabilityCopy {
  const requirement = getOperatorConnectorRequirement(operatorKey);
  if (!requirement) return { required: [], optional: [] };
  if (operatorKey === "support") {
    return { required: ["Customer support", "Customer communication"], optional: ["CRM", "Documents & knowledge", "Team communication"] };
  }
  return {
    required: unique(requirement.required.map(capabilityGroup)),
    optional: unique(requirement.optional.map(capabilityGroup)).filter((group) => !requirement.required.map(capabilityGroup).includes(group)),
  };
}

export function getCapabilityDisclosureLabel(capability: string, providerCount: number, providerNames: string[] = []) {
  if (providerCount <= 0) return capability;
  if (providerCount === 1 && providerNames[0]) return `${capability} · Connected via ${providerNames[0]}`;
  return `${capability} · ${providerCount} systems connected`;
}

export function getOperatorCapabilityCopyForKey(operatorKey: OperatorKey) { return getOperatorCapabilityCopy(operatorKey); }
