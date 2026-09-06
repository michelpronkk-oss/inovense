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

const params = new URLSearchParams(location.search);
const lifecycle = params.get("state") || "E";
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
const overview = {
  workspace: state.workspace, executionEligibility: eligibility, lifecycleState: lifecycle,
  operatorProductStates: productStates, systemStatus: { status: "healthy", label: "Ready", description: "Your workspace is ready." },
  policy, approvals: { pendingCount: 0, highRiskCount: 0, blockedCount: 0, draftOnlyCount: 0, latest: [] },
  today: Object.fromEntries(["runsCount", "approvalsCreated", "approvalsApproved", "actionsExecuted", "autoHandled", "blockedByPolicy", "emailsSent", "hubspotUpdates", "trelloUpdates", "slackMessages", "failedExecutions"].map((key) => [key, 0])),
  operators: keys.map((key, index) => ({ key, name: names[index], status: "monitoring", lastRunAt: null, nextRunAt: null, pendingApprovals: 0, signalsToday: 0, actionsToday: 0, href: "/agents/" + key.replace("_", "-") })),
  connectors: state.connectors.filter((c) => Object.hasOwn(connectorPurpose, c.id)).map((c) => ({ key: c.id, name: c.name, connected: c.isConnected, status: c.isConnected ? "connected" : "needs_setup", purpose: connectorPurpose[c.id], href: "/connectors", usedBy: c.id === "hubspot" ? ["Revenue"] : c.id === "trello" ? ["Client Flow", "Operations"] : ["Revenue", "Client Flow"], lastCheckedAt: null })),
  activity: fixtureActivity, nextBestActions: [], lastUpdatedAt: new Date().toISOString(),
};
window.fetch = async (input, options) => {
  if (options?.method && options.method !== "GET") throw new Error("Fixture blocks every mutation");
  const url = new URL(input, location.origin);
  let data = {};
  if (url.pathname === "/api/dashboard/overview") data = overview;
  else if (url.pathname === "/api/operators/product-state") data = { states: productStates, state: productStates.find((s) => s.operatorKey === url.searchParams.get("operatorKey")) };
  else if (url.pathname === "/api/operators/readiness") data = { readiness: readiness };
  else if (url.pathname.endsWith("/activate")) data = { state: { activated: lifecycle === "E", activatedAt: null, updatedAt: null } };
  else if (url.pathname.endsWith("/status") && url.pathname.includes("/operators/")) data = { readiness: readiness.find((r) => url.pathname.includes(r.operatorKey.replace("_", "-"))), monitoring: { status: "monitoring_active", message: "Scheduled checks are on.", recentPendingApprovals: [], nextScanLabel: "Daily check" }, revenueMode: "full_crm_mode", setup: { state: "ready", readinessPercent: 100, canRunManual: true, trelloConnected: true, trelloDestinationSet: true, trelloTaskExecutionReady: true, customerEmailPolicySet: true, approvalFlowActive: true }, gmail: { connected: true, executable: true, permissions: { readonly: true }, accountEmail: "alex@example.test" }, hubspot: { connected: true } };
  else if (url.pathname === "/api/policies") data = { policy };
  else if (url.pathname === "/api/approvals") data = { approvals: params.get("approval") === "pending" ? [{
    id: "fixture-approval", title: "Follow up on a customer request", description: "The customer asked for an update. Review the prepared reply.",
    status: "pending", created_at: new Date().toISOString(), resolved_at: null, approval_type: "email", category: "Email",
    continuation_kind: null, run_id: null, linked_run_id: null, agent_id: "revenue", agent_mark: "Revenue Operator", policy_reason: "Customer emails require approval.",
    payload_preview: { operatorKey: "revenue", to: "customer@example.test", subject: "Your request", body: "Thank you for your request. Here is the update you asked for.", draftBody: "Thank you for your request. Here is the update you asked for.", draftSubject: "Your request", preparedActions: [], customerEmailPolicy: { mode: "approval_required" } },
  }] : [] };
  else if (url.pathname === "/api/operators/runs") data = { runs: [] };
  else if (url.pathname === "/api/connectors/accounts") data = { accounts: [] };
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
};
const pages = { dashboard: OSOverview, connectors: Connectors, agents: Agents, revenue: Revenue, "client-flow": ClientFlow, operations: Operations, approvals: Approvals, policies: Policies, settings: Settings, plans: Plans };
const Page = pages[params.get("surface")] || OSOverview;
createRoot(document.getElementById("fixture")).render(<div className="os-root"><AppShell><Page /></AppShell></div>);
