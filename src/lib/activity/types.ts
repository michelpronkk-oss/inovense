export type WorkforceActivityCategory = "operator_run" | "workflow" | "approval" | "execution" | "outcome" | "connector" | "failure" | "system";
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
  relatedRoute: string | null;
  technicalEventId: string | null;
};

export type WorkforceActivitySummary = {
  runs: number;
  approvals: number;
  actions: number;
  issues: number;
  total: number;
  prepared: number;
  executed: number;
  held: number;
  /**
   * A truthful chart projection for the dashboard. These are derived from
   * the same normalized activity records used by Activity, never seeded UI
   * values: an approval is prepared work, a pending approval is held work,
   * and an execution is completed work.
   */
  daily: Array<{ day: string; count: number; prepared: number; executed: number; held: number }>;
};

export type WorkforceActivityPage = { items: WorkforceActivityItem[]; summary: WorkforceActivitySummary; hasMore: boolean; partialHistory: boolean };
