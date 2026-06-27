import type {
  PolicyDecision,
  PolicyDecisionKind,
  PolicyEvaluationEntitlements,
  PolicyInput,
  PolicyWorkspaceSettings,
} from "@/lib/policies/types";

function userFacingLabel(decision: PolicyDecisionKind): string {
  if (decision === "allow_auto") return "Auto allowed";
  if (decision === "approval_required") return "Approval required";
  if (decision === "draft_only") return "Draft only";
  return "Blocked";
}

function canExecuteNow(decision: PolicyDecisionKind, entitlements?: PolicyEvaluationEntitlements): boolean {
  if (decision !== "allow_auto") return false;
  if (!entitlements) return false;
  const billingActive = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing";
  return Boolean(entitlements.canRunRealActions && billingActive);
}

function build(input: {
  decision: PolicyDecisionKind;
  reason: string;
  riskLevel: PolicyInput["riskLevel"];
  matchedRuleId: string;
  entitlements?: PolicyEvaluationEntitlements;
}): PolicyDecision {
  return {
    decision: input.decision,
    reason: input.reason,
    riskLevel: input.riskLevel,
    matchedRuleId: input.matchedRuleId,
    requiresHumanReview: input.decision === "approval_required" || input.decision === "draft_only",
    canExecuteNow: canExecuteNow(input.decision, input.entitlements),
    auditLabel: `policy.${input.decision}.${input.matchedRuleId}`,
    userFacingLabel: userFacingLabel(input.decision),
  };
}

/**
 * Pure, deterministic policy evaluator. No DB writes, no connector calls.
 *
 * v1 invariants (hard):
 * - never auto-send customer emails
 * - never auto-allow CRM writes
 * - never auto-allow Trello card create/move
 * - never auto-allow unknown actions
 * - destructive actions are always blocked
 * The only auto-allow paths are: system notifications/daily brief/health checks
 * when enabled, and low-risk Trello comments in Assisted mode with high confidence.
 */
export function evaluatePolicy(
  input: PolicyInput,
  policy: PolicyWorkspaceSettings,
  entitlements?: PolicyEvaluationEntitlements,
): PolicyDecision {
  const risk = input.riskLevel;
  const stop = policy.emergencyStopEnabled;
  const isSystemNotification = Boolean(input.systemNotification);

  // Destructive actions are never automatic, in any mode.
  if (input.destructive) {
    return build({ decision: "blocked", reason: "Destructive actions are blocked by policy.", riskLevel: "high", matchedRuleId: "destructive.blocked", entitlements });
  }

  // System / internal notification paths (connector health, daily brief, internal
  // approval notifications). These are the only things allowed to run hands-free.
  if (isSystemNotification || input.destinationType === "system") {
    const healthOrBrief = input.source === "connector-health-check" || input.source === "workspace-daily-brief" || input.actionType === "system";
    if (input.source === "connector-health-check") {
      return policy.connectorHealthChecksAllowed
        ? build({ decision: "allow_auto", reason: "Connector health checks run automatically.", riskLevel: "low", matchedRuleId: "system.health_check", entitlements })
        : build({ decision: "approval_required", reason: "Connector health checks are disabled.", riskLevel: "low", matchedRuleId: "system.health_check.disabled", entitlements });
    }
    if (input.source === "workspace-daily-brief") {
      if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks the daily brief.", riskLevel: "low", matchedRuleId: "emergency.daily_brief", entitlements });
      return policy.dailyBriefAllowed
        ? build({ decision: "allow_auto", reason: "Daily brief runs automatically.", riskLevel: "low", matchedRuleId: "system.daily_brief", entitlements })
        : build({ decision: "approval_required", reason: "Daily brief is disabled.", riskLevel: "low", matchedRuleId: "system.daily_brief.disabled", entitlements });
    }
    if (isSystemNotification) {
      // Internal approval notifications are allowed even under emergency stop, but
      // only when internal Slack notifications are enabled in settings.
      return policy.internalSlackNotificationsAllowed
        ? build({ decision: "allow_auto", reason: "Internal approval notifications are enabled.", riskLevel: "low", matchedRuleId: "system.internal_notification", entitlements })
        : build({ decision: "approval_required", reason: "Internal notifications are not enabled.", riskLevel: "low", matchedRuleId: "system.internal_notification.disabled", entitlements });
    }
    if (healthOrBrief) {
      return build({ decision: "allow_auto", reason: "System task allowed.", riskLevel: "low", matchedRuleId: "system.task", entitlements });
    }
    // Unknown system action: never auto.
    return build({ decision: "approval_required", reason: "Unrecognized system action requires review.", riskLevel: risk, matchedRuleId: "system.unknown", entitlements });
  }

  // Customer email (never auto-sends in v1).
  if (input.actionType === "send_email" || input.destinationType === "customer" || input.destinationType === "external") {
    if (stop) {
      return build({ decision: "blocked", reason: "Emergency stop blocks customer email sends.", riskLevel: "high", matchedRuleId: "emergency.customer_email", entitlements });
    }
    if (policy.customerEmailMode === "draft_only") {
      return build({ decision: "draft_only", reason: "Customer email policy is draft only. The reply is prepared but not sent.", riskLevel: "high", matchedRuleId: "customer_email.draft_only", entitlements });
    }
    // auto_send_low_risk is intentionally NOT honored as auto-send in v1.
    return build({ decision: "approval_required", reason: "Customer emails require human approval before sending.", riskLevel: "high", matchedRuleId: "customer_email.approval_required", entitlements });
  }

  // CRM writes (never auto in v1).
  if (input.destinationType === "crm" || input.actionType === "create_crm_contact" || input.actionType === "create_crm_deal") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks CRM writes.", riskLevel: "high", matchedRuleId: "emergency.crm", entitlements });
    return build({ decision: "approval_required", reason: "CRM writes require human approval.", riskLevel: risk === "low" ? "medium" : risk, matchedRuleId: "crm.approval_required", entitlements });
  }

  // Project tool (Trello) actions.
  if (input.destinationType === "project_tool") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks project tool changes.", riskLevel: "high", matchedRuleId: "emergency.project_tool", entitlements });

    // Card create / move always require approval.
    if (input.actionType === "create_task" || input.actionType === "move_task") {
      return build({ decision: "approval_required", reason: "Trello card creation and moves require approval.", riskLevel: risk, matchedRuleId: "project_tool.write.approval_required", entitlements });
    }

    // Comments: auto only in Assisted mode, low risk, high confidence.
    if (input.actionType === "add_task_comment") {
      const eligible = policy.autonomyMode === "assisted"
        && policy.lowRiskProjectToolCommentsAllowed
        && input.riskLevel === "low"
        && input.confidence === "high"
        && !stop;
      if (eligible) {
        return build({ decision: "allow_auto", reason: "Low-risk Trello comment auto-applied in Assisted mode.", riskLevel: "low", matchedRuleId: "project_tool.comment.assisted_auto", entitlements });
      }
      return build({ decision: "approval_required", reason: "Trello comments require approval in this mode.", riskLevel: input.riskLevel, matchedRuleId: "project_tool.comment.approval_required", entitlements });
    }

    return build({ decision: "approval_required", reason: "Project tool action requires approval.", riskLevel: risk, matchedRuleId: "project_tool.unknown.approval_required", entitlements });
  }

  // Internal Slack message prepared by an operator (not a system notification).
  if (input.actionType === "send_slack_message" || input.destinationType === "internal") {
    if (stop) return build({ decision: "blocked", reason: "Emergency stop blocks operator Slack messages.", riskLevel: "medium", matchedRuleId: "emergency.internal_slack", entitlements });
    return build({ decision: "approval_required", reason: "Operator-prepared Slack messages require approval.", riskLevel: input.riskLevel, matchedRuleId: "internal_slack.approval_required", entitlements });
  }

  // Unknown action: never auto.
  return build({ decision: "approval_required", reason: "Unknown action requires human approval.", riskLevel: risk, matchedRuleId: "unknown.approval_required", entitlements });
}
