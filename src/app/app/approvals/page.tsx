"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";
import { useOS } from "@/lib/os/app-provider";
import { InboxIcon, CheckIcon } from "@/components/dashboard/icons";

const FILTER_TABS = ["All", "Email", "Follow-up", "Action"];

type ApprovalRow = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string | null;
  resolved_at: string | null;
  approval_type: string;
  category: string;
  continuation_kind: string | null;
  run_id: string | null;
  linked_run_id: string | null;
  agent_id: string | null;
  agent_mark: string | null;
  policy_reason: string | null;
  payload_preview: {
    to: string | null;
    subject: string | null;
    body: string | null;
    fullBody?: string | null;
    draftSubject?: string | null;
    draftBody?: string | null;
    originalDraftSubject?: string | null;
    originalDraftBody?: string | null;
    editedDraftSubject?: string | null;
    editedDraftBody?: string | null;
    wasEdited?: boolean;
    editedAt?: string | null;
    editedBy?: string | null;
    operatorKey: string | null;
    workflow?: { id: string | null; objective: string | null; stepId: string | null; stepOrder: number | null; stepCount: number | null; stepReason: string | null };
    dedupeKey?: string | null;
    dedupeMetadata?: Record<string, unknown> | null;
    preparedActions?: string[];
    crmPreparationStatus?: string | null;
    crmStatusText?: string | null;
    sourceMetadata?: Record<string, unknown>;
    detectedSignal?: string | null;
    sourceEmail?: string | null;
    classification?: string | null;
    confidence?: string | null;
    matchedKeywords?: string[];
    whyThisMatters?: string | null;
    riskLevel?: string | null;
    riskNotes?: string | null;
    expectedOutcome?: string | null;
    approvalReason?: string | null;
    whatHappensAfterApproval?: string | null;
    executionResult?: Record<string, unknown> | null;
    approvalScope?: {
      workspaceId?: string;
      operatorId?: string;
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      destinationType?: string;
      matchedPolicyRuleIds?: string[];
      policyVersion?: number;
      contextFingerprint?: string | null;
    } | null;
    approvalScopes?: Record<string, {
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextFingerprint?: string | null;
    }> | null;
    policyEvidence?: {
      policyVersion?: number;
      matchedRuleIds?: string[];
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextSummary?: Record<string, string | number | boolean | null>;
      contextFingerprint?: string | null;
      threshold?: { field?: string; operator?: string; configuredValue?: string | number | boolean | null; observedValue?: string | number | boolean | null; result?: string } | null;
      requiredApproverRoles?: string[];
      approvalExpiresAfterMinutes?: number | null;
    } | null;
    policyEvidenceByAction?: Record<string, {
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextSummary?: Record<string, string | number | boolean | null>;
      contextFingerprint?: string | null;
      threshold?: { field?: string; operator?: string; configuredValue?: string | number | boolean | null; observedValue?: string | number | boolean | null; result?: string } | null;
      requiredApproverRoles?: string[];
      approvalExpiresAfterMinutes?: number | null;
    }> | null;
    preparedAction?: {
      id?: string;
      actionType?: string;
      connectorKey?: string;
      capability?: string;
      riskLevel?: string;
      requiresApproval?: boolean;
      title?: string;
      summary?: string;
      input?: Record<string, unknown>;
      preview?: {
        label?: string;
        fields?: Array<{ label: string; value: string }>;
        bodyPreview?: string | null;
      };
    } | null;
    operations?: {
      signalType?: string;
      severity?: string;
      boardName?: string;
      listName?: string;
      cardName?: string | null;
      cardUrl?: string | null;
      plainEnglishSummary?: string;
      recommendedAction?: string;
      preparedSlackMessage?: string | null;
    } | null;
    operationsPolicy?: { slackMessage?: string; trelloUpdate?: string; humanReview?: string } | null;
    livePolicyDecision?: { decision: string; reason: string; riskLevel: string; matchedRuleId: string; userFacingLabel: string; requiresHumanReview: boolean } | null;
    preparedSlackAction?: { input?: Record<string, unknown> } | null;
    preparedTrelloAction?: { actionType?: string; title?: string; preview?: { label?: string; fields?: Array<{ label: string; value: string }>; bodyPreview?: string | null } } | null;
    customerEmailPolicy?: {
      mode?: string;
      customerEmail?: string;
      humanReview?: string;
      crmUpdate?: string;
      slackAlert?: string;
    } | null;
    preparedHubSpotActions?: {
      contact?: {
        email?: string | null;
        firstname?: string | null;
        lastname?: string | null;
        companyName?: string | null;
        source?: string | null;
      };
      deal?: {
        dealname?: string | null;
        stageLabel?: string | null;
        pipelineLabel?: string | null;
        amount?: number | null;
      };
      note?: {
        body?: string | null;
      };
      task?: {
        title?: string | null;
        dueSuggestion?: string | null;
        type?: string | null;
      };
      executionStatus?: string | null;
    } | null;
    crmPreparation?: {
      contactEmail?: string;
      contactName?: string | null;
      companyName?: string | null;
      sourceSubject?: string;
      classification?: string;
      confidence?: string;
      summary?: string;
      suggestedNextStep?: string;
      suggestedDealStage?: string;
      suggestedFollowUpTask?: string;
      matchedKeywords?: string[];
      personalizationSource?: string;
      signatureCandidateRaw?: string | null;
      signatureCandidateAccepted?: string | null;
    } | null;
  };
};

type ApprovalsResponse = {
  approvals?: ApprovalRow[];
  stats?: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    total: number;
  };
  error?: string;
};

function categoryTone(type: string): "cyan" | "red" | "amber" {
  if (type === "proposal") return "cyan";
  if (type === "campaign") return "red";
  if (type === "email" || type === "follow-up") return "amber";
  return "cyan";
}

function timeAgo(createdAt: string | null): string {
  if (!createdAt) return "time unknown";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

function displayCategory(item: ApprovalRow): string {
  if (item.continuation_kind === "gmail.send_after_approval" || item.continuation_kind === "microsoft.send_after_approval") return "follow-up";
  return item.category || item.approval_type || "action";
}

function matchesFilter(item: ApprovalRow, filter: string): boolean {
  if (filter === "All") return true;
  const needle = filter.toLowerCase();
  return displayCategory(item) === needle || item.approval_type === needle;
}

function actionLabel(action: string): string {
  if (action === "send_gmail_follow_up") return "Send Gmail follow-up";
  if (action === "send_microsoft_follow_up") return "Send Microsoft 365 follow-up";
  if (action === "update_hubspot_contact") return "Update HubSpot contact/deal";
  if (action === "update_hubspot_deal") return "Update HubSpot deal";
  if (action === "add_hubspot_note") return "Add CRM note";
  if (action === "create_hubspot_follow_up_task") return "Create follow-up task";
  return action.replace(/_/g, " ");
}

const REJECTION_REASONS = [
  "False positive - not a commercial inquiry",
  "Wrong tone",
  "Too pushy",
  "Wrong recipient",
  "Needs manual review",
  "Other",
];

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "-";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatContextValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

function confidenceLabel(value: string | null | undefined): string {
  return value?.trim() ? value.trim().toUpperCase() : "UNKNOWN";
}

function isRevenueApproval(item: ApprovalRow): boolean {
  return item.payload_preview.operatorKey === "revenue" || item.agent_id === "revenue";
}

function isSharedActionApproval(item: ApprovalRow): boolean {
  return item.continuation_kind === "shared_action.execute_after_approval" && Boolean(item.payload_preview.preparedAction);
}

export default function ApprovalsPage() {
  const { state } = useOS();
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [, setFullEmailOpen] = useState<Record<string, boolean>>({});
  const [editingDrafts, setEditingDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!state.workspace.id) return;
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userId: state.currentUser.id,
      userEmail: state.currentUser.email,
    });

    try {
      const res = await fetch(`/api/approvals?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as ApprovalsResponse;
      if (!res.ok) {
        setError(json.error || "Could not load approvals.");
        setApprovals([]);
        return;
      }
      setApprovals(Array.isArray(json.approvals) ? json.approvals : []);
    } catch {
      setError("Could not load approvals.");
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void loadApprovals(); }, 0);
    return () => window.clearTimeout(handle);
  }, [loadApprovals]);

  const pending = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const resolved = useMemo(() => approvals.filter((a) => a.status !== "pending"), [approvals]);
  const visible = useMemo(() => pending.filter((a) => matchesFilter(a, filter)), [filter, pending]);
  const approvedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return resolved.filter((a) => ["approved", "partially_completed"].includes(a.status) && a.resolved_at?.startsWith(today)).length;
  }, [resolved]);

  const actOnApproval = async (item: ApprovalRow, action: "approve" | "reject", reason?: string) => {
    setBusyId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/approvals/${item.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          reason,
        }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setError(json.error || `Could not ${action} approval.`);
        return;
      }
      await loadApprovals();
    } catch {
      setError(`Could not ${action} approval.`);
    } finally {
      setBusyId(null);
    }
  };

  const startEditingDraft = (item: ApprovalRow) => {
    setEditingDrafts((current) => ({
      ...current,
      [item.id]: {
        subject: item.payload_preview.editedDraftSubject || item.payload_preview.draftSubject || item.payload_preview.subject || "",
        body: item.payload_preview.editedDraftBody || item.payload_preview.draftBody || item.payload_preview.fullBody || item.payload_preview.body || "",
      },
    }));
    setFullEmailOpen((current) => ({ ...current, [item.id]: true }));
  };

  const cancelEditingDraft = (id: string) => {
    setEditingDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const saveDraftEdit = async (item: ApprovalRow) => {
    const draft = editingDrafts[item.id];
    if (!draft) return;
    setSavingEditId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/approvals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          draftSubject: draft.subject,
          draftBody: draft.body,
        }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) {
        setError(json.message || json.error || "Could not save draft changes.");
        return;
      }
      cancelEditingDraft(item.id);
      await loadApprovals();
    } catch {
      setError("Could not save draft changes.");
    } finally {
      setSavingEditId(null);
    }
  };

  const approveAll = async () => {
    if (visible.length === 0) return;
    const ok = window.confirm(`Approve ${visible.length} pending approval${visible.length === 1 ? "" : "s"}? Email approvals will send after approval.`);
    if (!ok) return;
    for (const item of visible) {
      await actOnApproval(item, "approve");
    }
  };

  return (
    <div className="os-page approvals-page">
      <PageHeader
        eyebrow={`Approval inbox · ${pending.length} waiting`}
        title="Approvals"
        description="Review prepared operator actions before they run."
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/logs")}>History</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={approveAll}
            disabled={visible.length === 0 || Boolean(busyId)}
            style={{ opacity: visible.length === 0 || busyId ? 0.4 : 1 }}
          >
            <CheckIcon size={12} /> Approve all
          </button>
        </>}
      />

      <MetricStrip items={[
        { label: "Pending", value: pending.length, detail: "Waiting for your review" },
        { label: "Approved today", value: approvedToday, detail: "Reviewed today" },
        { label: "Avg. review time", value: "-", detail: "not tracked yet" },
        { label: "Auto-approved (7d)", value: "-", detail: "not enabled" },
      ]} />

      <div className="sec-head">
        <div className="inline">
          {FILTER_TABS.map((t) => (
            <button key={t} aria-pressed={filter === t} onClick={() => setFilter(t)} className={`filter${filter === t ? " on" : ""}`}>
              {t}
            </button>
          ))}
        </div>
        <Link className="btn btn-ghost btn-sm" href="/policies">Manage policies</Link>
      </div>

      {error && (
        <div role="alert" className="attn crit" style={{ padding: "12px 14px" }}>
          <span className="t-compact">{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="t-section"><InboxIcon size={13} /> Pending review</div>
          <div className="t-meta inline">
            {pending.length > 0
              ? <><span className="dot dot-cyan pulsing" /> {pending.length} waiting</>
              : <><span className="dot dot-green" /> All clear</>
            }
          </div>
        </div>
        {loading ? (
          <div className="card-pad"><p className="t-meta" style={{ margin: 0 }}>Loading approvals...</p></div>
        ) : visible.length === 0 ? (
          <div className="card-pad">
            <EmptyState title="All clear" action={<Link className="btn btn-ghost btn-sm" href="/logs">Recent history</Link>}>
              {`0 actions waiting${filter !== "All" ? ` in ${filter.toLowerCase()}` : ""}. Consequential work will return here before it runs.`}
            </EmptyState>
          </div>
        ) : (
          <div className="card-pad stack">
            {visible.map((item) => {
              const category = displayCategory(item);
              const operatorName = item.payload_preview.operatorKey === "revenue" || item.agent_id === "revenue"
                ? "Revenue Operator"
                : item.agent_mark || "Operator";
              const isBusy = busyId === item.id;
              const revenueApproval = isRevenueApproval(item);
              const sharedActionApproval = isSharedActionApproval(item);
              const operationsApproval = item.continuation_kind === "operations.execute_after_approval";
              const operations = item.payload_preview.operations ?? null;
              const operationsExecution = recordValue(item.payload_preview.executionResult);
              const preparedActions = item.payload_preview.preparedActions ?? [];
              const workflow = item.payload_preview.workflow;
              const rejectionReason = rejectReasons[item.id] ?? (revenueApproval ? "False positive - not a commercial inquiry" : "Needs manual review");
              const hubspotPreview = item.payload_preview.preparedHubSpotActions;
              const showDetails = Boolean(detailsOpen[item.id]);
              const draftEdit = editingDrafts[item.id];
              const isSavingEdit = savingEditId === item.id;
              const sourceMetadata = item.payload_preview.sourceMetadata ?? {};
              const executionResult = recordValue(item.payload_preview.executionResult);
              const sharedActionExecution = recordValue(executionResult.action);
              const sharedActionResult = recordValue(sharedActionExecution.result);
              const hubspotExecution = recordValue(executionResult.hubspot);
              const originalSubject = typeof sourceMetadata.subject === "string"
                ? sourceMetadata.subject
                : item.payload_preview.crmPreparation?.sourceSubject ?? item.payload_preview.subject ?? "-";
              const contactNameSource = item.payload_preview.crmPreparation?.personalizationSource
                || (typeof sourceMetadata.personalizationSource === "string" ? sourceMetadata.personalizationSource : "fallback");
              const hubspotSetupText = (() => {
                const status = textValue(hubspotExecution.propertySetupStatus);
                if (status === "custom_properties_ready") return "Full attribution ready";
                if (status === "custom_properties_partial") return "Partial attribution properties";
                if (status === "custom_properties_missing") return "Standard fields only";
                if (status === "property_check_failed") return "Property check failed";
                return null;
              })();
              const customerEmailMode = item.payload_preview.customerEmailPolicy?.mode ?? "approval_required";
              const policyItems = [
                { label: "Customer email", value: customerEmailMode === "draft_only" ? "Draft only" : "Approval required" },
                { label: "Slack alert", value: item.payload_preview.customerEmailPolicy?.slackAlert ?? "Disabled" },
                { label: "CRM update", value: item.payload_preview.customerEmailPolicy?.crmUpdate ?? "Approval required" },
                { label: "Human review", value: item.payload_preview.customerEmailPolicy?.humanReview ?? "Required" },
              ];

              return (
                <article key={item.id} className="panel card-pad">
                  {workflow?.id && (
                    <div className="attn info" style={{ padding: "8px 10px", marginBottom: 10 }}>
                      <span className="t-compact"><strong className="ink">{workflow.objective || "Workflow action"}</strong>
                        {workflow.stepOrder && workflow.stepCount ? ` · Step ${workflow.stepOrder} of ${workflow.stepCount}` : ""}
                      </span>
                      {workflow.stepReason ? <div className="t-meta" style={{ marginTop: 3 }}>{workflow.stepReason}</div> : null}
                    </div>
                  )}
                  <header className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span className="op-id">
                      <span className="cn-mark lg" aria-hidden>{operatorName.slice(0, 2).toUpperCase()}</span>
                      <span className="nm"><b>{operatorName}</b><span>{timeAgo(item.created_at)}</span></span>
                    </span>
                    <span className={`badge ${categoryTone(category)}`}>{category}</span>
                  </header>
                  <div className="t-object" style={{ marginTop: 12 }}>{item.title}</div>
                  <p className="t-compact" style={{ marginTop: 4 }}>{item.description}</p>

                  {item.payload_preview.policyEvidence && (
                    <div className="panel card-pad approval-policy-evidence" style={{ marginTop: 14 }}>
                      <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div className="t-eyebrow">Policy evidence</div>
                          <div className="t-object" style={{ marginTop: 4 }}>This approval is scoped to one prepared action.</div>
                        </div>
                        <span className="badge cyan">v{item.payload_preview.policyEvidence.policyVersion ?? 1}</span>
                      </div>
                      <dl className="kv" style={{ marginTop: 12 }}>
                        <div><dt>Connector</dt><dd>{valueOrDash(item.payload_preview.policyEvidence.connector)}</dd></div>
                        <div><dt>Exact action</dt><dd>{valueOrDash(item.payload_preview.policyEvidence.action?.replace(/_/g, " ") ?? null)}</dd></div>
                        <div><dt>Subject</dt><dd>{valueOrDash(item.payload_preview.policyEvidence.subjectType ? `${item.payload_preview.policyEvidence.subjectType}${item.payload_preview.policyEvidence.subjectId ? ` · ${item.payload_preview.policyEvidence.subjectId}` : ""}` : null)}</dd></div>
                        <div><dt>Matched policy</dt><dd>{item.payload_preview.policyEvidence.matchedRuleIds?.join(", ") || "Platform safety baseline"}</dd></div>
                        <div><dt>Approval authority</dt><dd>{item.payload_preview.policyEvidence.requiredApproverRoles?.join(", ") || "Workspace reviewer"}</dd></div>
                      </dl>
                      {item.payload_preview.policyEvidence.threshold && (
                        <div className="attn info" style={{ padding: "9px 10px", marginTop: 12 }}>
                          <span className="t-compact"><strong className="ink">Threshold:</strong> {item.payload_preview.policyEvidence.threshold.field} {item.payload_preview.policyEvidence.threshold.operator} {formatContextValue(item.payload_preview.policyEvidence.threshold.configuredValue)} · observed {formatContextValue(item.payload_preview.policyEvidence.threshold.observedValue)} · {item.payload_preview.policyEvidence.threshold.result}</span>
                        </div>
                      )}
                      {item.payload_preview.policyEvidence.contextSummary && Object.keys(item.payload_preview.policyEvidence.contextSummary).length > 0 && (
                        <div className="t-meta" style={{ marginTop: 10 }}>Context: {Object.entries(item.payload_preview.policyEvidence.contextSummary).map(([key, value]) => `${key} ${formatContextValue(value)}`).join(" · ")}</div>
                      )}
                      {item.payload_preview.policyEvidenceByAction && Object.entries(item.payload_preview.policyEvidenceByAction).filter(([key]) => key !== "email").map(([key, evidence]) => (
                        <div key={key} className="attn info" style={{ padding: "9px 10px", marginTop: 10 }}>
                          <span className="t-compact"><strong className="ink">Independent child scope:</strong> {evidence.connector ?? key} Â· {evidence.action?.replace(/_/g, " ") ?? "action"}{evidence.subjectType ? ` Â· ${evidence.subjectType}${evidence.subjectId ? ` ${evidence.subjectId}` : ""}` : ""}</span>
                          {evidence.contextSummary && Object.keys(evidence.contextSummary).length > 0 && <div className="t-meta" style={{ marginTop: 4 }}>Context: {Object.entries(evidence.contextSummary).map(([contextKey, value]) => `${contextKey} ${formatContextValue(value)}`).join(" Â· ")}</div>}
                        </div>
                      ))}
                      <div className="t-meta" style={{ marginTop: 8 }}>Reapproval is required if the connector, target, action, or business context changes.</div>
                    </div>
                  )}

                  <div style={{ marginTop: 14 }}>
                    {revenueApproval && (
                      <div className="stack">
                        <div className="inline" style={{ justifyContent: "space-between" }}>
                          <div className="inline">
                            <span className="dot dot-cyan" />
                            <span className="t-meta ink">{operatorName}</span>
                            <span className="t-meta">prepared an email for approval</span>
                            {item.payload_preview.wasEdited && <span className="badge amber">Edited</span>}
                          </div>
                          <div className="inline">
                            <span className="badge cyan">Gmail send after approval</span>
                            {item.payload_preview.crmPreparationStatus === "hubspot_execution_enabled" && <span className="badge cyan">HubSpot contact/deal after approval</span>}
                            <span className="badge green">{confidenceLabel(item.payload_preview.confidence)}</span>
                          </div>
                        </div>

                        <div className="split">
                          <div className="panel card-pad">
                            <div className="inline" style={{ justifyContent: "space-between" }}>
                              <div>
                                <div className="t-eyebrow">Email draft</div>
                                <p className="t-meta" style={{ margin: "4px 0 0" }}>Review and edit the full email before approving.</p>
                              </div>
                              <div className="inline">
                                {item.payload_preview.wasEdited && <span className="badge amber">Edited</span>}
                                {!draftEdit && (
                                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEditingDraft(item)}>Edit draft</button>
                                )}
                              </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                              {draftEdit ? (
                                <div className="stack">
                                  <label className="field">
                                    <span className="label">Subject</span>
                                    <input
                                      className="input"
                                      value={draftEdit.subject}
                                      onChange={(event) => setEditingDrafts((current) => ({ ...current, [item.id]: { ...draftEdit, subject: event.target.value } }))}
                                      disabled={isSavingEdit}
                                    />
                                  </label>
                                  <label className="field">
                                    <span className="label">Body</span>
                                    <textarea
                                      className="input"
                                      value={draftEdit.body}
                                      onChange={(event) => setEditingDrafts((current) => ({ ...current, [item.id]: { ...draftEdit, body: event.target.value } }))}
                                      disabled={isSavingEdit}
                                      rows={12}
                                      style={{ height: "auto", padding: "10px 11px", lineHeight: 1.6 }}
                                    />
                                  </label>
                                  <div className="inline" style={{ justifyContent: "flex-end" }}>
                                    <button className="btn btn-primary btn-sm" type="button" disabled={isSavingEdit} onClick={() => saveDraftEdit(item)}>{isSavingEdit ? "Saving…" : "Save changes"}</button>
                                    <button className="btn btn-ghost btn-sm" type="button" disabled={isSavingEdit} onClick={() => cancelEditingDraft(item.id)}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {item.payload_preview.subject && <div className="t-object" style={{ marginBottom: 10 }}>{item.payload_preview.subject}</div>}
                                  <div className="t-compact" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                                    {item.payload_preview.fullBody || item.payload_preview.body || "-"}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <dl className="kv" style={{ gridTemplateColumns: "minmax(0,1fr)", gap: "10px 0" }}>
                            {policyItems.map((policy) => (
                              <div key={policy.label}><dt>{policy.label}</dt><dd>{policy.value}</dd></div>
                            ))}
                          </dl>
                        </div>

                        {customerEmailMode === "draft_only" && (
                          <div className="attn" role="status" style={{ padding: "9px 10px" }}>
                            <span className="t-compact">Draft only mode. This email will not be sent automatically.</span>
                          </div>
                        )}

                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => setDetailsOpen((current) => ({ ...current, [item.id]: !current[item.id] }))}
                          style={{ width: "fit-content" }}
                        >
                          {showDetails ? "Hide full details" : "View full details"}
                        </button>

                        {showDetails && (
                          <div className="panel card-pad stack">
                            <dl className="kv">
                              {[
                                { label: "Prepared by", value: "Auterim Revenue Operator" },
                                { label: "Signal source", value: "Gmail" },
                                { label: "Operator", value: "Revenue Operator" },
                                { label: "Source email", value: valueOrDash(item.payload_preview.sourceEmail) },
                                { label: "Original subject", value: valueOrDash(originalSubject) },
                                { label: "Contact name source", value: contactNameSource },
                                { label: "HubSpot setup", value: hubspotSetupText ?? "Pending execution" },
                                { label: "Pipeline", value: textValue(hubspotExecution.pipelineLabel) ?? "-" },
                                { label: "Stage", value: textValue(hubspotExecution.dealstageLabel) ?? "-" },
                                { label: "Dedupe key", value: valueOrDash(item.payload_preview.dedupeKey) },
                                { label: "Classification", value: valueOrDash(item.payload_preview.classification) },
                                { label: "Approval reason", value: item.payload_preview.approvalReason || item.policy_reason || "-" },
                              ].map((field) => (
                                <div key={field.label}><dt>{field.label}</dt><dd style={{ overflowWrap: "anywhere" }}>{field.value}</dd></div>
                              ))}
                            </dl>

                            {hubspotPreview && (
                              <div className="grid2">
                                <div className="panel card-pad">
                                  <div className="t-eyebrow">HubSpot contact</div>
                                  <p className="t-compact" style={{ margin: "5px 0 0" }}>
                                    <strong className="ink">{valueOrDash([hubspotPreview.contact?.firstname, hubspotPreview.contact?.lastname].filter(Boolean).join(" ") || null)}</strong><br />
                                    {valueOrDash(hubspotPreview.contact?.email)}<br />
                                    Source: {valueOrDash(hubspotPreview.contact?.source)}
                                  </p>
                                </div>
                                <div className="panel card-pad">
                                  <div className="t-eyebrow">HubSpot deal</div>
                                  <p className="t-compact" style={{ margin: "5px 0 0" }}>
                                    <strong className="ink">{valueOrDash(hubspotPreview.deal?.dealname)}</strong><br />
                                    Stage: {valueOrDash(hubspotPreview.deal?.stageLabel)}<br />
                                    Pipeline: {valueOrDash(hubspotPreview.deal?.pipelineLabel)}
                                  </p>
                                </div>
                                <div className="panel card-pad">
                                  <div className="t-eyebrow">CRM note</div>
                                  <p className="t-compact" style={{ margin: "5px 0 0" }}>{valueOrDash(hubspotPreview.note?.body)}</p>
                                  <div className="t-meta" style={{ marginTop: 4 }}>Prepared only in this version.</div>
                                </div>
                                <div className="panel card-pad">
                                  <div className="t-eyebrow">Follow-up task</div>
                                  <p className="t-compact" style={{ margin: "5px 0 0" }}>
                                    <strong className="ink">{valueOrDash(hubspotPreview.task?.title)}</strong><br />
                                    Due: {valueOrDash(hubspotPreview.task?.dueSuggestion)}<br />
                                    Type: {valueOrDash(hubspotPreview.task?.type)}
                                  </p>
                                  <div className="t-meta" style={{ marginTop: 4 }}>Prepared only in this version.</div>
                                </div>
                              </div>
                            )}

                            {item.payload_preview.crmPreparation && (
                              <div className="t-compact stack" style={{ gap: 4 }}>
                                {item.payload_preview.crmPreparation.suggestedNextStep && (
                                  <div><strong className="ink">Suggested next step:</strong> {item.payload_preview.crmPreparation.suggestedNextStep}</div>
                                )}
                                {item.payload_preview.crmPreparation.suggestedDealStage && (
                                  <div><strong className="ink">Suggested deal stage:</strong> {item.payload_preview.crmPreparation.suggestedDealStage}</div>
                                )}
                                {item.payload_preview.crmPreparation.suggestedFollowUpTask && (
                                  <div><strong className="ink">Suggested task:</strong> {item.payload_preview.crmPreparation.suggestedFollowUpTask}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {sharedActionApproval && item.payload_preview.preparedAction && (
                      <div className="panel card-pad stack">
                        <div className="inline" style={{ justifyContent: "space-between" }}>
                          <div>
                            <div className="t-object">{item.payload_preview.preparedAction.preview?.label || item.payload_preview.preparedAction.title || "Prepared action"}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>
                              Trello - Risk: {item.payload_preview.preparedAction.riskLevel || "medium"} - Requires approval
                            </div>
                          </div>
                          <span className="badge cyan">{item.payload_preview.preparedAction.actionType?.replace(/_/g, " ") || "task action"}</span>
                        </div>
                        <dl className="kv">
                          {(item.payload_preview.preparedAction.preview?.fields ?? []).map((field) => (
                            <div key={field.label}><dt>{field.label}</dt><dd style={{ overflowWrap: "anywhere" }}>{field.value}</dd></div>
                          ))}
                        </dl>
                        {item.payload_preview.preparedAction.preview?.bodyPreview && (
                          <p className="t-compact" style={{ whiteSpace: "pre-wrap" }}>{item.payload_preview.preparedAction.preview.bodyPreview}</p>
                        )}
                        {executionResult.status === "executed" && (
                          <div className="attn" role="status" style={{ padding: "9px 10px" }}>
                            <span className="t-compact">Trello card created{typeof sharedActionResult.cardUrl === "string" && sharedActionResult.cardUrl ? (
                              <> - <a className="lnk-open" href={sharedActionResult.cardUrl} target="_blank" rel="noreferrer">Open card</a></>
                            ) : "."}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {operationsApproval && operations && (
                      <div className="panel card-pad stack">
                        <div className="inline" style={{ justifyContent: "space-between" }}>
                          <div>
                            <div className="t-object">{operations.cardName || operations.listName || "Operational signal"}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>
                              {operations.boardName ? `${operations.boardName} / ` : ""}{operations.listName || "-"} · {(operations.signalType || "signal").replace(/_/g, " ")}
                            </div>
                          </div>
                          <span className="badge cyan">Severity: {operations.severity || "medium"}</span>
                        </div>
                        {operations.plainEnglishSummary && <p className="t-compact">{operations.plainEnglishSummary}</p>}
                        {operations.recommendedAction && <p className="t-compact"><strong className="ink">Recommended:</strong> {operations.recommendedAction}</p>}
                        {operations.preparedSlackMessage && (
                          <div className="panel card-pad">
                            <div className="t-eyebrow">Prepared Slack message</div>
                            <p className="t-compact" style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{operations.preparedSlackMessage}</p>
                          </div>
                        )}
                        {item.payload_preview.preparedTrelloAction && (
                          <div className="panel card-pad">
                            <div className="t-eyebrow">Prepared Trello action</div>
                            <p className="t-compact" style={{ margin: "4px 0 0" }}>{(item.payload_preview.preparedTrelloAction.actionType || "task action").replace(/_/g, " ")}: {item.payload_preview.preparedTrelloAction.preview?.bodyPreview || item.payload_preview.preparedTrelloAction.title || operations.cardName}</p>
                          </div>
                        )}
                        <div className="inline">
                          <span className="badge muted">Slack message: {item.payload_preview.operationsPolicy?.slackMessage || "Approval required"}</span>
                          <span className="badge muted">Trello update: {item.payload_preview.operationsPolicy?.trelloUpdate || "Approval required"}</span>
                          <span className="badge muted">Human review: {item.payload_preview.operationsPolicy?.humanReview || "Required"}</span>
                        </div>
                        {operations.cardUrl && <a className="lnk-open" href={operations.cardUrl} target="_blank" rel="noreferrer">Open Trello card</a>}
                        {(operationsExecution.slackStatus === "sent" || operationsExecution.trelloStatus === "executed") && (
                          <div className="attn" role="status" style={{ padding: "9px 10px" }}>
                            <span className="t-compact">
                              {operationsExecution.slackStatus === "sent" ? "Slack update sent. " : ""}{operationsExecution.trelloStatus === "executed" ? "Trello action applied." : ""}
                              {typeof operationsExecution.cardUrl === "string" && operationsExecution.cardUrl ? (
                                <> <a className="lnk-open" href={operationsExecution.cardUrl} target="_blank" rel="noreferrer">Open card</a></>
                              ) : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {!revenueApproval && !operationsApproval && (
                      <dl className="kv">
                        {item.payload_preview.to && <div><dt>{revenueApproval ? "Recipient" : "To"}</dt><dd>{item.payload_preview.to}</dd></div>}
                        {item.payload_preview.subject && <div><dt>{revenueApproval ? "Draft subject" : "Subject"}</dt><dd>{item.payload_preview.subject}</dd></div>}
                        {item.payload_preview.body && <div><dt>{revenueApproval ? "Draft body" : "Body"}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{item.payload_preview.body}</dd></div>}
                        {(item.payload_preview.approvalReason || item.policy_reason) && <div><dt>Approval reason</dt><dd>{item.payload_preview.approvalReason || item.policy_reason}</dd></div>}
                        {preparedActions.length > 0 && <div><dt>Prepared actions</dt><dd>{preparedActions.map(actionLabel).join(" / ")}</dd></div>}
                        {item.payload_preview.crmPreparationStatus === "hubspot_not_connected" && <div><dt>CRM</dt><dd>CRM update not prepared because HubSpot is not connected.</dd></div>}
                        {item.payload_preview.crmPreparationStatus === "hubspot_execution_not_ready" && <div><dt>CRM</dt><dd>HubSpot update prepared, execution not implemented yet.</dd></div>}
                        {item.payload_preview.crmPreparation && <div><dt>CRM summary</dt><dd>{item.payload_preview.crmPreparation.summary}</dd></div>}
                      </dl>
                    )}
                    {revenueApproval && showDetails && item.payload_preview.whatHappensAfterApproval && (
                      <p className="t-compact" style={{ marginTop: 10 }}><strong className="ink">What happens after approval:</strong> {item.payload_preview.whatHappensAfterApproval}</p>
                    )}
                    {item.linked_run_id && (!revenueApproval || showDetails) && (
                      <p className="t-mono" style={{ marginTop: 10 }}>Run: {item.linked_run_id}</p>
                    )}
                  </div>
                  {item.payload_preview.livePolicyDecision && (() => {
                    const d = item.payload_preview.livePolicyDecision;
                    const exec = recordValue(item.payload_preview.executionResult);
                    const tone = d.decision === "blocked" ? "red" : d.decision === "allow_auto" ? "green" : "amber";
                    const postExec = exec.policyDecision || exec.gmailStatus === "blocked_by_policy" || exec.slackStatus === "blocked_by_policy" || exec.trelloStatus === "blocked_by_policy";
                    const execNote = item.status === "pending"
                      ? "Rechecked live before execution."
                      : exec.gmailStatus === "blocked_by_policy" || exec.slackStatus === "blocked_by_policy" || exec.trelloStatus === "blocked_by_policy" || exec.status === "blocked_by_policy"
                        ? "Blocked by updated policy."
                        : exec.gmailStatus === "draft_only_not_sent"
                          ? "Draft-only due to policy. Not sent."
                          : "Executed under live policy.";
                    return (
                      <div className={`attn ${tone === "red" ? "crit" : tone === "green" ? "info" : ""}`} role="status" style={{ marginTop: 12, padding: "10px 12px" }}>
                        <div className="inline">
                          <span className="t-eyebrow">Policy</span>
                          <span className={`badge ${tone}`}>{d.userFacingLabel}</span>
                          <span className="badge muted">Risk: {d.riskLevel}</span>
                          {d.requiresHumanReview && <span className="badge muted">Human review required</span>}
                          <span className={postExec && item.status !== "pending" ? "t-compact ink" : "t-meta"}>{execNote}</span>
                        </div>
                        <p className="t-meta" style={{ margin: "4px 0 0" }}>{d.reason} <span className="t-mono">({d.matchedRuleId})</span></p>
                      </div>
                    );
                  })()}
                  <div className="inline" style={{ marginTop: 14, justifyContent: "space-between" }}>
                    <label className="field" style={{ minWidth: 260 }}>
                      <span className="label">Reject reason</span>
                      <select
                        className="select"
                        aria-label="Reason for rejection"
                        value={rejectionReason}
                        onChange={(event) => setRejectReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                        style={{ width: "100%" }}
                      >
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason} value={reason}>{reason}</option>
                        ))}
                      </select>
                    </label>
                    <div className="inline">
                      <button className="btn btn-danger btn-sm" disabled={isBusy || isSavingEdit} onClick={() => actOnApproval(item, "reject", rejectionReason)}>Reject</button>
                      <button className="btn btn-ghost btn-sm" disabled={isBusy || isSavingEdit} onClick={() => startEditingDraft(item)}>Edit draft</button>
                      <button className="btn btn-primary btn-sm" disabled={isBusy || isSavingEdit} onClick={() => actOnApproval(item, "approve")}>
                        {customerEmailMode === "draft_only" ? "Mark reviewed" : item.approval_type === "email" ? "Approve and send" : "Approve"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="card">
          <div className="card-head"><div className="t-section">Recent decisions</div><span className="t-meta">{resolved.length} resolved</span></div>
          <div className="rows">
            {resolved.slice(0, 20).map((item) => (
              <div className="row" key={item.id}>
                <span className="grow"><span className="ttl">{item.title}</span><span className="sub">{item.agent_mark || "Operator"} · {timeAgo(item.resolved_at)}</span></span>
                <span className="rt"><span className={`badge ${item.status === "approved" || item.status === "partially_completed" ? "green" : "red"}`}>{item.status.replace(/_/g, " ")}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel card-pad">
        <span className="t-meta"><strong className="ink">Protected by default.</strong> Outbound actions require approval. <button className="lnk-open" onClick={() => router.push("/policies")}>Manage policies</button></span>
      </div>
    </div>
  );
}
