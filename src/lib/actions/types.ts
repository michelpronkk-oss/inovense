import type { Capability } from "@/lib/connectors/capabilities";
import type { ConnectorCategory, ConnectorRiskLevel } from "@/lib/connectors/registry";
import type { PolicyDecision, PolicyEvaluationEntitlements, PolicyInput, PolicyWorkspaceSettings } from "@/lib/policies/types";

export type ActionType =
  | "send_email"
  | "send_slack_message"
  | "create_crm_contact"
  | "create_crm_deal"
  | "create_task"
  | "move_task"
  | "add_task_comment";

export type ActionStatus = "prepared" | "approval_required" | "executing" | "executed" | "failed" | "skipped";

export type ActionDestinationType = "internal" | "external" | "customer" | "crm" | "project_tool" | "system";
export type ActionConfidence = "low" | "medium" | "high";

export type ActionIntent = {
  id?: string;
  workspaceId: string;
  operatorKey: string;
  actionType: ActionType;
  connectorKey: string;
  capability: Capability;
  title: string;
  summary: string;
  input: Record<string, unknown>;
  dedupeKey?: string | null;
  source?: string | null;
  destinationType?: ActionDestinationType;
  confidence?: ActionConfidence;
  riskLevel?: ConnectorRiskLevel;
  normalizedTarget?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ActionPreview = {
  label: string;
  fields: Array<{ label: string; value: string }>;
  bodyPreview?: string | null;
};

export type PreparedAction = {
  id: string;
  workspaceId: string;
  operatorKey: string;
  actionType: ActionType;
  connectorKey: string;
  capability: Capability;
  connectorCategory: ConnectorCategory;
  riskLevel: ConnectorRiskLevel;
  requiresApproval: boolean;
  title: string;
  summary: string;
  input: Record<string, unknown>;
  preview: ActionPreview;
  status: ActionStatus;
  dedupeKey: string | null;
  source: string | null;
  destinationType: ActionDestinationType;
  confidence?: ActionConfidence;
  normalizedTarget?: string | null;
  policyInput?: PolicyInput | null;
  policyDecision?: PolicyDecision | null;
  metadata: Record<string, unknown>;
};

export type ActionExecutionResult = {
  status: "executed" | "skipped";
  actionId: string;
  actionType: ActionType;
  connectorKey: string;
  result: Record<string, unknown>;
};

export type WorkspaceActionPolicy = {
  customerEmailMode?: "approval_required" | "draft_only" | "auto_send_low_risk";
  internalSlackNotificationsAllowed?: boolean;
  policySettings?: PolicyWorkspaceSettings;
  entitlements?: PolicyEvaluationEntitlements;
};
