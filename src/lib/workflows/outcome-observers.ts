import type { AttributionLevel } from "@/lib/workflows/engine";

export type OutcomeObservation = { outcomeType: string; attributionLevel: AttributionLevel; confidence: "low" | "medium" | "high"; evidenceRefs: string[] };

export function observeClientFlowCustomerReply(input: { workflowId: string; provider: string; threadId: string; messageId: string; subject?: string | null; snippet?: string | null; linkedActionExecuted: boolean }): OutcomeObservation {
  const text = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();
  const confirmed = /confirmed|looks good|that works|thanks|thank you|all good|approved|go ahead|perfect/.test(text);
  return { outcomeType: confirmed ? "clientflow_customer_confirmed" : "clientflow_customer_still_waiting", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: confirmed ? "high" : "medium", evidenceRefs: [`workflow:${input.workflowId}`, `customer_thread:${input.provider}:${input.threadId}`, `customer_message:${input.messageId}`, confirmed ? "customer_confirmation" : "customer_follow_up"] };
}

export function observeClientFlowDeliveryProgress(input: { workflowId: string; provider: string; entityId: string; previousStatus?: string | null; currentStatus?: string | null; previousDueAt?: string | null; currentDueAt?: string | null; linkedActionExecuted: boolean }): OutcomeObservation | null {
  const previous = (input.previousStatus ?? "").toLowerCase();
  const current = (input.currentStatus ?? "").toLowerCase();
  if (previous === current && (input.previousDueAt ?? null) === (input.currentDueAt ?? null)) return null;
  const complete = ["done", "completed", "closed", "resolved"].includes(current);
  return { outcomeType: complete ? "clientflow_change_completed" : "clientflow_delivery_progressed", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: complete ? "high" : "medium", evidenceRefs: [`workflow:${input.workflowId}`, `delivery_entity:${input.provider}:${input.entityId}`, `delivery_status:${input.currentStatus ?? "changed"}`] };
}

export function observeClientFlowHandoff(input: { workflowId: string; supportingOwner: string; childWorkflowId: string; childStatus: string; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["completed", "partially_completed"].includes(input.childStatus)) return null;
  return { outcomeType: "clientflow_handoff_completed", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `supporting_workflow:${input.childWorkflowId}`, `supporting_owner:${input.supportingOwner}`] };
}

/** Pure provider-state observers. Callers fetch provider state through their existing scoped adapters. */
export function observeProjectRecovery(input: { workflowId: string; taskRef: string; status: string; dueAt?: string | null; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["completed", "done", "resolved"].includes(input.status.toLowerCase())) return null;
  return { outcomeType: "overdue_work_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `project_task:${input.taskRef}`, `provider_status:${input.status}`] };
}

export type OperationsProviderSnapshot = {
  provider: string;
  entityId: string;
  status?: string | null;
  completed?: boolean;
  assignee?: string | null;
  dueAt?: string | null;
  labels?: string[];
  checklistCompleted?: number | null;
  updatedAt?: string | null;
  blockerIndicators?: string[];
};

/** Action-linked Operations observation. A provider write is never itself a resolution. */
export function observeOperationsProviderState(input: {
  workflowId: string;
  before: OperationsProviderSnapshot;
  after: OperationsProviderSnapshot;
  linkedActionExecuted: boolean;
}): OutcomeObservation | null {
  const beforeStatus = (input.before.status ?? "").toLowerCase();
  const afterStatus = (input.after.status ?? "").toLowerCase();
  const terminal = input.after.completed === true || ["done", "completed", "closed", "resolved"].includes(afterStatus);
  const beforeBlocked = (input.before.blockerIndicators ?? []).length > 0;
  const afterBlocked = (input.after.blockerIndicators ?? []).length > 0;
  if (terminal || (beforeBlocked && !afterBlocked)) {
    return { outcomeType: "operations_blocker_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `project_entity:${input.after.provider}:${input.after.entityId}`, `provider_status:${input.after.status ?? "resolved"}`] };
  }
  if (input.before.assignee !== input.after.assignee && input.after.assignee) {
    return { outcomeType: "operations_owner_assigned", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `project_entity:${input.after.provider}:${input.after.entityId}`, `assignee:${input.after.assignee}`] };
  }
  if ((input.after.checklistCompleted ?? 0) > (input.before.checklistCompleted ?? 0) || (input.before.dueAt ?? null) !== (input.after.dueAt ?? null) || beforeStatus !== afterStatus) {
    return { outcomeType: "operations_task_progressed", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "medium", evidenceRefs: [`workflow:${input.workflowId}`, `project_entity:${input.after.provider}:${input.after.entityId}`, `provider_status:${input.after.status ?? "changed"}`] };
  }
  return null;
}

export function observeOperationsNoProgress(input: { workflowId: string; provider: string; entityId: string; executingSince: string; now?: string; windowHours?: number }): OutcomeObservation | null {
  const started = Date.parse(input.executingSince);
  const now = Date.parse(input.now ?? new Date().toISOString());
  const windowHours = input.windowHours ?? 48;
  if (!Number.isFinite(started) || !Number.isFinite(now) || now - started < windowHours * 3_600_000) return null;
  return { outcomeType: "operations_no_progress", attributionLevel: "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `project_entity:${input.provider}:${input.entityId}`, `no_progress_after:${windowHours}h`] };
}

export function observeZendeskResolution(input: { workflowId: string; ticketId: string; status: string; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["solved", "closed"].includes(input.status.toLowerCase())) return null;
  return { outcomeType: "support_request_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `zendesk_ticket:${input.ticketId}`, `provider_status:${input.status}`] };
}

export function observeIntercomResolution(input: { workflowId: string; conversationId: string; state: string; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["closed", "resolved"].includes(input.state.toLowerCase())) return null;
  return { outcomeType: "support_request_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `intercom_conversation:${input.conversationId}`, `provider_state:${input.state}`] };
}

/** Email execution alone is never treated as resolution. A later, explicit customer acknowledgement is required. The legacy support_request_resolved label is intentionally not emitted for email. */
export function observeEmailSupportResolution(input: { workflowId: string; threadId: string; subject?: string | null; snippet?: string | null; linkedActionExecuted: boolean }): OutcomeObservation | null {
  const text = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();
  if (!/thanks|thank you|all good|solved|resolved|working now|fixed/.test(text)) return null;
  return { outcomeType: "support_customer_confirmed", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "medium", evidenceRefs: [`workflow:${input.workflowId}`, `email_thread:${input.threadId}`, "provider_acknowledgement"] };
}

/** Any later customer message is a real follow-through signal, but not proof
 * that the underlying issue was resolved. */
export function observeEmailSupportReply(input: { workflowId: string; threadId: string; messageId: string; subject?: string | null; snippet?: string | null; linkedActionExecuted: boolean }): OutcomeObservation {
  const resolved = observeEmailSupportResolution(input);
  if (resolved) return resolved;
  return { outcomeType: "support_reply_received", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `email_thread:${input.threadId}`, `email_message:${input.messageId}`, "customer_follow_up"] };
}

/** Sending email is an execution fact only; reply/CRM evidence is required for a business outcome. */
export function observeRevenueFollowUp(input: {
  workflowId: string;
  threadId: string;
  sentAt: string;
  reply?: { id: string; subject?: string | null; snippet?: string | null } | null;
  now?: string;
  noResponseAfterHours?: number;
  linkedActionExecuted: boolean;
} | undefined): OutcomeObservation | null {
  if (!input) return null;
  if (input.reply) {
    const text = `${input.reply.subject ?? ""} ${input.reply.snippet ?? ""}`.toLowerCase();
    const positive = /interested|yes|let's|lets|book|schedule|meeting|call|proposal|pricing|move forward|next step/.test(text);
    return {
      outcomeType: positive ? "revenue_positive_reply" : "revenue_reply_received",
      attributionLevel: input.linkedActionExecuted ? "influenced" : "observed",
      confidence: positive ? "high" : "medium",
      evidenceRefs: [`workflow:${input.workflowId}`, `email_thread:${input.threadId}`, `email_message:${input.reply.id}`, positive ? "commercial_reply" : "reply_received"],
    };
  }
  const sentAt = Date.parse(input.sentAt);
  const now = Date.parse(input.now ?? new Date().toISOString());
  const windowHours = input.noResponseAfterHours ?? 48;
  if (!Number.isFinite(sentAt) || !Number.isFinite(now) || now - sentAt < windowHours * 3_600_000) return null;
  return {
    outcomeType: "revenue_no_response",
    attributionLevel: "observed",
    confidence: "high",
    evidenceRefs: [`workflow:${input.workflowId}`, `email_thread:${input.threadId}`, `no_response_after:${windowHours}h`],
  };
}

export function observeRevenueDealState(input: {
  workflowId: string;
  dealId: string;
  previousStage?: string | null;
  currentStage?: string | null;
  isClosed?: boolean;
  linkedActionExecuted: boolean;
}): OutcomeObservation | null {
  const previous = input.previousStage?.trim().toLowerCase() || null;
  const current = input.currentStage?.trim().toLowerCase() || null;
  if (!current || current === previous) return null;
  const closed = input.isClosed === true;
  return {
    outcomeType: closed ? "revenue_deal_stage_changed" : previous ? "revenue_deal_stage_advanced" : "revenue_deal_stage_changed",
    attributionLevel: input.linkedActionExecuted ? "influenced" : "observed",
    confidence: "high",
    evidenceRefs: [`workflow:${input.workflowId}`, `crm_deal:${input.dealId}`, `deal_stage:${current}`],
  };
}
