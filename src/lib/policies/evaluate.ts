import type {
  PolicyDecision,
  PolicyDecisionKind,
  PolicyEvaluationEntitlements,
  PolicyInput,
  PolicyWorkspaceSettings,
} from "@/lib/policies/types";
import type {
  PolicyActionRule,
  PolicyBusinessContext,
  PolicyCondition,
  PolicyConditionField,
  PolicyContextReliability,
  PolicyContextValue,
} from "@/lib/policies/types";

type ContextRecord = Record<string, unknown>;

function contextRecord(value: unknown): ContextRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ContextRecord : {};
}

function contextValueOf<T>(value: unknown, fallbackReliability: PolicyContextReliability = "observed"): PolicyContextValue<T> {
  const record = contextRecord(value);
  if (Object.prototype.hasOwnProperty.call(record, "value") || Object.prototype.hasOwnProperty.call(record, "reliability")) {
    const reliability = record.reliability;
    return {
      value: (record.value ?? null) as T | null,
      reliability: reliability === "verified" || reliability === "observed" || reliability === "derived" || reliability === "stale" || reliability === "missing"
        ? reliability
        : record.value == null ? "missing" : fallbackReliability,
      observedAt: typeof record.observedAt === "string" ? record.observedAt : null,
    };
  }
  return { value: value == null ? null : value as T, reliability: value == null ? "missing" : fallbackReliability };
}

function contextValue(context: PolicyBusinessContext | undefined, field: PolicyConditionField): PolicyContextValue<unknown> {
  const [group, key] = field.split(".") as [keyof PolicyBusinessContext, string];
  const groupValue = context?.[group] as ContextRecord | undefined;
  const result = groupValue?.[key];
  if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "reliability")) {
    return result as PolicyContextValue<unknown>;
  }
  return contextValueOf(result, "missing");
}

function canonicalContext(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalContext).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value) ?? "null";
  return `{${Object.keys(value as ContextRecord).sort().map((key) => `${JSON.stringify(key)}:${canonicalContext((value as ContextRecord)[key])}`).join(",")}}`;
}

function businessContextFingerprint(context: PolicyBusinessContext | undefined): string | null {
  if (!context) return null;
  const input = canonicalContext(context);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ctx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function summarizeBusinessContext(context: PolicyBusinessContext | undefined): Record<string, string | number | boolean | null> {
  const summary: Record<string, string | number | boolean | null> = {};
  if (!context) return summary;
  for (const field of [
    "deal.amount", "deal.currency", "deal.stage", "deal.discount_percent",
    "customer.tier", "customer.region", "customer.sentiment", "customer.sla_priority",
    "refund.amount", "project.priority", "project.due_date_impact", "task.type",
    "task.external_collaborator", "campaign.spend", "campaign.audience_size",
    "document.sensitivity", "workspace.risk_level",
  ] as PolicyConditionField[]) {
    const value = contextValue(context, field);
    if (value.value !== null && value.value !== undefined) summary[field] = value.value as string | number | boolean;
  }
  return summary;
}

function userFacingLabel(decision: PolicyDecisionKind): string {
  if (decision === "allow_auto") return "Auto allowed";
  if (decision === "approval_required") return "Approval required";
  if (decision === "draft_only") return "Draft only";
  return "Blocked";
}

function canExecuteNow(decision: PolicyDecisionKind, entitlements?: PolicyEvaluationEntitlements): boolean {
  if (decision !== "allow_auto" || !entitlements) return false;
  const billingActive = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing";
  return Boolean(entitlements.canRunRealActions && billingActive);
}

function conditionValue(value: unknown): string | number | boolean | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
}

function scalarCompare(actual: unknown, expected: unknown, operator: PolicyCondition["operator"]): boolean {
  if (actual === null || actual === undefined) return operator === "missing";
  if (operator === "exists") return true;
  if (operator === "missing") return false;
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (operator === "gt") return typeof actual === "number" && typeof expected === "number" && actual > expected;
  if (operator === "gte") return typeof actual === "number" && typeof expected === "number" && actual >= expected;
  if (operator === "lt") return typeof actual === "number" && typeof expected === "number" && actual < expected;
  if (operator === "lte") return typeof actual === "number" && typeof expected === "number" && actual <= expected;
  if (operator === "in") return Array.isArray(expected) && expected.includes(actual as never);
  if (operator === "not_in") return Array.isArray(expected) && !expected.includes(actual as never);
  return false;
}

function conditionMatches(input: PolicyInput, condition: PolicyCondition): boolean {
  const current = contextValue(input.businessContext, condition.field);
  const unavailable = current.value === null || current.value === undefined || current.reliability === "missing" || current.reliability === "stale";
  if (condition.operator === "missing") return unavailable;
  if (condition.operator === "exists") return !unavailable;
  if (unavailable) return false;
  return scalarCompare(current.value, condition.value, condition.operator);
}

function ruleMatchesIdentity(input: PolicyInput, rule: PolicyActionRule): boolean {
  return Boolean(rule.enabled)
    && (!rule.operator || rule.operator === input.operatorKey)
    && (!rule.domain || rule.domain === input.domain)
    && (!rule.connector || rule.connector === input.connectorKey)
    && (!rule.action || rule.action === input.actionType)
    && (!rule.subjectType || rule.subjectType === input.subjectType);
}

function ruleContextUnavailable(input: PolicyInput, rule: PolicyActionRule): boolean {
  return rule.conditions.some((condition) => {
    if (condition.operator === "missing" || condition.operator === "exists") return false;
    const current = contextValue(input.businessContext, condition.field);
    return current.value === null || current.value === undefined || current.reliability === "missing" || current.reliability === "stale";
  });
}

function sortRules(rules: PolicyActionRule[]): PolicyActionRule[] {
  return [...rules].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function thresholdEvidence(input: PolicyInput, relevantRules: PolicyActionRule[], matchedRuleIds: string[]) {
  const rule = relevantRules.find((candidate) => candidate.conditions.some((condition) => condition.field === "deal.amount" && ["gt", "gte", "lt", "lte"].includes(condition.operator)));
  const condition = rule?.conditions.find((candidate) => candidate.field === "deal.amount" && ["gt", "gte", "lt", "lte"].includes(candidate.operator));
  if (!condition) return null;
  const observed = contextValue(input.businessContext, "deal.amount");
  return {
    field: condition.field,
    operator: condition.operator,
    configuredValue: conditionValue(condition.value),
    observedValue: conditionValue(observed.value),
    result: observed.value === null || observed.value === undefined || observed.reliability === "missing" || observed.reliability === "stale"
      ? "unavailable" as const
      : matchedRuleIds.includes(rule?.id ?? "") ? "matched" as const : "not_matched" as const,
  };
}

function build(input: {
  decision: PolicyDecisionKind;
  reason: string;
  riskLevel: PolicyInput["riskLevel"];
  matchedRuleId: string;
  policyInput: PolicyInput;
  policy: PolicyWorkspaceSettings;
  entitlements?: PolicyEvaluationEntitlements;
  matchedRuleIds?: string[];
  relevantRules?: PolicyActionRule[];
}): PolicyDecision {
  const matchedRuleIds = unique([input.matchedRuleId, ...(input.matchedRuleIds ?? [])]);
  const relevantRules = input.relevantRules ?? [];
  const approverRoles = unique(relevantRules.flatMap((rule) => rule.approverRoles ?? []));
  const expiry = relevantRules.find((rule) => rule.expiresAfterMinutes != null)?.expiresAfterMinutes ?? null;
  return {
    decision: input.decision,
    reason: input.reason,
    riskLevel: input.riskLevel,
    matchedRuleId: input.matchedRuleId,
    requiresHumanReview: input.decision === "approval_required" || input.decision === "draft_only",
    canExecuteNow: canExecuteNow(input.decision, input.entitlements),
    auditLabel: `policy.${input.decision}.${input.matchedRuleId}`,
    userFacingLabel: userFacingLabel(input.decision),
    matchedRuleIds,
    policyVersion: input.policy.version ?? 1,
    evidence: {
      policyVersion: input.policy.version ?? 1,
      matchedRuleIds,
      connector: input.policyInput.connectorKey,
      action: input.policyInput.actionType,
      subjectType: input.policyInput.subjectType ?? null,
      subjectId: input.policyInput.subjectId ?? null,
      contextSummary: summarizeBusinessContext(input.policyInput.businessContext),
      contextFingerprint: businessContextFingerprint(input.policyInput.businessContext),
      threshold: thresholdEvidence(input.policyInput, relevantRules, matchedRuleIds),
      requiredApproverRoles: approverRoles,
      approvalExpiresAfterMinutes: expiry,
    },
  };
}

/** Pure policy evaluation. No database, provider, or LLM access is allowed here. */
export function evaluatePolicy(input: PolicyInput, policy: PolicyWorkspaceSettings, entitlements?: PolicyEvaluationEntitlements): PolicyDecision {
  const risk = input.riskLevel;
  const stop = policy.emergencyStopEnabled;
  const isSystemNotification = Boolean(input.systemNotification);
  const relevantRules = sortRules((policy.actionRules ?? []).filter((rule) => ruleMatchesIdentity(input, rule)));
  const matchedRules = relevantRules.filter((rule) => rule.conditions.every((condition) => conditionMatches(input, condition)));
  const matchedDeny = matchedRules.find((rule) => rule.decision === "blocked");
  const matchedBusinessRule = matchedRules.find((rule) => rule.decision !== "blocked");

  if (policy.autonomyMode === "manual" && !isSystemNotification && input.destinationType !== "system") return build({ decision: "blocked", reason: "Manual mode allows recommendations and drafts only.", riskLevel: risk, matchedRuleId: "autonomy.manual", policyInput: input, policy, entitlements });
  if (input.destructive) return build({ decision: "blocked", reason: "Destructive actions are blocked by policy.", riskLevel: "high", matchedRuleId: "destructive.blocked", policyInput: input, policy, entitlements });
  if (matchedDeny) return build({ decision: "blocked", reason: matchedDeny.reason, riskLevel: risk, matchedRuleId: matchedDeny.id, policyInput: input, policy, entitlements, matchedRuleIds: [matchedDeny.id], relevantRules: [matchedDeny] });

  if (isSystemNotification || input.destinationType === "system") {
    const healthOrBrief = input.source === "connector-health-check" || input.source === "workspace-daily-brief" || input.actionType === "system";
    if (input.source === "connector-health-check") return policy.connectorHealthChecksAllowed
      ? build({ decision: "allow_auto", reason: "Connector health checks run automatically.", riskLevel: "low", matchedRuleId: "system.health_check", policyInput: input, policy, entitlements })
      : build({ decision: "approval_required", reason: "Connector health checks are disabled.", riskLevel: "low", matchedRuleId: "system.health_check.disabled", policyInput: input, policy, entitlements });
    if (input.source === "workspace-daily-brief") {
      if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks the daily brief.", riskLevel: "low", matchedRuleId: "emergency.daily_brief", policyInput: input, policy, entitlements });
      return policy.dailyBriefAllowed
        ? build({ decision: "allow_auto", reason: "Daily brief runs automatically.", riskLevel: "low", matchedRuleId: "system.daily_brief", policyInput: input, policy, entitlements })
        : build({ decision: "approval_required", reason: "Daily brief is disabled.", riskLevel: "low", matchedRuleId: "system.daily_brief.disabled", policyInput: input, policy, entitlements });
    }
    if (isSystemNotification) return policy.internalSlackNotificationsAllowed
      ? build({ decision: "allow_auto", reason: "Internal approval notifications are enabled.", riskLevel: "low", matchedRuleId: "system.internal_notification", policyInput: input, policy, entitlements })
      : build({ decision: "approval_required", reason: "Internal notifications are not enabled.", riskLevel: "low", matchedRuleId: "system.internal_notification.disabled", policyInput: input, policy, entitlements });
    if (healthOrBrief) return build({ decision: "allow_auto", reason: "System task allowed.", riskLevel: "low", matchedRuleId: "system.task", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: "Unrecognized system action requires review.", riskLevel: risk, matchedRuleId: "system.unknown", policyInput: input, policy, entitlements });
  }

  // Context conditions fail safe. A stale or unverifiable value cannot satisfy
  // a rule and cannot be used to gain an automatic exception.
  const unavailableRule = relevantRules.find((rule) => ruleContextUnavailable(input, rule));
  if (unavailableRule) return build({
    decision: "approval_required",
    reason: `${unavailableRule.reason} Required business context is missing, stale, or unverifiable.`,
    riskLevel: risk,
    matchedRuleId: `${unavailableRule.id}.context_required`,
    policyInput: input,
    policy,
    entitlements,
    matchedRuleIds: [unavailableRule.id],
    relevantRules: [unavailableRule],
  });

  if (input.actionType === "send_teams_message" || input.connectorKey === "microsoft_teams") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks operator Teams messages.", riskLevel: "medium", matchedRuleId: "emergency.teams_message", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: "Microsoft Teams messages require human approval before sending.", riskLevel: input.riskLevel === "low" ? "medium" : input.riskLevel, matchedRuleId: "teams_message.approval_required", policyInput: input, policy, entitlements });
  }
  if (input.connectorKey === "zendesk" || input.actionType === "reply_zendesk_ticket" || input.actionType === "add_zendesk_internal_note" || input.actionType === "update_zendesk_ticket") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks Zendesk actions.", riskLevel: input.actionType === "reply_zendesk_ticket" ? "high" : risk, matchedRuleId: "emergency.zendesk", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: input.actionType === "reply_zendesk_ticket" ? "Public Zendesk replies require human approval." : "Zendesk ticket changes require human approval.", riskLevel: input.actionType === "reply_zendesk_ticket" ? "high" : risk, matchedRuleId: input.actionType === "reply_zendesk_ticket" ? "zendesk.reply.approval_required" : "zendesk.ticket_change.approval_required", policyInput: input, policy, entitlements });
  }
  if (input.connectorKey === "intercom" || input.actionType === "reply_intercom_conversation" || input.actionType === "update_intercom_conversation") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks Intercom actions.", riskLevel: input.actionType === "reply_intercom_conversation" ? "high" : risk, matchedRuleId: "emergency.intercom", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: input.actionType === "reply_intercom_conversation" ? "Public Intercom replies require human approval." : "Intercom conversation changes require human approval.", riskLevel: input.actionType === "reply_intercom_conversation" ? "high" : risk, matchedRuleId: input.actionType === "reply_intercom_conversation" ? "intercom.reply.approval_required" : "intercom.update.approval_required", policyInput: input, policy, entitlements });
  }

  if (input.actionType === "send_email" || input.destinationType === "customer" || input.destinationType === "external") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks customer email sends.", riskLevel: "high", matchedRuleId: "emergency.customer_email", policyInput: input, policy, entitlements });
    if (policy.customerEmailMode === "draft_only") return build({ decision: "draft_only", reason: "Customer email policy is draft only. The reply is prepared but not sent.", riskLevel: "high", matchedRuleId: "customer_email.draft_only", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: "Customer emails require human approval before sending.", riskLevel: "high", matchedRuleId: "customer_email.approval_required", policyInput: input, policy, entitlements });
  }

  if (input.destinationType === "crm" || input.actionType.startsWith("create_crm_") || input.actionType === "update_crm_record") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks CRM writes.", riskLevel: "high", matchedRuleId: "emergency.crm", policyInput: input, policy, entitlements });
    if (matchedBusinessRule?.decision === "draft_only") return build({ decision: "draft_only", reason: matchedBusinessRule.reason, riskLevel: risk === "low" ? "medium" : risk, matchedRuleId: matchedBusinessRule.id, policyInput: input, policy, entitlements, matchedRuleIds: [matchedBusinessRule.id], relevantRules: [matchedBusinessRule] });
    // CRM automation remains disabled. Business rules can strengthen or explain
    // this approval boundary, but cannot weaken it.
    return build({ decision: "approval_required", reason: matchedBusinessRule?.decision === "approval_required" ? matchedBusinessRule.reason : "CRM writes require human approval.", riskLevel: risk === "low" ? "medium" : risk, matchedRuleId: matchedBusinessRule?.decision === "approval_required" ? matchedBusinessRule.id : "crm.approval_required", policyInput: input, policy, entitlements, matchedRuleIds: matchedBusinessRule ? [matchedBusinessRule.id] : [], relevantRules: matchedBusinessRule ? [matchedBusinessRule] : relevantRules });
  }

  if (input.destinationType === "project_tool") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks project tool changes.", riskLevel: "high", matchedRuleId: "emergency.project_tool", policyInput: input, policy, entitlements });
    if (input.actionType === "create_task" || input.actionType === "move_task") return build({ decision: "approval_required", reason: "Trello card creation and moves require approval.", riskLevel: risk, matchedRuleId: "project_tool.write.approval_required", policyInput: input, policy, entitlements });
    if (input.actionType === "add_task_comment") {
      const eligible = (policy.autonomyMode === "guarded" || policy.autonomyMode === "autonomous") && policy.lowRiskProjectToolCommentsAllowed && input.riskLevel === "low" && input.confidence === "high" && !stop;
      if (eligible) return build({ decision: "allow_auto", reason: "Low-risk Trello comment auto-applied in Guarded mode.", riskLevel: "low", matchedRuleId: "project_tool.comment.assisted_auto", policyInput: input, policy, entitlements });
      return build({ decision: "approval_required", reason: "Trello comments require approval in this mode.", riskLevel: input.riskLevel, matchedRuleId: "project_tool.comment.approval_required", policyInput: input, policy, entitlements });
    }
    return build({ decision: "approval_required", reason: "Project tool action requires approval.", riskLevel: risk, matchedRuleId: "project_tool.unknown.approval_required", policyInput: input, policy, entitlements });
  }

  if (input.actionType === "send_slack_message" || input.destinationType === "internal") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks operator Slack messages.", riskLevel: "medium", matchedRuleId: "emergency.internal_slack", policyInput: input, policy, entitlements });
    return build({ decision: "approval_required", reason: "Operator-prepared Slack messages require approval.", riskLevel: input.riskLevel, matchedRuleId: "internal_slack.approval_required", policyInput: input, policy, entitlements });
  }

  return build({ decision: "approval_required", reason: "Unknown action requires human approval.", riskLevel: risk, matchedRuleId: "unknown.approval_required", policyInput: input, policy, entitlements });
}
