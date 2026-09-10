export function canonicalWorkDedupeKey(input: {
  workspaceId: string;
  provider: string;
  entityId: string;
  intent: string;
  primaryOperator: string;
}): string {
  return [input.workspaceId, input.provider, input.entityId, input.intent, input.primaryOperator]
    .map((value) => String(value || "unknown").replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 180))
    .join(":")
    .slice(0, 480);
}

export function canonicalWorkflowDedupeKey(input: Parameters<typeof canonicalWorkDedupeKey>[0]): string {
  return `workflow:${canonicalWorkDedupeKey(input)}`.slice(0, 480);
}

/**
 * A cross-connector problem identity is only trusted when a provider adapter
 * supplies an explicit stable reference. We deliberately do not derive this
 * from customer names or subject text: that would merge unrelated work.
 */
export function explicitBusinessProblemKey(metadata: Record<string, unknown> | null | undefined): string | null {
  const value = metadata?.businessProblemId ?? metadata?.businessProblemKey ?? metadata?.caseId;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 180) : null;
}

export function canonicalBusinessProblemWorkflowDedupeKey(input: { workspaceId: string; problemKey: string; intent: string; primaryOperator: string }): string {
  return canonicalWorkflowDedupeKey({ workspaceId: input.workspaceId, provider: "business_problem", entityId: input.problemKey, intent: input.intent, primaryOperator: input.primaryOperator });
}
