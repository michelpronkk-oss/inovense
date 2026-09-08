export type SignalSource =
  | "gmail"
  | "microsoft"
  | "imap"
  | "hubspot"
  | "form"
  | "manual";

export type SignalEvent = {
  /** Deterministic persisted id. Existing source adapters may omit it. */
  id?: string;
  workspaceId: string;
  connectorKey?: string;
  provider?: string;
  source: SignalSource | string;
  sourceType: "email" | "crm" | "form" | "manual" | string;
  eventType: string;
  sourceId: string;
  sourceParentId?: string | null;
  threadId?: string | null;
  from?: string | null;
  subject?: string | null;
  snippet?: string | null;
  receivedAt?: string | null;
  rawRef?: string | null;
  occurredAt?: string | null;
  observedAt?: string | null;
  actor?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  category?: SignalCategory;
  dedupeKey?: string;
  trustLevel?: "untrusted_provider_content" | "system_derived";
  metadata?: Record<string, unknown>;
};

export type SignalCategory =
  | "customer_request"
  | "follow_up_needed"
  | "unanswered_message"
  | "escalation"
  | "sales_opportunity"
  | "commercial_intent"
  | "stalled_work"
  | "overdue_work"
  | "blocked_work"
  | "delivery_risk"
  | "support_risk"
  | "document_change"
  | "crm_change"
  | "internal_coordination"
  | "connector_attention"
  | "noise";

export type SignalPriority = "low" | "normal" | "high" | "critical";

export type SignalCandidateStatus =
  | "ignored"
  | "candidate"
  | "routed"
  | "approval_created"
  | "handled";

export type SignalCandidate = {
  id: string;
  dedupeKey: string;
  workspaceId: string;
  operatorKey: string;
  signalType: string;
  confidence: "low" | "medium" | "high";
  source: SignalSource | string;
  sourceId: string;
  routeReason: string;
  status: SignalCandidateStatus;
  metadata: Record<string, unknown>;
  signalId?: string;
  priority?: number;
  priorityLevel?: SignalPriority;
  urgency?: "low" | "medium" | "high" | "critical";
  reasonCodes?: string[];
  evidence?: Record<string, unknown>;
  recommendedActionTypes?: string[];
  createdAt?: string;
};
