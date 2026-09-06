import { getConnectorDefinition } from "@/lib/connectors/registry";
import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { getOperatorDefinition } from "@/lib/operators/registry";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

type Row = Record<string, unknown>;
type Severity = "info" | "success" | "warning" | "danger";
type TodayExecutionStats = {
  actionsExecuted: number;
  blockedByPolicy: number;
  emailsSent: number;
  hubspotUpdates: number;
  trelloUpdates: number;
  slackMessages: number;
  failedExecutions: number;
};

export type DashboardOverview = {
  workspace: {
    id: string;
    name: string;
    planTier: string | null;
    billingStatus: string | null;
  };
  systemStatus: {
    status: "healthy" | "needs_attention" | "setup_incomplete" | "emergency_stop";
    label: string;
    description: string;
  };
  policy: {
    autonomyMode: "safe" | "assisted" | "managed";
    emergencyStopEnabled: boolean;
    customerEmailMode: "approval_required" | "draft_only" | "auto_send_low_risk";
    safeSummary: string;
    assistedSummary: string;
  };
  approvals: {
    pendingCount: number;
    highRiskCount: number;
    blockedCount: number;
    draftOnlyCount: number;
    latest: DashboardApproval[];
  };
  today: {
    runsCount: number;
    approvalsCreated: number;
    approvalsApproved: number;
    actionsExecuted: number;
    autoHandled: number;
    blockedByPolicy: number;
    emailsSent: number;
    hubspotUpdates: number;
    trelloUpdates: number;
    slackMessages: number;
    failedExecutions: number;
  };
  operators: DashboardOperator[];
  connectors: DashboardConnector[];
  activity: DashboardActivity[];
  nextBestActions: DashboardNextAction[];
  lastUpdatedAt: string;
};

export type DashboardApproval = {
  id: string;
  title: string;
  createdAt: string | null;
  operatorKey: string | null;
  riskLevel: string | null;
  policyDecision: string | null;
  href: string;
};

export type DashboardOperator = {
  key: "revenue" | "client_flow" | "operations";
  name: string;
  status: "ready" | "needs_setup" | "monitoring" | "disabled";
  lastRunAt: string | null;
  nextRunAt: string | null;
  pendingApprovals: number;
  signalsToday: number;
  actionsToday: number;
  description: string;
  href: string;
};

export type DashboardConnector = {
  key: "gmail" | "hubspot" | "slack" | "trello";
  name: string;
  status: "connected" | "needs_setup" | "error" | "coming_soon";
  connected: boolean;
  lastCheckedAt: string | null;
  purpose: string;
  usedBy: string[];
  href: string;
};

export type DashboardActivity = {
  id: string;
  time: string | null;
  type: string;
  title: string;
  description: string;
  operatorKey: string | null;
  connectorKey: string | null;
  severity: Severity;
  href: string;
};

export type DashboardNextAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
};

function asRecord(value: unknown): Row {
  return value && typeof value === "object" ? value as Row : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timeValue(row: Row): string | null {
  return stringValue(row.created_at) ?? stringValue(row.completed_at) ?? stringValue(row.resolved_at);
}

function inLast24h(value: unknown, now = Date.now()): boolean {
  const str = stringValue(value);
  if (!str) return false;
  const ts = new Date(str).getTime();
  return Number.isFinite(ts) && now - ts <= 24 * 60 * 60 * 1000;
}

function connectorIsConnected(truth: SafeConnectorTruth | undefined): boolean {
  if (!truth) return false;
  if (truth.connectorKey === "gmail") return Boolean(truth.executable && (truth.status === "healthy" || truth.status === "connected"));
  return Boolean(truth.status === "connected" && truth.providerConfigKey && truth.nangoConnectionId);
}

function operatorDisplayName(key: string | null): string {
  if (key === "client_flow") return "Client Flow";
  if (key === "operations") return "Operations";
  if (key === "revenue") return "Revenue";
  return key ? key.replace(/_/g, " ") : "Operator";
}

function policyDecisionFromPayload(payload: Row): string | null {
  const execution = asRecord(payload.executionResult);
  const action = asRecord(payload.preparedAction);
  const direct = asRecord(payload.policyDecision);
  const executionDecision = asRecord(execution.policyDecision);
  const actionDecision = asRecord(action.policyDecision);
  return stringValue(direct.decision) ?? stringValue(executionDecision.decision) ?? stringValue(actionDecision.decision);
}

function riskFromPayload(payload: Row): string | null {
  const source = asRecord(payload.sourceMetadata);
  const action = asRecord(payload.preparedAction);
  const execution = asRecord(payload.executionResult);
  const decision = asRecord(execution.policyDecision);
  return stringValue(decision.riskLevel)
    ?? stringValue(action.riskLevel)
    ?? stringValue(source.riskLevel)
    ?? (payload.kind === "gmail.send_after_approval" || payload.kind === "microsoft.send_after_approval" ? "high" : null);
}

export function mapApprovalToActivity(row: Row): DashboardActivity {
  const payload = asRecord(row.continuation_payload);
  const status = stringValue(row.status) ?? "pending";
  const kind = stringValue(payload.kind);
  const operatorKey = stringValue(payload.operatorKey) ?? stringValue(row.agent_id);
  const title = status === "pending" ? "Approval created" : status === "approved" ? "Approval approved" : status === "failed" ? "Approval failed" : "Approval updated";
  const connectorKey = kind?.includes("gmail") ? "gmail" : kind?.includes("microsoft") ? "microsoft" : kind?.includes("slack") ? "slack" : kind?.includes("shared_action") ? "trello" : null;
  return {
    id: `approval-${String(row.id)}`,
    time: timeValue(row),
    type: `approval.${status}`,
    title,
    description: stringValue(row.title) ?? "Operator action requires review.",
    operatorKey,
    connectorKey,
    severity: status === "failed" ? "danger" : status === "pending" ? "warning" : "success",
    href: "/approvals",
  };
}

export function mapRunLogToActivity(row: Row): DashboardActivity {
  const eventType = stringValue(row.event_type) ?? "operator.log";
  const metadata = asRecord(row.metadata);
  const severity: Severity = stringValue(row.level) === "error"
    ? "danger"
    : stringValue(row.level) === "warn" || eventType.includes("blocked") || eventType.includes("failed")
      ? "warning"
      : eventType.includes("sent") || eventType.includes("executed") || eventType.includes("completed")
        ? "success"
        : "info";
  const connectorKey = eventType.includes("gmail") ? "gmail" : eventType.includes("hubspot") ? "hubspot" : eventType.includes("trello") ? "trello" : eventType.includes("slack") ? "slack" : stringValue(metadata.connectorKey);
  return {
    id: `log-${String(row.id ?? row.run_id ?? eventType)}`,
    time: timeValue(row),
    type: eventType,
    title: eventType.replace(/[._]/g, " "),
    description: stringValue(row.message) ?? "Operator activity recorded.",
    operatorKey: stringValue(metadata.operatorKey) ?? stringValue(row.operator_key),
    connectorKey,
    severity,
    href: "/logs",
  };
}

function executionStatsFromApproval(row: Row) {
  const payload = asRecord(row.continuation_payload);
  const execution = asRecord(payload.executionResult);
  const action = asRecord(execution.action);
  const connectorKey = stringValue(action.connectorKey) ?? stringValue(asRecord(payload.preparedAction).connectorKey);
  const gmailSent = stringValue(execution.gmailStatus) === "sent";
  const slackSent = stringValue(execution.slackStatus) === "sent";
  const trelloDone = stringValue(execution.trelloStatus) === "executed" || (stringValue(execution.status) === "executed" && connectorKey === "trello");
  const hubspotDone = ["completed", "executed", "success"].includes(stringValue(execution.hubspotStatus) ?? "");
  const blocked = stringValue(execution.gmailStatus) === "blocked_by_policy"
    || stringValue(execution.slackStatus) === "blocked_by_policy"
    || stringValue(execution.trelloStatus) === "blocked_by_policy"
    || stringValue(execution.status) === "blocked_by_policy"
    || policyDecisionFromPayload(payload) === "blocked";
  const draftOnly = stringValue(execution.gmailStatus) === "draft_only_not_sent" || policyDecisionFromPayload(payload) === "draft_only";
  const failed = stringValue(row.status) === "failed" || stringValue(execution.status) === "failed";
  return {
    actionsExecuted: [gmailSent, slackSent, trelloDone, hubspotDone].filter(Boolean).length,
    emailsSent: gmailSent ? 1 : 0,
    hubspotUpdates: hubspotDone ? 1 : 0,
    trelloUpdates: trelloDone ? 1 : 0,
    slackMessages: slackSent ? 1 : 0,
    blockedByPolicy: blocked ? 1 : 0,
    draftOnly: draftOnly ? 1 : 0,
    failedExecutions: failed ? 1 : 0,
  };
}

export function summarizeToday(input: { approvals: Row[]; runs: Row[]; logs: Row[] }) {
  const todayApprovals = input.approvals.filter((row) => inLast24h(row.created_at));
  const resolvedToday = input.approvals.filter((row) => inLast24h(row.resolved_at));
  const todayRuns = input.runs.filter((row) => inLast24h(row.created_at) || inLast24h(row.completed_at));
  const stats = resolvedToday.reduce<TodayExecutionStats>((acc, row) => {
    const item = executionStatsFromApproval(row);
    acc.actionsExecuted += item.actionsExecuted;
    acc.blockedByPolicy += item.blockedByPolicy;
    acc.emailsSent += item.emailsSent;
    acc.hubspotUpdates += item.hubspotUpdates;
    acc.trelloUpdates += item.trelloUpdates;
    acc.slackMessages += item.slackMessages;
    acc.failedExecutions += item.failedExecutions;
    return acc;
  }, {
    actionsExecuted: 0,
    blockedByPolicy: 0,
    emailsSent: 0,
    hubspotUpdates: 0,
    trelloUpdates: 0,
    slackMessages: 0,
    failedExecutions: 0,
  });

  const autoHandled = input.logs.filter((row) => {
    if (!inLast24h(row.created_at)) return false;
    const eventType = stringValue(row.event_type) ?? "";
    return eventType.includes("connector_health") || eventType.includes("daily_brief") || eventType.includes("allow_auto");
  }).length;

  return {
    runsCount: todayRuns.length,
    approvalsCreated: todayApprovals.length,
    approvalsApproved: resolvedToday.filter((row) => ["approved", "partially_completed"].includes(stringValue(row.status) ?? "")).length,
    actionsExecuted: stats.actionsExecuted,
    autoHandled,
    blockedByPolicy: stats.blockedByPolicy,
    emailsSent: stats.emailsSent,
    hubspotUpdates: stats.hubspotUpdates,
    trelloUpdates: stats.trelloUpdates,
    slackMessages: stats.slackMessages,
    failedExecutions: stats.failedExecutions,
  };
}

function operatorSignalsToday(operatorKey: string, runs: Row[]): number {
  return runs.filter((row) => stringValue(row.operator_key) === operatorKey && inLast24h(row.created_at)).reduce((sum, row) => {
    const output = asRecord(row.output);
    return sum + numberValue(output.opportunitiesFound) + numberValue(output.signalsFound);
  }, 0);
}

function operatorActionsToday(operatorKey: string, approvals: Row[]): number {
  return approvals.filter((row) => {
    const payload = asRecord(row.continuation_payload);
    return (stringValue(payload.operatorKey) ?? stringValue(row.agent_id)) === operatorKey && inLast24h(row.resolved_at);
  }).reduce((sum, row) => sum + executionStatsFromApproval(row).actionsExecuted, 0);
}

function latestRunAt(operatorKey: string, runs: Row[]): string | null {
  const found = runs
    .filter((row) => stringValue(row.operator_key) === operatorKey)
    .sort((a, b) => new Date(timeValue(b) ?? 0).getTime() - new Date(timeValue(a) ?? 0).getTime())[0];
  return found ? timeValue(found) : null;
}

function buildOperators(input: { approvals: Row[]; runs: Row[]; truth: SafeConnectorTruth[]; trelloReady: boolean; slackReady: boolean; operatorKeys?: DashboardOperator["key"][] }): DashboardOperator[] {
  const connected = (key: string) => connectorIsConnected(input.truth.find((item) => item.connectorKey === key));
  const specs = [
    { key: "revenue" as const, needs: connected("gmail"), monitoring: connected("gmail"), description: "Monitors Gmail for revenue opportunities and prepares follow-up email with CRM context." },
    { key: "client_flow" as const, needs: connected("gmail") && input.trelloReady, monitoring: connected("gmail"), description: "Monitors client messages, drafts replies, and prepares approved Trello tasks." },
    { key: "operations" as const, needs: input.trelloReady, monitoring: input.trelloReady, description: "Watches Trello boards for stalled work and prepares Slack or Trello updates." },
  ];

  return specs.filter((spec) => !input.operatorKeys || input.operatorKeys.includes(spec.key)).map((spec) => {
    const def = getOperatorDefinition(spec.key);
    const pending = input.approvals.filter((row) => stringValue(row.status) === "pending" && (stringValue(row.agent_id) === spec.key || stringValue(asRecord(row.continuation_payload).operatorKey) === spec.key)).length;
    const lastRunAtValue = latestRunAt(spec.key, input.runs);
    return {
      key: spec.key,
      name: def?.name ?? operatorDisplayName(spec.key),
      status: spec.needs ? (spec.monitoring && lastRunAtValue ? "monitoring" : "ready") : "needs_setup",
      lastRunAt: lastRunAtValue,
      nextRunAt: null,
      pendingApprovals: pending,
      signalsToday: operatorSignalsToday(spec.key, input.runs),
      actionsToday: operatorActionsToday(spec.key, input.approvals),
      description: spec.description,
      href: `/agents/${spec.key === "client_flow" ? "client-flow" : spec.key}`,
    };
  });
}

function buildConnectors(input: { truth: SafeConnectorTruth[] }): DashboardConnector[] {
  const purpose: Record<DashboardConnector["key"], string> = {
    gmail: "Email follow-ups",
    hubspot: "CRM execution",
    slack: "Team alerts",
    trello: "Project tasks",
  };
  return (["gmail", "hubspot", "slack", "trello"] as const).map((key) => {
    const def = getConnectorDefinition(key);
    const truth = input.truth.find((item) => item.connectorKey === key);
    const connected = connectorIsConnected(truth);
    const status = truth?.status === "error" || truth?.status === "reconnect_required" ? "error" : connected ? "connected" : def?.status === "available" ? "needs_setup" : "coming_soon";
    return {
      key,
      name: def?.displayName ?? key,
      status,
      connected,
      lastCheckedAt: truth?.connectedAt ?? null,
      purpose: purpose[key],
      usedBy: (def?.usedByOperators ?? []).slice(0, 4).map(operatorDisplayName),
      href: "/connectors",
    };
  });
}

export function deriveSystemStatus(input: {
  policyEmergencyStop: boolean;
  pendingApprovals: number;
  today: DashboardOverview["today"];
  connectors: DashboardConnector[];
  operators: DashboardOperator[];
}) {
  if (input.policyEmergencyStop) {
    return {
      status: "emergency_stop" as const,
      label: "Emergency stop active",
      description: "Risky execution is blocked. Operators can still prepare work for review.",
    };
  }
  const gmail = input.connectors.find((connector) => connector.key === "gmail");
  const hubspot = input.connectors.find((connector) => connector.key === "hubspot");
  const slack = input.connectors.find((connector) => connector.key === "slack");
  const trello = input.connectors.find((connector) => connector.key === "trello");
  const coreConnected = Boolean(gmail?.connected && ((hubspot?.connected) || (slack?.connected && trello?.connected)));
  const atLeastOneOperatorReady = input.operators.some((operator) => operator.status === "ready" || operator.status === "monitoring");
  const connectorErrors = input.connectors.some((connector) => connector.status === "error");
  if (!coreConnected || !atLeastOneOperatorReady) {
    return {
      status: "setup_incomplete" as const,
      label: "Setup incomplete",
      description: "Connect the core tools needed before the operating layer can be marked healthy.",
    };
  }
  if (input.today.failedExecutions > 0 || input.today.blockedByPolicy > 0 || input.pendingApprovals > 0 || connectorErrors) {
    return {
      status: "needs_attention" as const,
      label: "Needs attention",
      description: "There is work waiting, a policy block, a connector issue, or a failed execution to review.",
    };
  }
  return {
    status: "healthy" as const,
    label: "Healthy",
    description: "Connected operators are monitoring workstreams under approval-first policy.",
  };
}

export function deriveNextBestActions(input: {
  pendingApprovals: number;
  connectors: DashboardConnector[];
  policyEmergencyStop: boolean;
  slackChannelSelected: boolean;
  trelloDestinationSet: boolean;
  runsCount: number;
}): DashboardNextAction[] {
  const actions: DashboardNextAction[] = [];
  const missing = input.connectors.filter((connector) => connector.status === "needs_setup").map((connector) => connector.name);
  if (input.pendingApprovals > 0) actions.push({ id: "review-approvals", title: "Review pending approvals", description: `${input.pendingApprovals} approval${input.pendingApprovals === 1 ? "" : "s"} waiting for a decision.`, href: "/approvals", priority: "high" });
  if (input.policyEmergencyStop) actions.push({ id: "emergency-stop", title: "Review emergency stop", description: "Risky execution is currently blocked by policy.", href: "/policies", priority: "high" });
  const slack = input.connectors.find((connector) => connector.key === "slack");
  if (slack?.connected && !input.slackChannelSelected) actions.push({ id: "slack-channel", title: "Select Slack alert channel", description: "Choose where internal approval and operator alerts should appear.", href: "/connectors", priority: "medium" });
  const trello = input.connectors.find((connector) => connector.key === "trello");
  if (trello?.connected && !input.trelloDestinationSet) actions.push({ id: "trello-default", title: "Choose Trello default board", description: "Set the board and list for approved task updates.", href: "/connectors", priority: "medium" });
  if (missing.length > 0) actions.push({ id: "connect-tools", title: `Connect ${missing.slice(0, 2).join(" and ")}`, description: "Connect real accounts before operators can run end to end.", href: "/connectors", priority: "medium" });
  if (input.runsCount === 0) actions.push({ id: "first-check", title: "Run first operator check", description: "Start with Revenue, Client Flow, or Operations from the operator cards.", href: "/agents", priority: "low" });
  if (actions.length === 0) actions.push({ id: "open-operators", title: "Open operators", description: "Review monitoring settings or run a manual check when you are ready.", href: "/agents", priority: "low" });
  return actions.slice(0, 5);
}

export async function getDashboardOverview(input: {
  workspaceId: string;
  supabase?: SupabaseAdmin;
}): Promise<DashboardOverview> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspace = await supabase
    .from("os_workspaces")
    .select("id,name,plan_tier,billing_status,onboarding_data")
    .eq("id", input.workspaceId)
    .single();
  if (workspace.error || !workspace.data) throw new Error(workspace.error?.message || "Workspace not found.");

  const [truth, policy, workspaceSettings, approvalsRes, runsRes, logsRes] = await Promise.all([
    getConnectorTruth({ workspaceId: input.workspaceId, supabase }),
    loadPolicyWorkspaceSettings({ supabase, workspaceId: input.workspaceId }),
    loadWorkspacePolicySettings({ supabase, workspaceId: input.workspaceId }),
    supabase.from("os_approvals").select("id,workspace_id,type,title,status,created_at,resolved_at,agent_id,run_id,continuation_payload,policy_reason").eq("workspace_id", input.workspaceId).order("created_at", { ascending: false }).limit(150),
    supabase.from("os_operator_runs").select("id,workspace_id,operator_key,status,trigger_type,created_at,completed_at,output,approval_id").eq("workspace_id", input.workspaceId).order("created_at", { ascending: false }).limit(200),
    supabase.from("os_operator_run_logs").select("*").eq("workspace_id", input.workspaceId).order("created_at", { ascending: false }).limit(200),
  ]);

  const approvals = approvalsRes.error ? [] : (approvalsRes.data ?? []).map((row) => row as Row);
  const runs = runsRes.error ? [] : (runsRes.data ?? []).map((row) => row as Row);
  const logs = logsRes.error ? [] : (logsRes.data ?? []).map((row) => row as Row);
  const connectors = buildConnectors({ truth });
  const trelloDestinationSet = Boolean(workspaceSettings.trello.defaultBoardId && workspaceSettings.trello.defaultListId);
  const slackChannelSelected = Boolean(workspaceSettings.slack.slackDefaultChannelId);
  const trelloReady = Boolean(connectors.find((connector) => connector.key === "trello")?.connected && trelloDestinationSet);
  const slackReady = Boolean(connectors.find((connector) => connector.key === "slack")?.connected && slackChannelSelected);
  const onboardingData = asRecord(workspace.data.onboarding_data);
  const selectedPriority = stringValue(onboardingData.first_priority);
  const selectedKeys: DashboardOperator["key"][] | undefined = selectedPriority === "revenue" || selectedPriority === "client_flow" || selectedPriority === "operations"
    ? [selectedPriority]
    : undefined;
  const operators = buildOperators({ approvals, runs, truth, trelloReady, slackReady, operatorKeys: selectedKeys });
  const today = summarizeToday({ approvals, runs, logs });
  const pendingApprovals = approvals.filter((row) => stringValue(row.status) === "pending");
  const highRiskCount = pendingApprovals.filter((row) => riskFromPayload(asRecord(row.continuation_payload)) === "high").length;
  const blockedCount = approvals.reduce((sum, row) => sum + executionStatsFromApproval(row).blockedByPolicy, 0);
  const draftOnlyCount = approvals.reduce((sum, row) => sum + executionStatsFromApproval(row).draftOnly, 0);
  const systemStatus = deriveSystemStatus({
    policyEmergencyStop: policy.emergencyStopEnabled,
    pendingApprovals: pendingApprovals.length,
    today,
    connectors,
    operators,
  });
  const approvalActivities = approvals.slice(0, 20).map(mapApprovalToActivity);
  const logActivities = logs.slice(0, 30).map(mapRunLogToActivity);
  const runActivities = runs.slice(0, 20).map((row): DashboardActivity => ({
    id: `run-${String(row.id)}`,
    time: timeValue(row),
    type: `run.${stringValue(row.status) ?? "updated"}`,
    title: `${operatorDisplayName(stringValue(row.operator_key))} check ${stringValue(row.status) ?? "updated"}`,
    description: stringValue(row.trigger_type)?.replace(/_/g, " ") ?? "Operator run recorded.",
    operatorKey: stringValue(row.operator_key),
    connectorKey: null,
    severity: stringValue(row.status) === "failed" ? "danger" : stringValue(row.status) === "completed" ? "success" : "info",
    href: "/logs",
  }));
  const activity = [...approvalActivities, ...logActivities, ...runActivities]
    .sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime())
    .slice(0, 12);

  return {
    workspace: {
      id: String(workspace.data.id),
      name: stringValue(workspace.data.name) ?? "Workspace",
      planTier: stringValue(workspace.data.plan_tier),
      billingStatus: stringValue(workspace.data.billing_status),
    },
    systemStatus,
    policy: {
      autonomyMode: policy.autonomyMode,
      emergencyStopEnabled: policy.emergencyStopEnabled,
      customerEmailMode: policy.customerEmailMode,
      safeSummary: "Approval-first where risk matters. Health checks and daily brief can run automatically.",
      assistedSummary: policy.autonomyMode === "assisted"
        ? "Low-risk high-confidence Trello comments may auto-run; email, CRM, Slack sends and task create/move still require approval."
        : "Assisted autopilot is off. Low-risk project comments still route through review.",
    },
    approvals: {
      pendingCount: pendingApprovals.length,
      highRiskCount,
      blockedCount,
      draftOnlyCount,
      latest: pendingApprovals.slice(0, 5).map((row) => {
        const payload = asRecord(row.continuation_payload);
        return {
          id: String(row.id),
          title: stringValue(row.title) ?? "Approval required",
          createdAt: stringValue(row.created_at),
          operatorKey: stringValue(payload.operatorKey) ?? stringValue(row.agent_id),
          riskLevel: riskFromPayload(payload),
          policyDecision: policyDecisionFromPayload(payload) ?? "approval_required",
          href: "/approvals",
        };
      }),
    },
    today,
    operators,
    connectors,
    activity,
    nextBestActions: deriveNextBestActions({
      pendingApprovals: pendingApprovals.length,
      connectors,
      policyEmergencyStop: policy.emergencyStopEnabled,
      slackChannelSelected,
      trelloDestinationSet,
      runsCount: runs.length,
    }),
    lastUpdatedAt: new Date().toISOString(),
  };
}
