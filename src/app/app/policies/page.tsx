"use client";

import { useMemo, useState } from "react";
import { ShieldIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import { evaluatePolicy, type PolicyEvaluationAction, type PolicyEvaluationResult } from "@/lib/os/policy-engine";
import type { Policy, PolicyActionType, PolicyCategory, PolicyEffect } from "@/lib/os/types";
import { getEntitlements } from "@/lib/os/entitlements";

const POLICY_CATEGORIES: PolicyCategory[] = ["communication", "crm", "pricing", "payments", "memory", "calendar", "files", "internal", "security"];
const POLICY_ACTIONS: PolicyActionType[] = [
  "email.createDraft",
  "email.send",
  "crm.createRecord",
  "crm.updateRecord",
  "crm.deleteRecord",
  "pricing.change",
  "payment.refund",
  "slack.postMessage",
  "calendar.createExternalInvite",
  "memory.read",
  "memory.write",
  "memory.delete",
  "file.read",
  "file.shareExternal",
  "internal.logWrite",
  "internal.approvalCreate",
];
const TEST_TOGGLES: Array<{ key: TestToggleKey; label: string }> = [
  { key: "externalRecipient", label: "External recipient" },
  { key: "containsPricing", label: "Contains pricing" },
  { key: "customerFacing", label: "Customer facing" },
  { key: "destructiveAction", label: "Destructive action" },
];

type PolicyDraft = {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  category: PolicyCategory;
  actionType: PolicyActionType;
  appliesToAgents: string;
  appliesToConnectors: string;
  decision: PolicyEffect;
  reviewerRole: string;
  limitValue: string;
  allowlist: string;
  blockedReason: string;
  conditions: {
    externalRecipient: boolean;
    containsPricing: boolean;
    containsContractTerms: boolean;
    customerFacing: boolean;
    financialAction: boolean;
    destructiveAction: boolean;
    adminOnly: boolean;
    domainNotAllowlisted: boolean;
    amountOver: string;
  };
};
type TestToggleKey = "externalRecipient" | "containsPricing" | "customerFacing" | "destructiveAction";

const EMPTY_DRAFT: PolicyDraft = {
  name: "",
  description: "",
  enabled: true,
  category: "communication",
  actionType: "email.send",
  appliesToAgents: "all",
  appliesToConnectors: "all",
  decision: "require_approval",
  reviewerRole: "admin",
  limitValue: "",
  allowlist: "",
  blockedReason: "",
  conditions: {
    externalRecipient: false,
    containsPricing: false,
    containsContractTerms: false,
    customerFacing: false,
    financialAction: false,
    destructiveAction: false,
    adminOnly: false,
    domainNotAllowlisted: false,
    amountOver: "",
  },
};

function toDraft(policy: Policy): PolicyDraft {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    enabled: policy.enabled,
    category: policy.category,
    actionType: policy.actionType,
    appliesToAgents: policy.appliesToAgents.join(", "),
    appliesToConnectors: policy.appliesToConnectors.join(", "),
    decision: policy.decision,
    reviewerRole: policy.reviewerRole ?? "",
    limitValue: policy.limitValue ?? "",
    allowlist: (policy.allowlist ?? []).join(", "),
    blockedReason: policy.blockedReason ?? "",
    conditions: {
      externalRecipient: Boolean(policy.conditions.externalRecipient),
      containsPricing: Boolean(policy.conditions.containsPricing),
      containsContractTerms: Boolean(policy.conditions.containsContractTerms),
      customerFacing: Boolean(policy.conditions.customerFacing),
      financialAction: Boolean(policy.conditions.financialAction),
      destructiveAction: Boolean(policy.conditions.destructiveAction),
      adminOnly: Boolean(policy.conditions.adminOnly),
      domainNotAllowlisted: Boolean(policy.conditions.domainNotAllowlisted),
      amountOver: policy.conditions.amountOver ? String(policy.conditions.amountOver) : "",
    },
  };
}

function fromDraft(draft: PolicyDraft): Policy {
  const now = new Date().toISOString();
  return {
    id: draft.id ?? `pol-${Date.now()}`,
    name: draft.name.trim(),
    description: draft.description.trim(),
    enabled: draft.enabled,
    category: draft.category,
    actionType: draft.actionType,
    appliesToAgents: draft.appliesToAgents.split(",").map((v) => v.trim()).filter(Boolean),
    appliesToConnectors: draft.appliesToConnectors.split(",").map((v) => v.trim()).filter(Boolean),
    conditions: {
      externalRecipient: draft.conditions.externalRecipient || undefined,
      containsPricing: draft.conditions.containsPricing || undefined,
      containsContractTerms: draft.conditions.containsContractTerms || undefined,
      customerFacing: draft.conditions.customerFacing || undefined,
      financialAction: draft.conditions.financialAction || undefined,
      destructiveAction: draft.conditions.destructiveAction || undefined,
      adminOnly: draft.conditions.adminOnly || undefined,
      domainNotAllowlisted: draft.conditions.domainNotAllowlisted || undefined,
      amountOver: draft.conditions.amountOver ? Number(draft.conditions.amountOver) : undefined,
    },
    decision: draft.decision,
    reviewerRole: draft.reviewerRole.trim() || undefined,
    limitValue: draft.limitValue.trim() || undefined,
    allowlist: draft.allowlist.split(",").map((v) => v.trim()).filter(Boolean),
    blockedReason: draft.blockedReason.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    active: draft.enabled,
    action: draft.actionType,
    effect: draft.decision,
    scope: ["all"],
    appliesTo: draft.appliesToAgents,
  };
}

function decisionBadge(decision: PolicyEffect): { text: string; bg: string; color: string } {
  if (decision === "allow") return { text: "allow", bg: "rgba(81,216,138,0.12)", color: "var(--green)" };
  if (decision === "require_approval") return { text: "approval", bg: "rgba(245,194,107,0.13)", color: "var(--amber)" };
  return { text: "blocked", bg: "rgba(242,118,124,0.13)", color: "var(--rose)" };
}

export default function PoliciesPage() {
  const { state, upsertPolicy, setPolicyActive } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview";
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [error, setError] = useState("");
  const [testAction, setTestAction] = useState<PolicyEvaluationAction>({
    id: "policy-test",
    agentId: state.agents.find((a) => a.name.includes("Revenue"))?.id ?? state.agents[0]?.id ?? "agent",
    toolId: "gmail.sendEmailMock",
    connectorId: "gmail",
    actionType: "email.send",
    payload: {},
    riskLevel: "high",
    customerFacing: true,
    externalRecipient: true,
    financialAction: false,
    destructiveAction: false,
    containsPricing: false,
    target: "contact@external.com",
    metadata: { source: "policy-test-panel" },
  });
  const [testResult, setTestResult] = useState<PolicyEvaluationResult | null>(null);

  const activePolicies = useMemo(() => state.policies.filter((p) => p.enabled && p.active), [state.policies]);
  const reviewedToday = useMemo(() => state.logs.filter((l) => l.event === "policy.evaluated").length, [state.logs]);
  const approvalsRequired = useMemo(() => state.logs.filter((l) => l.event === "policy.approval_required").length, [state.logs]);
  const blockedActions = useMemo(() => state.logs.filter((l) => l.event === "policy.blocked").length, [state.logs]);

  const openEdit = (policy?: Policy) => {
    setError("");
    setDraft(policy ? toDraft(policy) : { ...EMPTY_DRAFT });
  };

  const runPolicyTest = () => {
    const result = evaluatePolicy(testAction, state);
    setTestResult(result);
  };

  const savePolicy = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    const policy = fromDraft(draft);
    if (draft.id) policy.createdAt = state.policies.find((p) => p.id === draft.id)?.createdAt ?? policy.createdAt;
    policy.updatedAt = new Date().toISOString();
    upsertPolicy(policy);
    setDraft(null);
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Execution guardrails - {activePolicies.length} enforced</span>
          <h1>Policies</h1>
          <div className="os-page-sub">Policies are enforced before operators can execute tool actions. Operators can propose actions, but guardrails decide what can run.</div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Policies are enforced before live execution. Preview mode uses demo actions.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => openEdit()}>Add policy</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Enforced policies", value: String(activePolicies.length), sub: "active guardrails" },
          { label: "Actions reviewed today", value: String(reviewedToday), sub: "policy engine evaluations" },
          { label: "Approvals required", value: String(approvalsRequired), sub: "risky actions waiting" },
          { label: "Blocked actions", value: String(blockedActions), sub: "blocked before execution" },
        ].map((metric) => (
          <div className="kpi" key={metric.label}>
            <div className="kpi-top"><span className="lab">{metric.label}</span></div>
            <div className="kpi-val">{metric.value}</div>
            <div className="kpi-meta"><span className="kpi-delta">{metric.sub}</span></div>
          </div>
        ))}
      </div>

      <div className="p">
        <div className="p-head">
          <h3><ShieldIcon size={13} /> Active guardrails</h3>
          <div className="p-meta">Blocked actions never reach connected tools.</div>
        </div>
        {state.policies.map((policy) => {
          const badge = decisionBadge(policy.decision);
          const conditionText = Object.entries(policy.conditions)
            .filter(([, value]) => value !== undefined && value !== false)
            .map(([key, value]) => `${key}:${String(value)}`)
            .join(" | ") || "none";
          const appliesAgents = policy.appliesToAgents.join(", ") || "all";
          const appliesConnectors = policy.appliesToConnectors.join(", ") || "all";
          return (
            <div key={policy.id} style={{ borderBottom: "1px solid var(--line)", padding: "12px 16px", opacity: policy.enabled ? 1 : 0.62 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{policy.name}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 10.5, background: badge.bg, color: badge.color }}>{badge.text}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)" }}>{policy.actionType}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{policy.description}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
                    agents: {appliesAgents} | connectors: {appliesConnectors} | conditions: {conditionText}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <button className="appr-btn edit" onClick={() => openEdit(policy)}>Edit</button>
                  <button
                    className="appr-btn edit"
                    onClick={() => {
                      setTestAction((prev) => ({ ...prev, actionType: policy.actionType }));
                      runPolicyTest();
                    }}
                  >
                    Test
                  </button>
                  <button className="appr-btn deny" onClick={() => setPolicyActive(policy.id, !policy.enabled)}>{policy.enabled ? "Disable" : "Enable"}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p">
        <div className="p-head">
          <h3><ShieldIcon size={13} /> Policy test panel</h3>
          <div className="p-meta">Approval-required actions wait in the inbox.</div>
        </div>
        <div style={{ display: "grid", gap: 10, padding: "10px 14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <select className="os-input" value={testAction.agentId} onChange={(e) => setTestAction((prev) => ({ ...prev, agentId: e.target.value }))}>
              {state.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            <select className="os-input" value={testAction.actionType} onChange={(e) => setTestAction((prev) => ({ ...prev, actionType: e.target.value as PolicyActionType }))}>
              {POLICY_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <select className="os-input" value={testAction.riskLevel} onChange={(e) => setTestAction((prev) => ({ ...prev, riskLevel: e.target.value as "low" | "medium" | "high" }))}>
              <option value="low">risk: low</option>
              <option value="medium">risk: medium</option>
              <option value="high">risk: high</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
            {TEST_TOGGLES.map((toggle) => (
              <label key={toggle.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(testAction[toggle.key])}
                  onChange={(e) => setTestAction((prev) => ({ ...prev, [toggle.key]: e.target.checked }))}
                />
                <span>{toggle.label}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="appr-btn edit" onClick={() => setTestResult(null)}>Clear</button>
            <button className="appr-btn approve" onClick={runPolicyTest}>Test decision</button>
          </div>
          {testResult && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
              <div style={{ marginBottom: 4, fontSize: 12.8, fontWeight: 600, color: testResult.decision === "allow" ? "var(--green)" : testResult.decision === "require_approval" ? "var(--amber)" : "var(--rose)" }}>
                Result: {testResult.decision}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 5 }}>{testResult.reason}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
                matched policy: {testResult.matchedPolicies.map((p) => p.name).join(" | ") || "none"}
              </div>
            </div>
          )}
        </div>
      </div>

      {draft && (
        <div className="os-modal-backdrop" onClick={() => setDraft(null)}>
          <div className="os-modal" style={{ width: "min(760px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{draft.id ? "Edit policy" : "Add policy"}</h3>
              <button className="appr-btn deny" onClick={() => setDraft(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="os-input" placeholder="Policy name" value={draft.name} onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              <textarea className="os-input" rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <select className="os-input" value={draft.category} onChange={(e) => setDraft((prev) => (prev ? { ...prev, category: e.target.value as PolicyCategory } : prev))}>
                  {POLICY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select className="os-input" value={draft.actionType} onChange={(e) => setDraft((prev) => (prev ? { ...prev, actionType: e.target.value as PolicyActionType } : prev))}>
                  {POLICY_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
                </select>
                <select className="os-input" value={draft.decision} onChange={(e) => setDraft((prev) => (prev ? { ...prev, decision: e.target.value as PolicyEffect } : prev))}>
                  <option value="allow">allow</option>
                  <option value="require_approval">require approval</option>
                  <option value="block">block</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input className="os-input" placeholder="Applies to agents (comma-separated)" value={draft.appliesToAgents} onChange={(e) => setDraft((prev) => (prev ? { ...prev, appliesToAgents: e.target.value } : prev))} />
                <input className="os-input" placeholder="Applies to connectors (comma-separated)" value={draft.appliesToConnectors} onChange={(e) => setDraft((prev) => (prev ? { ...prev, appliesToConnectors: e.target.value } : prev))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
                {(["externalRecipient", "containsPricing", "containsContractTerms", "customerFacing", "financialAction", "destructiveAction", "adminOnly", "domainNotAllowlisted"] as const).map((key) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={draft.conditions[key]}
                      onChange={(e) => setDraft((prev) => (prev ? { ...prev, conditions: { ...prev.conditions, [key]: e.target.checked } } : prev))}
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <input className="os-input" placeholder="Reviewer role" value={draft.reviewerRole} onChange={(e) => setDraft((prev) => (prev ? { ...prev, reviewerRole: e.target.value } : prev))} />
                <input className="os-input" placeholder="Amount over" value={draft.conditions.amountOver} onChange={(e) => setDraft((prev) => (prev ? { ...prev, conditions: { ...prev.conditions, amountOver: e.target.value } } : prev))} />
                <input className="os-input" placeholder="Limit value" value={draft.limitValue} onChange={(e) => setDraft((prev) => (prev ? { ...prev, limitValue: e.target.value } : prev))} />
              </div>
              <input className="os-input" placeholder="Allowlist domains (comma-separated)" value={draft.allowlist} onChange={(e) => setDraft((prev) => (prev ? { ...prev, allowlist: e.target.value } : prev))} />
              <input className="os-input" placeholder="Blocked reason" value={draft.blockedReason} onChange={(e) => setDraft((prev) => (prev ? { ...prev, blockedReason: e.target.value } : prev))} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-dim)" }}>
                <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))} />
                <span>Enabled</span>
              </label>
              {error && <div style={{ color: "#ff8f8f", fontSize: 12 }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={savePolicy}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
