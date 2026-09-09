import type { AttributionLevel } from "@/lib/workflows/engine";

export type OutcomeObservation = { outcomeType: string; attributionLevel: AttributionLevel; confidence: "low" | "medium" | "high"; evidenceRefs: string[] };

/** Pure provider-state observers. Callers fetch provider state through their existing scoped adapters. */
export function observeProjectRecovery(input: { workflowId: string; taskRef: string; status: string; dueAt?: string | null; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["completed", "done", "resolved"].includes(input.status.toLowerCase())) return null;
  return { outcomeType: "overdue_work_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `project_task:${input.taskRef}`, `provider_status:${input.status}`] };
}

export function observeZendeskResolution(input: { workflowId: string; ticketId: string; status: string; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["solved", "closed"].includes(input.status.toLowerCase())) return null;
  return { outcomeType: "support_request_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `zendesk_ticket:${input.ticketId}`, `provider_status:${input.status}`] };
}

export function observeIntercomResolution(input: { workflowId: string; conversationId: string; state: string; linkedActionExecuted: boolean }): OutcomeObservation | null {
  if (!["closed", "resolved"].includes(input.state.toLowerCase())) return null;
  return { outcomeType: "support_request_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "high", evidenceRefs: [`workflow:${input.workflowId}`, `intercom_conversation:${input.conversationId}`, `provider_state:${input.state}`] };
}

/** Email execution alone is never treated as resolution. A later, explicit customer acknowledgement is required. */
export function observeEmailSupportResolution(input: { workflowId: string; threadId: string; subject?: string | null; snippet?: string | null; linkedActionExecuted: boolean }): OutcomeObservation | null {
  const text = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();
  if (!/thanks|thank you|all good|solved|resolved|working now|fixed/.test(text)) return null;
  return { outcomeType: "support_request_resolved", attributionLevel: input.linkedActionExecuted ? "influenced" : "observed", confidence: "medium", evidenceRefs: [`workflow:${input.workflowId}`, `email_thread:${input.threadId}`, "provider_acknowledgement"] };
}

/** Sending email is an execution fact only; reply/CRM evidence is required for a business outcome. */
export function observeRevenueFollowUp(): OutcomeObservation | null {
  return null;
}
