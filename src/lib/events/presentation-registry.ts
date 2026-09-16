import type { ActivityEvent } from "@/lib/product/presentation-models";

export type EventPresentationDefinition = {
  eventType: string;
  schemaVersion: number;
  title: string | ((input: EventPresentationInput) => string);
  description: string | ((input: EventPresentationInput) => string);
  category: ActivityEvent["category"];
  severity: ActivityEvent["severity"];
  targetRoute: string | null | ((input: EventPresentationInput) => string | null);
  icon: string;
  evidence: (input: EventPresentationInput) => Array<{ key: string; value: string }>;
};

export type EventPresentationInput = {
  eventType: string;
  status?: string | null;
  metadata?: Record<string, unknown>;
  entityId?: string | null;
  occurredAt?: string | null;
};

const humanize = (value: string) => value.replace(/[._:-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const staticEvent = (eventType: string, title: string, description: string, category: ActivityEvent["category"], severity: ActivityEvent["severity"], targetRoute: string | null, icon: string): EventPresentationDefinition => ({
  eventType, schemaVersion: 1, title, description, category, severity, targetRoute, icon,
  evidence: (input) => input.entityId ? [{ key: "Reference", value: input.entityId }] : [],
});

/** Versioned, provider-neutral presentation registry. Persisted event_type
 * values remain unchanged; only their human-facing projection is centralized. */
export const EVENT_PRESENTATION_REGISTRY: Record<string, EventPresentationDefinition> = {
  "approval.approved": staticEvent("approval.approved", "Approval approved", "A workspace approval was accepted.", "approval", "success", "/approvals", "check"),
  "approval.rejected": staticEvent("approval.rejected", "Approval rejected", "A workspace approval was declined.", "approval", "attention", "/approvals", "x"),
  "approval.skipped": staticEvent("approval.skipped", "Approval skipped", "A workspace approval was skipped.", "approval", "attention", "/approvals", "minus"),
  "connector.connected": staticEvent("connector.connected", "Connector connected", "A connected system is available to the workspace.", "connector", "success", "/connectors", "plug"),
  "connector.disconnected": staticEvent("connector.disconnected", "Connector disconnected", "A connected system needs setup before dependent work can continue.", "connector", "attention", "/connectors", "plug"),
  "connector.tested": staticEvent("connector.tested", "Connector tested", "A connector health check completed.", "connector", "info", "/connectors", "pulse"),
  "connector.resynced": staticEvent("connector.resynced", "Connector resynced", "A connector reconciliation completed.", "connector", "success", "/connectors", "refresh"),
  "policy_updated": staticEvent("policy_updated", "Policy updated", "Workspace execution policy changed.", "system", "info", "/policies", "shield"),
  "policy_toggled": staticEvent("policy_toggled", "Policy status changed", "A workspace policy was enabled or disabled.", "system", "info", "/policies", "shield"),
  "client_flow_execution_failed": staticEvent("client_flow_execution_failed", "External action failed", "An external action did not complete. Review the execution log for safe technical details.", "failure", "failure", "/logs", "alert"),
  "client_flow_trello_task_created": staticEvent("client_flow_trello_task_created", "Trello card created", "An approved task was created in the connected project system.", "execution", "success", "/activity", "task"),
  "client_flow_email_sent": staticEvent("client_flow_email_sent", "Customer email sent", "An approved customer email was sent.", "execution", "success", "/activity", "mail"),
  "client_flow_draft_only": staticEvent("client_flow_draft_only", "Draft prepared", "A draft was prepared and held for the required review.", "approval", "attention", "/approvals", "file"),
  "operations.trello_card_created": staticEvent("operations.trello_card_created", "Task created", "An approved task was created in the connected project system.", "execution", "success", "/activity", "task"),
  "operations.trello_card_failed": staticEvent("operations.trello_card_failed", "Task creation failed", "The connected project system did not accept the task.", "failure", "failure", "/logs", "alert"),
};

export function getEventPresentationDefinition(eventType: string): EventPresentationDefinition | null {
  const normalized = eventType.replace(/^os_operator_run_logs[.:]/, "");
  return EVENT_PRESENTATION_REGISTRY[normalized] ?? null;
}

export function presentEvent(input: EventPresentationInput): ActivityEvent {
  const definition = getEventPresentationDefinition(input.eventType);
  const normalized = input.eventType.replace(/^os_operator_run_logs[.:]/, "");
  const fallbackTitle = humanize(normalized) || "Execution event";
  const fallback = {
    title: fallbackTitle,
    description: "A workspace event was recorded. Open the related surface for more context.",
    category: "system" as const,
    severity: "info" as const,
    targetRoute: null,
    icon: "activity",
    evidence: input.entityId ? [{ key: "Reference", value: input.entityId }] : [],
  };
  const occurredAt = input.occurredAt && Number.isFinite(Date.parse(input.occurredAt)) ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  if (!definition) return { id: input.entityId ?? `${normalized}:unknown`, eventType: normalized, ...fallback, occurredAt };
  const resolve = <T>(value: T | ((value: EventPresentationInput) => T)): T => typeof value === "function" ? (value as (value: EventPresentationInput) => T)(input) : value;
  return {
    id: input.entityId ?? `${normalized}:unknown`,
    eventType: normalized,
    title: resolve(definition.title),
    description: resolve(definition.description),
    category: definition.category,
    severity: definition.severity,
    targetRoute: resolve(definition.targetRoute),
    evidence: definition.evidence(input),
    occurredAt,
  };
}

export function eventLabel(eventType: string): string {
  return presentEvent({ eventType }).title;
}
