// Isolated UI fixtures. No authentication, provider calls or persisted workspace data.
import React from "react";
import { createRoot } from "react-dom/client";
import { buildSeedState } from "../../src/lib/os/seed";
import { AppShell } from "../../src/app/app/app-shell";
import { OSOverview } from "../../src/components/dashboard/overview";
import Agents from "../../src/app/app/agents/page";
import Connectors from "../../src/app/app/connectors/page";
import Revenue from "../../src/app/app/agents/revenue/page";
import ClientFlow from "../../src/app/app/agents/client-flow/page";
import Operations from "../../src/app/app/agents/operations/page";
import Approvals from "../../src/app/app/approvals/page";
import Policies from "../../src/app/app/policies/page";
import Settings from "../../src/app/app/settings/page";
import Plans from "../../src/app/app/plans/page";
import Memory from "../../src/app/app/memory/page";
import Activity from "../../src/app/app/activity/page";
import Logs from "../../src/app/app/logs/page";
import Insights from "../../src/app/app/insights/page";
import Workflows from "../../src/app/app/workflows/page";
import { WORKSPACE_REALTIME_STATUS_EVENT } from "../../src/lib/os/workspace-realtime";

const params = new URLSearchParams(location.search);
const lifecycle = params.get("state") || "E";
let approvalScopeRefreshed = false;
window.fixtureApprovalSavedDraft = null;
window.fixtureApprovalCompleted = false;
const state = buildSeedState();
state.workspace = { ...state.workspace, id: "fixture-workspace", name: "Sample workspace", plan: "growth", planTier: "growth", billingStatus: "active", onboardingSystems: ["salesforce", "microsoft"] };
state.currentUser = { ...state.currentUser, name: "Alex Sample", email: "alex@example.test" };
state.agents = [];
state.approvals = [];
state.connectors = state.connectors.map((connector) => ({ ...connector,
  isConnected: lifecycle !== "A" && (lifecycle === "B" ? ["hubspot"] : ["gmail", "hubspot", "trello"]).includes(connector.id),
  source: "native", status: "connected", health: "healthy", records: "Connected",
}));
window.fixtureContext = new Proxy({ state, bootstrapStatus: "ready", pendingApprovals: 0 }, {
  get(target, key) { return key in target ? target[key] : () => { throw new Error("Mutations are disabled in visual fixtures"); }; },
});
const keys = ["revenue", "client_flow", "operations"];
const names = ["Revenue Operator", "Client Flow Operator", "Operations Operator"];
const productStates = keys.map((key, index) => ({
  operatorKey: key, operatorName: names[index],
  state: ({ A: "needs_setup", B: "needs_setup", C: "ready_to_activate", D: "plan_required", E: index === 1 ? "paused" : "active", F: "needs_attention" })[lifecycle],
  label: ({ A: "Needs setup", B: "Needs setup", C: "Ready to activate", D: "Plan required", E: index === 1 ? "Paused" : "Active", F: "Needs attention" })[lifecycle],
  description: ({ A: "Connect your business systems to get started.", B: "Connect an email account to start monitoring.", C: "Your connected systems are ready. Turn on scheduled monitoring.", D: "Choose a plan to start scheduled monitoring.", E: index === 1 ? "Scheduled checks are paused. Your setup is saved." : "Scheduled monitoring is on. Actions wait for your approval.", F: "Reconnect Gmail to resume email monitoring." })[lifecycle],
  connectedSystems: lifecycle === "A" ? [] : lifecycle === "B" ? ["HubSpot"] : ["Gmail", "HubSpot"],
  availableNow: lifecycle === "A" ? [] : ["Prepare customer replies", "Review pipeline context"],
  nextAction: { label: lifecycle === "C" ? "Activate operator" : lifecycle === "D" ? "Choose a plan" : lifecycle === "F" ? "Reconnect system" : lifecycle === "B" ? "Connect required system" : "Open operator", href: lifecycle === "F" || lifecycle === "B" ? "/connectors" : "/agents/" + key.replace("_", "-") },
  degraded: lifecycle === "F" ? { unhealthyConnectors: ["Gmail"], lostCapabilities: ["Email monitoring"], stillAvailableCapabilities: ["CRM context"] } : null,
  connectedCoreSystems: lifecycle === "A" ? [] : ["Gmail"],
  missingOptionalCapabilities: [],
  requiredActions: [],
}));
const eligibility = { eligible: lifecycle !== "D", status: lifecycle === "D" ? "plan_required" : "eligible", reason: "Ready" };
const readiness = keys.map((operatorKey) => ({ operatorKey, status: "ready", readinessPercent: 100, canRunManual: true, canExecuteRealActions: true, availableActions: ["gmail.createDraft"], connectedRequiredConnectors: ["gmail"], missingRequiredConnectors: [], blockedActions: [], approvalRequiredActions: [], reason: "Connected systems are ready.", nextSetupStep: "Activate when ready.", executionEligibility: eligibility }));
const policy = { autonomyMode: "safe", emergencyStopEnabled: false, customerEmailMode: "approval_required", dailyBriefAllowed: true, connectorHealthChecksAllowed: true, internalSlackNotificationsAllowed: true, crmWritesRequireApproval: true, projectToolWritesRequireApproval: true, customerFacingActionsRequireApproval: true };
const fixtureActivity = lifecycle === "E" ? [
  { id: "activity-run", time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), type: "run.completed", title: "Revenue check completed", description: "Scheduled check completed.", operatorKey: "revenue", connectorKey: null, severity: "success", href: "/logs" },
  { id: "activity-approval", time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), type: "approval.pending", title: "Approval created", description: "A prepared follow-up is waiting for review.", operatorKey: "revenue", connectorKey: "gmail", severity: "warning", href: "/approvals" },
  { id: "activity-signal", time: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), type: "operator.signal", title: "Client request detected", description: "A client message was identified.", operatorKey: "client_flow", connectorKey: "gmail", severity: "info", href: "/logs" },
] : [];
const connectorPurpose = { gmail: "Email follow-ups", hubspot: "CRM execution", slack: "Team alerts", trello: "Project tasks" };

// Drives the Workforce activity chart's required data states via
// ?activity=<scenario> - each is still a real, honest daily bucket shape
// (see WorkforceActivitySummary), just synthesized for isolated visual
// verification instead of read from Supabase.
function buildActivitySummary(scenario) {
  const dayCount = scenario === "dense" ? 30 : 7;
  const values = Array.from({ length: dayCount }, (_, index) => {
    if (scenario === "zero") return { prepared: 0, executed: 0, held: 0 };
    if (scenario === "sparse") return index === dayCount - 2 ? { prepared: 1, executed: 0, held: 0 } : { prepared: 0, executed: 0, held: 0 };
    if (scenario === "equal") return { prepared: 2, executed: 2, held: index === dayCount - 1 ? 1 : 0 };
    if (scenario === "held-spike") return index === dayCount - 3 ? { prepared: 5, executed: 1, held: 4 } : { prepared: Math.max(0, (index % 3) - 1), executed: Math.max(0, (index % 2)), held: 0 };
    if (scenario === "dense") return { prepared: (index % 5), executed: Math.max(0, (index % 4) - 1), held: index % 7 === 0 ? 1 : 0 };
    // "normal": the same small, realistic 0-3 range as real early-workspace activity.
    return [{ prepared: 1, executed: 0, held: 1 }, { prepared: 0, executed: 0, held: 0 }, { prepared: 2, executed: 1, held: 0 }, { prepared: 1, executed: 1, held: 0 }, { prepared: 0, executed: 0, held: 0 }, { prepared: 3, executed: 2, held: 1 }, { prepared: 1, executed: 1, held: 0 }][index % 7];
  });
  const daily = values.map((value, index) => ({ day: new Date(Date.now() - (dayCount - 1 - index) * 86400000).toISOString().slice(0, 10), count: value.prepared + value.executed + value.held, ...value }));
  const totals = daily.reduce((sum, day) => ({ prepared: sum.prepared + day.prepared, executed: sum.executed + day.executed, held: sum.held + day.held }), { prepared: 0, executed: 0, held: 0 });
  return { runs: fixtureActivity.filter((item) => item.type === "run.completed").length, approvals: fixtureActivity.filter((item) => item.type === "approval.pending").length, actions: totals.executed, issues: 0, total: totals.prepared + totals.executed + totals.held, ...totals, daily };
}
const fixturePendingApproval = {
  id: "fixture-approval", title: "Send a follow-up email", description: "A pricing question came in while the deal is active. Review the prepared reply before it goes out.",
  status: "pending", created_at: new Date().toISOString(), resolved_at: null, approval_type: "email", category: "Email",
  continuation_kind: null, run_id: "fixture-run", linked_run_id: "fixture-run", agent_id: "revenue", agent_mark: "Revenue Operator", policy_reason: "Customer emails require approval.",
  payload_preview: {
    operatorKey: "revenue", to: "customer@example.test", subject: "Re: Team pricing", body: "Thank you for asking about pricing for your team. I have included the details we discussed and can help with the next steps.",
    draftBody: "Thank you for asking about pricing for your team. I have included the details we discussed and can help with the next steps.", draftSubject: "Re: Team pricing",
    detectedSignal: "Pricing question", matchedKeywords: ["pricing", "team size"], whyThisMatters: "The customer is evaluating a team plan, so a timely reply can keep the active conversation moving.", riskLevel: "medium",
    preparedActions: ["send_gmail_follow_up", "update_hubspot_deal"], crmPreparationStatus: "hubspot_execution_enabled",
    livePolicyDecision: { decision: "require_approval", reason: "Customer-facing email requires human approval.", riskLevel: "medium", matchedRuleId: "customer_email_requires_approval", userFacingLabel: "Approval required", requiresHumanReview: true },
    preparedHubSpotActions: { deal: { dealname: "Northstar team plan", stageLabel: "Evaluation", pipelineLabel: "New business" }, executionStatus: "execution_enabled" },
    approvalScope: { contextFingerprint: "fixture-context-fingerprint" },
    policyEvidence: { policyVersion: 3, connector: "gmail", action: "send_gmail_follow_up", subjectType: "email", subjectId: "thread-fixture", matchedRuleIds: ["customer_email_requires_approval"], requiredApproverRoles: ["workspace_admin"], contextSummary: { signal: "pricing inquiry", deal_open: true }, contextFingerprint: "fixture-context-fingerprint" },
    policyEvidenceByAction: { email: { connector: "gmail", action: "send_gmail_follow_up", subjectType: "email", subjectId: "thread-fixture" }, hubspot: { connector: "hubspot", action: "update_hubspot_deal", subjectType: "deal", subjectId: "deal-fixture", contextSummary: { dealStage: "Evaluation" }, contextFingerprint: "fixture-crm-fingerprint" } },
    customerEmailPolicy: { mode: "approval_required", humanReview: "Required", crmUpdate: "After email approval" },
    whatHappensAfterApproval: "Auterim sends the approved email through Gmail, then applies the prepared HubSpot deal update.",
    crmPreparation: { summary: "A deal update is prepared from the current customer conversation.", suggestedNextStep: "Share the team pricing details" },
  },
};
const fixtureApprovalQueue = Array.from({ length: 8 }, (_, index) => ({
  ...fixturePendingApproval,
  id: index === 0 ? fixturePendingApproval.id : `fixture-approval-${index + 1}`,
  title: `Follow-up review ${index + 1}`,
  created_at: new Date(Date.now() - index * 18 * 60 * 1000).toISOString(),
  payload_preview: {
    ...fixturePendingApproval.payload_preview,
    to: `customer${index + 1}@example.test`,
    subject: `Re: Team pricing ${index + 1}`,
    draftSubject: `Re: Team pricing ${index + 1}`,
    detectedSignal: ["Pricing question", "Onboarding follow-up", "Renewal timing", "Contract clarification"][index % 4],
  },
}));
const overview = {
  workspace: state.workspace, executionEligibility: eligibility, lifecycleState: lifecycle,
  operatorProductStates: productStates, systemStatus: { status: "healthy", label: "Ready", description: "Your workspace is ready." },
  policy, approvals: { pendingCount: 0, highRiskCount: 0, blockedCount: 0, draftOnlyCount: 0, latest: [] },
  today: Object.fromEntries(["runsCount", "approvalsCreated", "approvalsApproved", "actionsExecuted", "autoHandled", "blockedByPolicy", "emailsSent", "hubspotUpdates", "trelloUpdates", "slackMessages", "failedExecutions"].map((key) => [key, 0])),
  operators: keys.map((key, index) => ({ key, name: names[index], status: "monitoring", lastRunAt: null, nextRunAt: null, pendingApprovals: 0, signalsToday: 0, actionsToday: 0, href: "/agents/" + key.replace("_", "-") })),
  connectors: state.connectors.filter((c) => Object.hasOwn(connectorPurpose, c.id)).map((c) => ({ key: c.id, name: c.name, connected: c.isConnected, status: c.isConnected ? "connected" : "needs_setup", purpose: connectorPurpose[c.id], href: "/connectors", usedBy: c.id === "hubspot" ? ["Revenue"] : c.id === "trello" ? ["Client Flow", "Operations"] : ["Revenue", "Client Flow"], lastCheckedAt: null })),
  activity: fixtureActivity,
  activitySummary: buildActivitySummary(params.get("activity") || "normal"),
  nextBestActions: [], workInProgress: [], lastUpdatedAt: new Date().toISOString(),
};
window.fetch = async (input, options) => {
  const url = new URL(input, location.origin);
  if (options?.method && options.method !== "GET") {
    if (options.method === "PATCH" && url.pathname.endsWith("/fixture-approval")) {
      window.fixtureApprovalSavedDraft = JSON.parse(options.body || "{}");
      approvalScopeRefreshed = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (params.get("approvalAction") === "slow" && url.pathname.endsWith("/approve")) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return new Response(JSON.stringify({ status: "approved" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (params.get("approvalError") === "scope_changed" && !approvalScopeRefreshed && url.pathname.endsWith("/approve")) {
      return new Response(JSON.stringify({ error: "approval_scope_changed", message: "The approved action or its business context changed after approval. Review the updated action before execution." }), { status: 409, headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("/approve")) {
      window.fixtureApprovalCompleted = true;
      return new Response(JSON.stringify({ status: "approved" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error("Fixture blocks every mutation");
  }
  let data = {};
  if (url.pathname === "/api/dashboard/overview") data = overview;
  else if (url.pathname === "/api/dashboard/activity") {
    const requestedRange = url.searchParams.get("range") === "24h" || url.searchParams.get("range") === "30d" ? url.searchParams.get("range") : "7d";
    const bucketCount = requestedRange === "24h" ? 24 : requestedRange === "30d" ? 30 : 7;
    const granularity = requestedRange === "24h" ? "hour" : "day";
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({ start: new Date(Date.now() - (bucketCount - index) * (granularity === "hour" ? 3600000 : 86400000)).toISOString(), end: new Date(Date.now() - (bucketCount - index - 1) * (granularity === "hour" ? 3600000 : 86400000)).toISOString(), count: 0, prepared: 0, executed: 0, held: 0 }));
    const last = buckets[buckets.length - 1];
    last.prepared = overview.activitySummary.prepared;
    last.executed = overview.activitySummary.executed;
    last.held = overview.activitySummary.held;
    data = { ...overview.activitySummary, range: requestedRange, windowStart: buckets[0].start, windowEnd: buckets.at(-1).end, granularity, buckets, partialHistory: false };
  }
  else if (url.pathname === "/api/operators/product-state") data = { states: productStates, state: productStates.find((s) => s.operatorKey === url.searchParams.get("operatorKey")) };
  else if (url.pathname === "/api/operators/readiness") data = { readiness: readiness };
  else if (url.pathname.endsWith("/activate")) data = { state: { activated: lifecycle === "E", activatedAt: null, updatedAt: null } };
  else if (url.pathname.endsWith("/status") && url.pathname.includes("/operators/")) data = { readiness: readiness.find((r) => url.pathname.includes(r.operatorKey.replace("_", "-"))), monitoring: { status: "monitoring_active", message: "Scheduled checks are on.", recentPendingApprovals: [], nextScanLabel: "Daily check" }, revenueMode: "full_crm_mode", setup: { state: "ready", readinessPercent: 100, canRunManual: true, trelloConnected: true, trelloDestinationSet: true, trelloTaskExecutionReady: true, customerEmailPolicySet: true, approvalFlowActive: true }, gmail: { connected: true, executable: true, permissions: { readonly: true }, accountEmail: "alex@example.test" }, hubspot: { connected: true } };
  else if (url.pathname === "/api/policies") data = { policy };
  else if (url.pathname === "/api/approvals") {
    const mode = params.get("approval");
    data = { approvals: mode === "queue" ? fixtureApprovalQueue : mode === "pending" ? [fixturePendingApproval] : [] };
  }
  else if (url.pathname === "/api/workflows") data = { workflows: fixtureWorkflows };
  else if (url.pathname === "/api/operators/runs") data = { runs: [] };
  else if (url.pathname === "/api/connectors/accounts") data = { accounts: [] };
  else if (url.pathname === "/api/activity") data = { items: fixtureActivity.map((item) => ({ id: item.id, occurredAt: item.time, category: item.type === "run.completed" ? "operator_run" : item.type === "approval.pending" ? "approval" : "workflow", title: item.title, description: item.description, operatorKey: item.operatorKey, connectorKey: item.connectorKey, severity: item.severity === "warning" ? "attention" : item.severity === "success" ? "success" : "info", status: "recorded", relatedRoute: item.href, technicalEventId: null })), summary: { runs: 1, approvals: 1, actions: 0, issues: 0, total: fixtureActivity.length, daily: [] }, hasMore: false, partialHistory: false };
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
};
const fixtureWorkflows = [
  {
    id: "wf-1", objective: "Prepare the pricing reply for the Northwind renewal",
    operatorKey: "revenue", operatorName: "Revenue Operator", primaryOwner: "Revenue Operator",
    supportingOperators: ["Client Flow Operator"], externalCommunicationOwner: "Revenue Operator",
    dependencyState: "Waiting on approval", workforceState: "Awaiting approval",
    handoffReason: null, requestedOutcome: "A reviewed reply that keeps the renewal moving",
    returnedEvidence: {}, supportingWork: [], status: "awaiting_approval", priority: "normal",
    confidence: "medium", createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    source: { label: "Gmail", detail: "Pricing question on an open deal" },
    whyStarted: ["A pricing question arrived on an open renewal", "The deal had no reply for two days"],
    nextAttention: "A prepared reply is waiting for your approval",
    steps: [
      { id: "s1", order: 1, label: "Assemble context", destination: "Gmail, HubSpot", status: "completed", approvalRequired: false, approvalId: null, blocker: null },
      { id: "s2", order: 2, label: "Prepare customer reply", destination: "Gmail", status: "awaiting_approval", approvalRequired: true, approvalId: "ap-1", blocker: null },
      { id: "s3", order: 3, label: "Update CRM record", destination: "HubSpot", status: "pending", approvalRequired: true, approvalId: null, blocker: null },
    ],
    outcomes: [],
  },
  {
    id: "wf-2", objective: "Follow up on the untouched Contoso deal",
    operatorKey: "revenue", operatorName: "Revenue Operator", primaryOwner: "Revenue Operator",
    supportingOperators: [], externalCommunicationOwner: null, dependencyState: null,
    workforceState: "Preparing", handoffReason: null, requestedOutcome: null, returnedEvidence: {},
    supportingWork: [], status: "executing", priority: "high", confidence: "high",
    createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
    source: { label: "HubSpot", detail: "Deal untouched for eleven days" },
    whyStarted: ["The deal had no activity for eleven days"], nextAttention: "Auterim is preparing the next step",
    steps: [{ id: "s4", order: 1, label: "Assemble context", destination: "HubSpot", status: "executing", approvalRequired: false, approvalId: null, blocker: null }],
    outcomes: [],
  },
];
const pages = { dashboard: OSOverview, connectors: Connectors, agents: Agents, revenue: Revenue, "client-flow": ClientFlow, operations: Operations, approvals: Approvals, policies: Policies, settings: Settings, plans: Plans, memory: Memory, activity: Activity, logs: Logs, insights: Insights, workflows: Workflows };
const Page = pages[params.get("surface")] || OSOverview;
createRoot(document.getElementById("fixture")).render(<div className="os-root"><AppShell><Page /></AppShell></div>);

// Drives the Workforce activity chart's freshness chip via ?realtime=<state>
// so the Live/Reconnecting/stale copy can be verified without a real
// Supabase realtime subscription - dispatched as the exact same
// WORKSPACE_REALTIME_STATUS_EVENT the real subscriber fires.
const realtimeParam = params.get("realtime");
if (realtimeParam) {
  // Dispatched after a macrotask so the real useWorkspaceRealtimeStatus
  // effect (which attaches its listener post-mount) is guaranteed to
  // already be subscribed - a synchronous dispatch would race it.
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(WORKSPACE_REALTIME_STATUS_EVENT, {
      detail: { workspaceId: state.workspace.id, status: realtimeParam, updatedAt: new Date().toISOString() },
    }));
  }, 50);
}
