import { businessContextFingerprint } from "@/lib/policies/context";
import { memoryDependencyFingerprint, type MemoryDependency } from "@/lib/memory/model";
import type { PolicyDecision, PolicyInput } from "@/lib/policies/types";

export type ApprovalScope = {
  workspaceId: string;
  operatorId: string;
  connector: string;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  destinationType: string;
  parameters: {
    recipient: string | null;
    domain: string | null;
    channelId: string | null;
    teamId: string | null;
    cardId: string | null;
    listId: string | null;
    dedupeKey: string | null;
    payloadIdentity: string | null;
  };
  matchedPolicyRuleIds: string[];
  policyVersion: number;
  contextFingerprint: string | null;
  memoryDependencies: MemoryDependency[];
  memoryFingerprint: string | null;
};

/** Stable identity for the exact customer-facing payload a reviewer saw. */
export function emailPayloadIdentity(subject: string, body: string): string {
  const input = `${subject}\n\u0000${body}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `email-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Bind an explicitly reviewed email edit to its exact subject/body while
 * retaining the original target, policy and business-context boundaries.
 */
export function refreshEmailApprovalScopePayload(scope: ApprovalScope, subject: string, body: string): ApprovalScope {
  return {
    ...scope,
    parameters: {
      ...scope.parameters,
      payloadIdentity: emailPayloadIdentity(subject, body),
    },
  };
}

export function buildApprovalScope(input: PolicyInput, decision: PolicyDecision): ApprovalScope {
  const memoryDependencies = decision.evidence.memoryDependencies ?? (Array.isArray(input.metadata?.memoryDependencies) ? input.metadata.memoryDependencies as MemoryDependency[] : []);
  return {
    workspaceId: input.workspaceId,
    operatorId: input.operatorKey,
    connector: input.connectorKey,
    action: input.actionType,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null,
    destinationType: input.destinationType,
    parameters: {
      recipient: input.recipient ?? null,
      domain: input.domain ?? null,
      channelId: input.channelId ?? null,
      teamId: input.teamId ?? null,
      cardId: input.cardId ?? null,
      listId: input.listId ?? null,
      dedupeKey: typeof input.metadata?.dedupeKey === "string" ? input.metadata.dedupeKey : null,
      payloadIdentity: typeof input.metadata?.payloadIdentity === "string" ? input.metadata.payloadIdentity : null,
    },
    matchedPolicyRuleIds: decision.matchedRuleIds,
    policyVersion: decision.policyVersion,
    contextFingerprint: businessContextFingerprint(input.businessContext),
    memoryDependencies,
    memoryFingerprint: decision.evidence.memoryFingerprint ?? memoryDependencyFingerprint(memoryDependencies),
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value) ?? "null";
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function approvalScopesEqual(left: ApprovalScope | null | undefined, right: ApprovalScope): boolean {
  return Boolean(left) && stable(left) === stable(right);
}
