export type SignalSource =
  | "gmail"
  | "outlook"
  | "imap"
  | "hubspot"
  | "form"
  | "manual";

export type SignalEvent = {
  workspaceId: string;
  source: SignalSource | string;
  sourceType: "email" | "crm" | "form" | "manual" | string;
  eventType: string;
  sourceId: string;
  threadId?: string | null;
  from?: string | null;
  subject?: string | null;
  snippet?: string | null;
  receivedAt?: string | null;
  rawRef?: string | null;
  metadata?: Record<string, unknown>;
};

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
};
