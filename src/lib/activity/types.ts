export type WorkforceActivityCategory = "operator_run" | "approval" | "execution" | "connector" | "failure" | "system";
export type WorkforceActivitySeverity = "info" | "success" | "attention" | "failure";

export type WorkforceActivityItem = {
  id: string;
  occurredAt: string;
  category: WorkforceActivityCategory;
  title: string;
  description: string;
  operatorKey: string | null;
  connectorKey: string | null;
  severity: WorkforceActivitySeverity;
  status: string;
  relatedRoute: "/agents" | "/approvals" | "/connectors" | "/logs" | "/policies" | null;
  technicalEventId: string | null;
};

export type WorkforceActivitySummary = {
  runs: number;
  approvals: number;
  actions: number;
  issues: number;
  total: number;
  daily: Array<{ day: string; count: number }>;
};

export type WorkforceActivityPage = { items: WorkforceActivityItem[]; summary: WorkforceActivitySummary; hasMore: boolean; partialHistory: boolean };
