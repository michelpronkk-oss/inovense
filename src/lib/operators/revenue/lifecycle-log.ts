/** Safe, identifier-only trace for one Revenue signal through its durable lifecycle. */
export function logRevenueLifecycle(event: string, input: {
  workspaceId: string;
  operatorKey?: string;
  provider?: string;
  messageId?: string;
  threadId?: string;
  signalId?: string;
  workflowId?: string;
  actionId?: string;
  approvalId?: string;
  state?: string;
  skipReason?: string;
  dedupeReason?: string;
  outcomeType?: string;
  subjectHash?: string;
  intent?: string;
  confidence?: string;
  revenueSignals?: string[];
  classificationReason?: string;
  classificationSource?: string;
  classificationTextLength?: number;
  rejectionCategory?: string;
}) {
  console.info("[revenue-lifecycle]", JSON.stringify({
    event,
    workspaceId: input.workspaceId,
    operatorKey: input.operatorKey ?? "revenue",
    provider: input.provider,
    messageId: input.messageId,
    threadId: input.threadId,
    signalId: input.signalId,
    workflowId: input.workflowId,
    actionId: input.actionId,
    approvalId: input.approvalId,
    state: input.state,
    skipReason: input.skipReason,
    dedupeReason: input.dedupeReason,
    outcomeType: input.outcomeType,
    subjectHash: input.subjectHash,
    intent: input.intent,
    confidence: input.confidence,
    revenueSignals: input.revenueSignals,
    classificationReason: input.classificationReason,
    classificationSource: input.classificationSource,
    classificationTextLength: input.classificationTextLength,
    rejectionCategory: input.rejectionCategory,
  }));
}
