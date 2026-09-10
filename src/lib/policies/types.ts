import type { ActionType } from "@/lib/actions/types";
import type { Capability } from "@/lib/connectors/capabilities";

export type PolicyDecisionKind = "allow_auto" | "approval_required" | "draft_only" | "blocked";
export type PolicyRiskLevel = "low" | "medium" | "high";
export type PolicyConfidence = "low" | "medium" | "high";
export type PolicyContextReliability = "verified" | "observed" | "derived" | "missing" | "stale";

export type PolicyContextValue<T> = {
  value: T | null;
  reliability: PolicyContextReliability;
  observedAt?: string | null;
};

export type PolicyBusinessContext = {
  deal?: {
    amount?: PolicyContextValue<number>;
    currency?: PolicyContextValue<string>;
    stage?: PolicyContextValue<string>;
    discount_percent?: PolicyContextValue<number>;
  };
  customer?: {
    tier?: PolicyContextValue<string>;
    region?: PolicyContextValue<string>;
    sentiment?: PolicyContextValue<string>;
    sla_priority?: PolicyContextValue<string>;
  };
  refund?: { amount?: PolicyContextValue<number> };
  project?: {
    priority?: PolicyContextValue<string>;
    due_date_impact?: PolicyContextValue<string>;
  };
  task?: {
    type?: PolicyContextValue<string>;
    external_collaborator?: PolicyContextValue<boolean>;
  };
  campaign?: {
    spend?: PolicyContextValue<number>;
    audience_size?: PolicyContextValue<number>;
  };
  document?: { sensitivity?: PolicyContextValue<string> };
  workspace?: { risk_level?: PolicyContextValue<string> };
};

export type PolicyConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "exists" | "missing";
export type PolicyConditionField =
  | "deal.amount" | "deal.currency" | "deal.stage" | "deal.discount_percent"
  | "customer.tier" | "customer.region" | "customer.sentiment" | "customer.sla_priority"
  | "refund.amount" | "project.priority" | "project.due_date_impact"
  | "task.type" | "task.external_collaborator" | "campaign.spend" | "campaign.audience_size"
  | "document.sensitivity" | "workspace.risk_level";

export type PolicyCondition = {
  field: PolicyConditionField;
  operator: PolicyConditionOperator;
  value?: string | number | boolean | Array<string | number | boolean>;
};

export type PolicyActionRule = {
  id: string;
  enabled: boolean;
  operator?: string | null;
  domain?: string | null;
  connector?: string | null;
  action?: string | null;
  subjectType?: string | null;
  conditions: PolicyCondition[];
  decision: PolicyDecisionKind;
  approverRoles?: string[];
  expiresAfterMinutes?: number | null;
  priority: number;
  reason: string;
};

export type PolicyEvidence = {
  policyVersion: number;
  matchedRuleIds: string[];
  connector: string;
  action: string;
  subjectType?: string | null;
  subjectId?: string | null;
  contextSummary: Record<string, string | number | boolean | null>;
  contextFingerprint?: string | null;
  threshold?: {
    field: string;
    operator: PolicyConditionOperator;
    configuredValue: string | number | boolean | null;
    observedValue: string | number | boolean | null;
    result: "matched" | "not_matched" | "unavailable";
  } | null;
  requiredApproverRoles: string[];
  approvalExpiresAfterMinutes?: number | null;
};

export type DestinationType = "internal" | "external" | "customer" | "crm" | "project_tool" | "system";

export type WorkspaceAutonomyMode = "manual" | "approval_first" | "guarded" | "autonomous";

export type PolicyDecision = {
  decision: PolicyDecisionKind;
  reason: string;
  riskLevel: PolicyRiskLevel;
  matchedRuleId: string;
  requiresHumanReview: boolean;
  canExecuteNow: boolean;
  auditLabel: string;
  userFacingLabel: string;
  matchedRuleIds: string[];
  policyVersion: number;
  evidence: PolicyEvidence;
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
  /** Microsoft Teams team id. Part of the allowed-destination identity for Teams writes. */
  teamId?: string;
  cardId?: string;
  listId?: string;
  subjectType?: string;
  subjectId?: string;
  businessContext?: PolicyBusinessContext;
  source?: string;
  destructive?: boolean;
  systemNotification?: boolean;
  metadata?: Record<string, unknown>;
};

export type PolicyWorkspaceSettings = {
  version: number;
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
  maxAutonomousActionsPerHour: number;
  maxAutonomousActionsPerDay: number;
  actionRules: PolicyActionRule[];
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
