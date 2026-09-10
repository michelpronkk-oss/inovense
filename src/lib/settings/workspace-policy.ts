import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { DEFAULT_ACTION_RULES } from "@/lib/policies/defaults";
import type { ConnectorPolicySettings, PolicyActionRule, PolicyCondition, PolicyConditionField, PolicyConditionOperator } from "@/lib/policies/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type CustomerEmailMode = "approval_required" | "draft_only" | "auto_send_low_risk";
export type ConnectorPolicyPatch = { connectorKey: string; customerEmailMode: "approval_required" | "draft_only" };

export type SlackNotificationSettings = {
  slackNotificationsEnabled: boolean;
  slackApprovalAlertsEnabled: boolean;
  slackDefaultChannelId: string | null;
  slackDefaultChannelName: string | null;
  notifyOnRevenueApprovalCreated: boolean;
  notifyOnApprovalApproved: boolean;
  notifyOnApprovalRejected: boolean;
  notifyOnExecutionFailed: boolean;
};

export type TrelloProjectSettings = {
  defaultBoardId: string | null;
  defaultBoardName: string | null;
  defaultListId: string | null;
  defaultListName: string | null;
};

export const DEFAULT_CUSTOMER_EMAIL_MODE: CustomerEmailMode = "approval_required";

export const DEFAULT_APPROVAL_POLICY = {
  version: 2,
  outboundComms: "Always require approval",
  proposals: "Always require approval",
  internalReports: "Auto-approve within policy",
  // Legacy display field. The centralized policy evaluator remains authoritative
  // and CRM writes stay approval-required until a separately reviewed adapter is
  // enabled. Existing rows are read compatibly but never used to loosen safety.
  crmWrites: "Always require approval",
  customerEmailMode: DEFAULT_CUSTOMER_EMAIL_MODE,
  actionRules: DEFAULT_ACTION_RULES,
  connectorPolicies: {},
};

export const DEFAULT_SLACK_NOTIFICATION_SETTINGS: SlackNotificationSettings = {
  slackNotificationsEnabled: false,
  slackApprovalAlertsEnabled: false,
  slackDefaultChannelId: null,
  slackDefaultChannelName: null,
  notifyOnRevenueApprovalCreated: true,
  notifyOnApprovalApproved: true,
  notifyOnApprovalRejected: true,
  notifyOnExecutionFailed: true,
};

export const DEFAULT_TRELLO_PROJECT_SETTINGS: TrelloProjectSettings = {
  defaultBoardId: null,
  defaultBoardName: null,
  defaultListId: null,
  defaultListName: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function customerEmailMode(value: unknown): CustomerEmailMode {
  if (value === "draft_only" || value === "auto_send_low_risk" || value === "approval_required") return value;
  return DEFAULT_CUSTOMER_EMAIL_MODE;
}

const CONNECTOR_POLICY_KEYS = new Set(["gmail", "microsoft"]);

function parseConnectorPolicies(value: unknown): Record<string, ConnectorPolicySettings> {
  const stored = asRecord(value);
  const result: Record<string, ConnectorPolicySettings> = {};
  for (const connectorKey of CONNECTOR_POLICY_KEYS) {
    const candidate = asRecord(stored[connectorKey]);
    if (candidate.customerEmailMode === "approval_required" || candidate.customerEmailMode === "draft_only") {
      result[connectorKey] = { customerEmailMode: candidate.customerEmailMode };
    }
  }
  return result;
}

const CONDITION_FIELDS = new Set<PolicyConditionField>([
  "deal.amount", "deal.currency", "deal.stage", "deal.discount_percent",
  "customer.tier", "customer.region", "customer.sentiment", "customer.sla_priority",
  "refund.amount", "project.priority", "project.due_date_impact", "task.type",
  "task.external_collaborator", "campaign.spend", "campaign.audience_size",
  "document.sensitivity", "workspace.risk_level",
]);
const CONDITION_OPERATORS = new Set<PolicyConditionOperator>(["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "exists", "missing"]);

function parseActionRules(value: unknown): PolicyActionRule[] {
  if (!Array.isArray(value)) return DEFAULT_ACTION_RULES.map((rule) => ({ ...rule, conditions: rule.conditions.map((condition) => ({ ...condition })) }));
  const rules: PolicyActionRule[] = [];
  for (const candidate of value) {
    const rec = asRecord(candidate);
    if (typeof rec.id !== "string" || typeof rec.reason !== "string") continue;
    const conditions: PolicyCondition[] = Array.isArray(rec.conditions)
      ? rec.conditions.flatMap((condition) => {
        const item = asRecord(condition);
        const field = item.field;
        const operator = item.operator;
        if (typeof field !== "string" || !CONDITION_FIELDS.has(field as PolicyConditionField) || typeof operator !== "string" || !CONDITION_OPERATORS.has(operator as PolicyConditionOperator)) return [];
        return [{ field: field as PolicyConditionField, operator: operator as PolicyConditionOperator, value: item.value as PolicyCondition["value"] }];
      })
      : [];
    const decision = rec.decision;
    if (decision !== "allow_auto" && decision !== "approval_required" && decision !== "draft_only" && decision !== "blocked") continue;
    rules.push({
      id: rec.id,
      enabled: rec.enabled !== false,
      operator: typeof rec.operator === "string" ? rec.operator : null,
      domain: typeof rec.domain === "string" ? rec.domain : null,
      connector: typeof rec.connector === "string" ? rec.connector : null,
      action: typeof rec.action === "string" ? rec.action : null,
      subjectType: typeof rec.subjectType === "string" ? rec.subjectType : null,
      conditions,
      decision,
      approverRoles: Array.isArray(rec.approverRoles) ? rec.approverRoles.filter((role): role is string => typeof role === "string" && role.trim().length > 0) : [],
      expiresAfterMinutes: typeof rec.expiresAfterMinutes === "number" && Number.isFinite(rec.expiresAfterMinutes) ? Math.max(1, Math.round(rec.expiresAfterMinutes)) : null,
      priority: typeof rec.priority === "number" && Number.isFinite(rec.priority) ? Math.round(rec.priority) : 0,
      reason: rec.reason,
    });
  }
  return rules.length ? rules : DEFAULT_ACTION_RULES.map((rule) => ({ ...rule, conditions: rule.conditions.map((condition) => ({ ...condition })) }));
}

export function parseSlackNotificationSettings(value: unknown): SlackNotificationSettings {
  const rec = asRecord(value);
  return {
    slackNotificationsEnabled: boolValue(rec.slackNotificationsEnabled, DEFAULT_SLACK_NOTIFICATION_SETTINGS.slackNotificationsEnabled),
    slackApprovalAlertsEnabled: boolValue(rec.slackApprovalAlertsEnabled, DEFAULT_SLACK_NOTIFICATION_SETTINGS.slackApprovalAlertsEnabled),
    slackDefaultChannelId: stringOrNull(rec.slackDefaultChannelId),
    slackDefaultChannelName: stringOrNull(rec.slackDefaultChannelName),
    notifyOnRevenueApprovalCreated: boolValue(rec.notifyOnRevenueApprovalCreated, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnRevenueApprovalCreated),
    notifyOnApprovalApproved: boolValue(rec.notifyOnApprovalApproved, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnApprovalApproved),
    notifyOnApprovalRejected: boolValue(rec.notifyOnApprovalRejected, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnApprovalRejected),
    notifyOnExecutionFailed: boolValue(rec.notifyOnExecutionFailed, DEFAULT_SLACK_NOTIFICATION_SETTINGS.notifyOnExecutionFailed),
  };
}

export function parseTrelloProjectSettings(value: unknown): TrelloProjectSettings {
  const root = asRecord(value);
  const pm = asRecord(root.project_management);
  const trello = asRecord(pm.trello);
  return {
    defaultBoardId: stringOrNull(trello.defaultBoardId),
    defaultBoardName: stringOrNull(trello.defaultBoardName),
    defaultListId: stringOrNull(trello.defaultListId),
    defaultListName: stringOrNull(trello.defaultListName),
  };
}

export async function loadWorkspacePolicySettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
}): Promise<{
  approvalPolicy: Record<string, unknown>;
  notifications: Record<string, unknown>;
  version: number;
  actionRules: PolicyActionRule[];
  customerEmailMode: CustomerEmailMode;
  connectorPolicies: Record<string, ConnectorPolicySettings>;
  slack: SlackNotificationSettings;
  trello: TrelloProjectSettings;
}> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const settings = await supabase
    .from("os_workspace_settings")
    .select("approval_policy,notifications")
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();

  if (settings.error) throw new Error(settings.error.message);
  const storedApprovalPolicy = asRecord(settings.data?.approval_policy);
  const actionRules = parseActionRules(storedApprovalPolicy.actionRules);
  // Normalize the legacy display-only CRM flag at the existing persistence
  // boundary. The runtime evaluator has always remained the authority, but
  // returning the old "Auto-approve" value would make the policy UI lie.
  const approvalPolicy = {
    ...DEFAULT_APPROVAL_POLICY,
    ...storedApprovalPolicy,
    version: 2,
    crmWrites: "Always require approval",
    actionRules,
    connectorPolicies: parseConnectorPolicies(storedApprovalPolicy.connectorPolicies),
  };
  const notifications = asRecord(settings.data?.notifications);
  return {
    approvalPolicy,
    notifications,
    version: 2,
    actionRules,
    customerEmailMode: customerEmailMode(approvalPolicy.customerEmailMode),
    connectorPolicies: parseConnectorPolicies(approvalPolicy.connectorPolicies),
    slack: parseSlackNotificationSettings(notifications),
    trello: parseTrelloProjectSettings(notifications),
  };
}

export async function saveSlackNotificationSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  patch: Partial<SlackNotificationSettings>;
}): Promise<SlackNotificationSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const next = parseSlackNotificationSettings({ ...current.notifications, ...input.patch });
  const update = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspaceId,
    approval_policy: current.approvalPolicy,
    notifications: { ...current.notifications, ...next },
  }, { onConflict: "workspace_id" });
  if (update.error) throw new Error(update.error.message);
  return next;
}

export async function saveTrelloProjectSettings(input: {
  supabase?: SupabaseAdmin;
  workspaceId: string;
  patch: Partial<TrelloProjectSettings>;
}): Promise<TrelloProjectSettings> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const current = await loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId });
  const currentPm = asRecord(current.notifications.project_management);
  const next = { ...current.trello, ...input.patch };
  const update = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspaceId,
    approval_policy: current.approvalPolicy,
    notifications: {
      ...current.notifications,
      project_management: {
        ...currentPm,
        trello: next,
      },
    },
  }, { onConflict: "workspace_id" });
  if (update.error) throw new Error(update.error.message);
  return parseTrelloProjectSettings({ project_management: { trello: next } });
}
