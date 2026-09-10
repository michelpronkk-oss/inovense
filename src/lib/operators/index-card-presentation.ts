import type { OperatorKey } from "@/lib/operators/registry";

type LiveOperatorKey = Extract<OperatorKey, "revenue" | "client_flow" | "operations" | "support">;

export type LiveOperatorCardPresentation = {
  descriptor: string;
  mission: string;
  providedBy: string;
  optionalContext: string;
  control: string;
  cadence: string;
};

/** Presentation-only copy for the authenticated operator index. */
const LIVE_OPERATOR_CARD_PRESENTATION: Record<LiveOperatorKey, LiveOperatorCardPresentation> = {
  revenue: {
    descriptor: "Pipeline and renewals",
    mission: "Keep pipeline moving and surface revenue risk before it costs a renewal.",
    providedBy: "Gmail or Microsoft 365",
    optionalContext: "Pipeline and accounts, Documents and knowledge",
    control: "Approval-first",
    cadence: "Daily scan at 07:00 UTC",
  },
  client_flow: {
    descriptor: "Onboarding and delivery",
    mission: "Move every new client from signature to first value without a dropped step.",
    providedBy: "Gmail or Microsoft 365",
    optionalContext: "Documents and knowledge, Project management, Team communication",
    control: "Approval-first",
    cadence: "Daily scan at 07:30 UTC",
  },
  operations: {
    descriptor: "Delivery and project health",
    mission: "Watch delivery work for slippage and prepare the response before a deadline slips.",
    providedBy: "Jira or Asana or Trello",
    optionalContext: "Team communication",
    control: "Guarded",
    cadence: "Daily scan at 08:00 UTC",
  },
  support: {
    descriptor: "Customer support load",
    mission: "Triage inbound support, draft the reply, and escalate what a human must own.",
    providedBy: "Zendesk or Intercom or Gmail or Microsoft 365",
    optionalContext: "Documents and knowledge",
    control: "Approval-first",
    cadence: "Daily scan at 08:00 UTC",
  },
};

export function getLiveOperatorCardPresentation(operatorKey: string): LiveOperatorCardPresentation | null {
  return LIVE_OPERATOR_CARD_PRESENTATION[operatorKey as LiveOperatorKey] ?? null;
}

export const ROADMAP_OPERATOR_PRESENTATION = [
  { name: "Finance Operator", descriptor: "Billing and collections", color: "#5FD3A8", glyph: "dollar" },
  { name: "Marketing Operator", descriptor: "Campaign and content", color: "#E0A35E", glyph: "mega" },
  { name: "Recruiting Operator", descriptor: "Hiring pipeline", color: "#66D0E0", glyph: "hiring" },
  { name: "Procurement Operator", descriptor: "Vendors and spend", color: "#C58BF0", glyph: "layout" },
  { name: "Compliance Operator", descriptor: "Controls and evidence", color: "#7AA8FF", glyph: "shield" },
  { name: "Data Operator", descriptor: "Reporting and quality", color: "#8B9DF7", glyph: "memory" },
] as const;
