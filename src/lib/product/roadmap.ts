export type RoadmapStatus = "available" | "next" | "exploring";
export type RoadmapType = "operator" | "connector" | "platform";

export type RoadmapItem = {
  key: string;
  name: string;
  type: RoadmapType;
  status: RoadmapStatus;
  summary: string;
};

export const ROADMAP_ITEMS: RoadmapItem[] = [
  { key: "revenue-operator", name: "Revenue Operator", type: "operator", status: "available", summary: "Inbound commercial context and approval-led follow-up." },
  { key: "client-flow-operator", name: "Client Flow Operator", type: "operator", status: "available", summary: "Prepared client communication, handoffs, and follow-through." },
  { key: "operations-operator", name: "Operations Operator", type: "operator", status: "available", summary: "Blocked and stalled Trello work, surfaced with a controlled next step." },
  { key: "gmail", name: "Gmail", type: "connector", status: "available", summary: "Email context and approval-gated follow-up work." },
  { key: "microsoft-365", name: "Microsoft 365", type: "connector", status: "available", summary: "Email context for supported operator work." },
  { key: "hubspot", name: "HubSpot", type: "connector", status: "available", summary: "CRM context and supported approval-gated updates." },
  { key: "salesforce", name: "Salesforce", type: "connector", status: "available", summary: "CRM context for Revenue Operator. Writes are not enabled." },
  { key: "trello", name: "Trello", type: "connector", status: "available", summary: "Project and task context for Operations Operator." },
  { key: "slack", name: "Slack", type: "connector", status: "available", summary: "Internal channel visibility and approval-gated messages." },
  { key: "microsoft-teams", name: "Microsoft Teams", type: "connector", status: "next", summary: "Internal collaboration context and controlled team updates." },
  { key: "asana", name: "Asana", type: "connector", status: "next", summary: "Project and task context for client flow and operations." },
  { key: "jira", name: "Jira", type: "connector", status: "next", summary: "Delivery-work signals and controlled internal follow-through." },
  { key: "zendesk", name: "Zendesk", type: "connector", status: "exploring", summary: "Customer-support context, considered only with a defined operating boundary." },
  { key: "intercom", name: "Intercom", type: "connector", status: "exploring", summary: "Customer conversation context for future, controlled service workflows." },
  { key: "google-workspace", name: "Google Workspace expansion", type: "connector", status: "exploring", summary: "Calendar and Drive context, evaluated separately from current Gmail support." },
];

export function roadmapItems(status: RoadmapStatus) {
  return ROADMAP_ITEMS.filter((item) => item.status === status);
}
