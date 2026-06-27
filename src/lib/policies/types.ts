import type { ActionType } from "@/lib/actions/types";
import type { Capability } from "@/lib/connectors/capabilities";

export type PolicyDecisionKind = "allow_auto" | "approval_required" | "draft_only" | "blocked";
export type PolicyRiskLevel = "low" | "medium" | "high";
export type PolicyConfidence = "low" | "medium" | "high";

export type DestinationType = "internal" | "external" | "customer" | "crm" | "project_tool" | "system";

export type WorkspaceAutonomyMode = "safe" | "assisted" | "managed";

export type PolicyDecision = {
  decision: PolicyDecisionKind;
  reason: string;
  riskLevel: PolicyRiskLevel;
  matchedRuleId: string;
  requiresHumanReview: boolean;
  canExecuteNow: boolean;
  auditLabel: string;
  userFacingLabel: string;
};

export type PolicyInput = {
  workspaceId: string;
  operatorKey: string;
  actionType: ActionType | string;
  connectorKey: string;
  capability?: Capability | string;
  destinationType: DestinationType;
  riskLevel: PolicyRiskLevel;
  confidence?: PolicyConfidence;
  recipient?: string;
  domain?: string;
  channel?: string;
  channelId?: string;
  cardId?: string;
  listId?: string;
  source?: string;
  destructive?: boolean;
  systemNotification?: boolean;
  metadata?: Record<string, unknown>;
};

export type PolicyWorkspaceSettings = {
  autonomyMode: WorkspaceAutonomyMode;
  emergencyStopEnabled: boolean;
  customerEmailMode: "approval_required" | "draft_only" | "auto_send_low_risk";
  internalSlackNotificationsAllowed: boolean;
  dailyBriefAllowed: boolean;
  connectorHealthChecksAllowed: boolean;
  lowRiskProjectToolCommentsAllowed: boolean;
  crmWritesRequireApproval: boolean;
  projectToolWritesRequireApproval: boolean;
  customerFacingActionsRequireApproval: boolean;
};

export type PolicyEvaluationEntitlements = {
  canRunRealActions: boolean;
  billingStatus: string;
};

// Reserved for Managed mode custom rules (not implemented in v1).
export type CustomPolicyRule = {
  id: string;
  description?: string;
  match: Partial<Pick<PolicyInput, "operatorKey" | "actionType" | "connectorKey" | "destinationType" | "riskLevel">>;
  decision: PolicyDecisionKind;
  reason?: string;
};
