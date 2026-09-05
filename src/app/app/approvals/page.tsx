"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function tagClass(type: string): string {
  if (type === "proposal") return "pill-cyan";
  if (type === "campaign") return "pill-rose";
  if (type === "email" || type === "follow-up") return "pill-amber";
  return "pill-cyan";
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
  if (item.continuation_kind === "gmail.send_after_approval") return "follow-up";
  return item.category || item.approval_type || "action";
}

function matchesFilter(item: ApprovalRow, filter: string): boolean {
  if (filter === "All") return true;
  const needle = filter.toLowerCase();
  return displayCategory(item) === needle || item.approval_type === needle;
}

function actionLabel(action: string): string {
  if (action === "send_gmail_follow_up") return "Send Gmail follow-up";
  if (action === "update_hubspot_contact") return "Update HubSpot contact/deal";
  if (action === "update_hubspot_deal") return "Update HubSpot deal";
  if (action === "add_hubspot_note") return "Add CRM note";
  if (action === "create_hubspot_follow_up_task") return "Create follow-up task";
  return action.replace(/_/g, " ");
}

const REJECTION_REASONS = [
  "Not a real opportunity",
  "Wrong tone",
  "Too pushy",
  "Wrong recipient",
  "Needs manual review",
  "Other",
];

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "-";
}

function shortPreview(value: string | null | undefined, max = 420): string {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function confidenceLabel(value: string | null | undefined): string {
  return value?.trim() ? value.trim().toUpperCase() : "UNKNOWN";
}

function executionTone(status: "ready" | "prepared" | "blocked") {
  if (status === "ready") return { color: "#8df5cf", border: "rgba(81,216,138,0.24)", background: "rgba(81,216,138,0.07)" };
  if (status === "blocked") return { color: "#f5c26b", border: "rgba(245,194,107,0.24)", background: "rgba(245,194,107,0.07)" };
  return { color: "#b8c5c8", border: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.035)" };
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
  const [fullEmailOpen, setFullEmailOpen] = useState<Record<string, boolean>>({});
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
    void loadApprovals();
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
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Approval inbox - {pending.length} waiting</span>
          <h1>Approvals</h1>
          <div className="os-page-sub">Review and approve AI operator outputs before they execute or send.</div>
        </div>
        <div className="os-page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/logs")}>History</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={approveAll}
            disabled={visible.length === 0 || Boolean(busyId)}
            style={{ opacity: visible.length === 0 || busyId ? 0.4 : 1 }}
          >
            <CheckIcon size={12} /> Approve all
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Pending", val: String(pending.length), sub: "from database" },
          { label: "Approved today", val: String(approvedToday), sub: "resolved in DB today" },
          { label: "Avg. review time", val: "-", sub: "not tracked yet" },
          { label: "Auto-approved (7d)", val: "-", sub: "not enabled" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {FILTER_TABS.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`appr-btn${filter === t ? " approve" : " edit"}`} style={{ fontSize: 11.5, padding: "5px 12px" }}>
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <div className="p">
        <div className="p-head">
          <h3><InboxIcon size={13} /> Pending review</h3>
          <div className="p-meta">
            {pending.length > 0
              ? <><span className="dot dot-cyan pulsing" /> {pending.length} waiting</>
              : <><span className="dot" style={{ background: "var(--green)" }} /> All clear</>
            }
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
            Loading approvals...
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              <CheckIcon size={28} style={{ color: "var(--green)", margin: "0 auto" }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>All caught up</div>
            <div style={{ fontSize: 13, color: "var(--text-mute)" }}>No pending approvals{filter !== "All" ? ` in "${filter}"` : ""}.</div>
          </div>
        ) : (
          visible.map((item) => {
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
            const crmStatus = item.payload_preview.crmStatusText
              ?? (item.payload_preview.crmPreparationStatus === "hubspot_not_connected"
                ? "CRM update not prepared because HubSpot is not connected."
                : item.payload_preview.crmPreparationStatus === "hubspot_execution_not_ready"
                  ? "HubSpot actions are prepared but not executed yet."
                  : item.payload_preview.crmPreparationStatus === "hubspot_execution_enabled"
                    ? "HubSpot contact and deal updates will execute after approval. Notes and tasks remain prepared only."
                  : null);
            const rejectionReason = rejectReasons[item.id] ?? "Needs manual review";
            const hubspotPreview = item.payload_preview.preparedHubSpotActions;
            const showDetails = Boolean(detailsOpen[item.id]);
            const showFullEmail = Boolean(fullEmailOpen[item.id]);
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
            const hubspotActionSummary = item.payload_preview.crmPreparationStatus === "hubspot_not_connected"
              ? "not prepared because HubSpot is not connected"
              : item.payload_preview.crmPreparationStatus === "hubspot_execution_enabled"
                ? "contact/deal will be created or updated after approval"
                : "prepared only";
            const executionItems = [
              { label: "Gmail", text: "Reply sends after approval", status: "ready" as const },
              {
                label: "HubSpot",
                text: hubspotActionSummary,
                status: item.payload_preview.crmPreparationStatus === "hubspot_execution_enabled"
                  ? "ready" as const
                  : item.payload_preview.crmPreparationStatus === "hubspot_not_connected"
                    ? "blocked" as const
                    : "prepared" as const,
              },
              { label: "Note", text: "Prepared only", status: "prepared" as const },
              { label: "Task", text: "Prepared only", status: "prepared" as const },
            ];
            const customerEmailMode = item.payload_preview.customerEmailPolicy?.mode ?? "approval_required";
            const policyItems = [
              { label: "Customer email", value: customerEmailMode === "draft_only" ? "Draft only" : "Approval required" },
              { label: "Slack alert", value: item.payload_preview.customerEmailPolicy?.slackAlert ?? "Disabled" },
              { label: "CRM update", value: item.payload_preview.customerEmailPolicy?.crmUpdate ?? "Approval required" },
              { label: "Human review", value: item.payload_preview.customerEmailPolicy?.humanReview ?? "Required" },
            ];

            return (
              <div key={item.id} className="appr-row">
                <div className="appr-row-top">
                  <span className={`pill ${tagClass(category)}`}>{category}</span>
                  <span className="appr-row-title">{item.title}</span>
                </div>
                <div className="appr-row-from">{operatorName} - {timeAgo(item.created_at)}</div>
                <div className="appr-row-body">{item.description}</div>
                <div style={{ marginTop: 12, padding: revenueApproval ? "0" : "9px 10px", borderRadius: revenueApproval ? 18 : 8, background: revenueApproval ? "linear-gradient(145deg, rgba(255,255,255,0.055), rgba(77,232,225,0.025) 45%, rgba(0,0,0,0.12))" : "rgba(255,255,255,0.025)", boxShadow: revenueApproval ? "inset 0 0 0 1px rgba(255,255,255,0.09), 0 18px 60px rgba(0,0,0,0.22)" : "inset 0 0 0 1px var(--line)", overflow: "hidden", display: "grid", gap: revenueApproval ? 0 : 4 }}>
                  {revenueApproval && (
                    <>
                      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.075)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#4DE8E1", boxShadow: "0 0 18px rgba(77,232,225,0.72)" }} />
                          <span style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 650 }}>{operatorName}</span>
                          <span style={{ color: "var(--text-mute)", fontSize: 11 }}>prepared an email for approval</span>
                          {item.payload_preview.wasEdited && <span className="pill pill-amber" style={{ fontSize: 10.5 }}>Edited</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                          <span className="pill pill-cyan" style={{ fontSize: 10.5 }}>Gmail send after approval</span>
                          {item.payload_preview.crmPreparationStatus === "hubspot_execution_enabled" && <span className="pill pill-cyan" style={{ fontSize: 10.5 }}>HubSpot contact/deal after approval</span>}
                          <span style={{ fontSize: 10.5, color: "#8df5cf", fontWeight: 700, letterSpacing: "0.08em" }}>{confidenceLabel(item.payload_preview.confidence)}</span>
                        </div>
                      </div>

                      <div style={{ margin: "14px 18px 12px", borderRadius: 16, background: "linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.024))", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09), 0 12px 36px rgba(0,0,0,0.16)", overflow: "hidden" }}>
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.075)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Email draft</div>
                            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Review and edit the full email before approving.</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            {item.payload_preview.wasEdited && <span className="pill pill-amber" style={{ fontSize: 10.5 }}>Edited</span>}
                            {!draftEdit && (
                              <button className="appr-btn edit" type="button" onClick={() => startEditingDraft(item)}>Edit draft</button>
                            )}
                          </div>
                        </div>
                        <div style={{ padding: "14px 16px" }}>
                        {draftEdit ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Subject</span>
                            <input
                              value={draftEdit.subject}
                              onChange={(event) => setEditingDrafts((current) => ({ ...current, [item.id]: { ...draftEdit, subject: event.target.value } }))}
                              disabled={isSavingEdit}
                                style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.11)", background: "rgba(0,0,0,0.24)", color: "var(--text)", padding: "10px 11px", fontSize: 13 }}
                            />
                            </label>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Body</span>
                            <textarea
                              value={draftEdit.body}
                              onChange={(event) => setEditingDrafts((current) => ({ ...current, [item.id]: { ...draftEdit, body: event.target.value } }))}
                              disabled={isSavingEdit}
                              rows={12}
                                style={{ width: "100%", resize: "vertical", borderRadius: 12, border: "1px solid rgba(255,255,255,0.11)", background: "rgba(0,0,0,0.24)", color: "var(--text)", padding: "12px 13px", fontSize: 13, lineHeight: 1.62 }}
                            />
                            </label>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button className="appr-btn approve" type="button" disabled={isSavingEdit} onClick={() => saveDraftEdit(item)}>{isSavingEdit ? "Saving..." : "Save changes"}</button>
                              <button className="appr-btn edit" type="button" disabled={isSavingEdit} onClick={() => cancelEditingDraft(item.id)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.payload_preview.subject && (
                              <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 650, marginBottom: 10, letterSpacing: "-0.01em" }}>{item.payload_preview.subject}</div>
                            )}
                            <div style={{ fontSize: 13, color: "var(--text-dim)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                              {item.payload_preview.fullBody || item.payload_preview.body || "-"}
                            </div>
                          </>
                        )}
                        </div>
                      </div>

                      <div style={{ margin: "0 18px 14px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                        {policyItems.map((policy) => (
                          <div key={policy.label} style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{policy.label}</div>
                            <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>{policy.value}</div>
                          </div>
                        ))}
                      </div>
                      {customerEmailMode === "draft_only" && (
                        <div style={{ margin: "0 18px 14px", padding: "9px 10px", borderRadius: 10, background: "rgba(245,194,107,0.08)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.22)", color: "var(--amber)", fontSize: 12 }}>
                          Draft only mode. This email will not be sent automatically.
                        </div>
                      )}

                      <button
                        className="appr-btn edit"
                        type="button"
                        onClick={() => setDetailsOpen((current) => ({ ...current, [item.id]: !current[item.id] }))}
                        style={{ width: "fit-content", fontSize: 11.5, margin: "0 18px 16px" }}
                      >
                        {showDetails ? "Hide full details" : "View full details"}
                      </button>

                      {showDetails && (
                        <div style={{ margin: "0 18px 16px", padding: "13px", borderRadius: 14, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)", display: "grid", gap: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                            {[
                              { label: "Lead source", value: "Auterim OS" },
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
                              <div key={field.label} style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)", minWidth: 0 }}>
                                <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{field.label}</div>
                                <div style={{ fontSize: 12.5, color: "var(--text)", overflowWrap: "anywhere" }}>{field.value}</div>
                              </div>
                            ))}
                          </div>

                          {hubspotPreview && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                          <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>HubSpot contact</div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--text)" }}>{valueOrDash([hubspotPreview.contact?.firstname, hubspotPreview.contact?.lastname].filter(Boolean).join(" ") || null)}</strong><br />
                              {valueOrDash(hubspotPreview.contact?.email)}<br />
                              Source: {valueOrDash(hubspotPreview.contact?.source)}
                            </div>
                          </div>
                          <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>HubSpot deal</div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--text)" }}>{valueOrDash(hubspotPreview.deal?.dealname)}</strong><br />
                              Stage: {valueOrDash(hubspotPreview.deal?.stageLabel)}<br />
                              Pipeline: {valueOrDash(hubspotPreview.deal?.pipelineLabel)}
                            </div>
                          </div>
                          <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>CRM note</div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{valueOrDash(hubspotPreview.note?.body)}</div>
                            <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-mute)" }}>Prepared only in this version.</div>
                          </div>
                          <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Follow-up task</div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
                              <strong style={{ color: "var(--text)" }}>{valueOrDash(hubspotPreview.task?.title)}</strong><br />
                              Due: {valueOrDash(hubspotPreview.task?.dueSuggestion)}<br />
                              Type: {valueOrDash(hubspotPreview.task?.type)}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-mute)" }}>Prepared only in this version.</div>
                          </div>
                        </div>
                          )}

                          {item.payload_preview.crmPreparation && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", display: "grid", gap: 4, paddingTop: 2 }}>
                          {item.payload_preview.crmPreparation.suggestedNextStep && (
                            <div><strong style={{ color: "var(--text)" }}>Suggested next step:</strong> {item.payload_preview.crmPreparation.suggestedNextStep}</div>
                          )}
                          {item.payload_preview.crmPreparation.suggestedDealStage && (
                            <div><strong style={{ color: "var(--text)" }}>Suggested deal stage:</strong> {item.payload_preview.crmPreparation.suggestedDealStage}</div>
                          )}
                          {item.payload_preview.crmPreparation.suggestedFollowUpTask && (
                            <div><strong style={{ color: "var(--text)" }}>Suggested task:</strong> {item.payload_preview.crmPreparation.suggestedFollowUpTask}</div>
                          )}
                        </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {sharedActionApproval && item.payload_preview.preparedAction && (
                    <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 650 }}>{item.payload_preview.preparedAction.preview?.label || item.payload_preview.preparedAction.title || "Prepared action"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>
                            Trello - Risk: {item.payload_preview.preparedAction.riskLevel || "medium"} - Requires approval
                          </div>
                        </div>
                        <span className="pill pill-cyan" style={{ fontSize: 10.5 }}>{item.payload_preview.preparedAction.actionType?.replace(/_/g, " ") || "task action"}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        {(item.payload_preview.preparedAction.preview?.fields ?? []).map((field) => (
                          <div key={field.label} style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{field.label}</div>
                            <div style={{ fontSize: 12.5, color: "var(--text)", overflowWrap: "anywhere" }}>{field.value}</div>
                          </div>
                        ))}
                      </div>
                      {item.payload_preview.preparedAction.preview?.bodyPreview && (
                        <div style={{ fontSize: 12.5, color: "var(--text-dim)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                          {item.payload_preview.preparedAction.preview.bodyPreview}
                        </div>
                      )}
                      {executionResult.status === "executed" && (
                        <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(81,216,138,0.08)", boxShadow: "inset 0 0 0 1px rgba(81,216,138,0.22)", color: "#8df5cf", fontSize: 12 }}>
                          Trello card created{typeof sharedActionResult.cardUrl === "string" && sharedActionResult.cardUrl ? (
                            <> - <a className="lnk-open" href={sharedActionResult.cardUrl} target="_blank" rel="noreferrer">Open card</a></>
                          ) : "."}
                        </div>
                      )}
                    </div>
                  )}
                  {operationsApproval && operations && (
                    <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 650 }}>{operations.cardName || operations.listName || "Operational signal"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>
                            {operations.boardName ? `${operations.boardName} / ` : ""}{operations.listName || "-"} Â· {(operations.signalType || "signal").replace(/_/g, " ")}
                          </div>
                        </div>
                        <span className="pill pill-cyan" style={{ fontSize: 10.5 }}>Severity: {operations.severity || "medium"}</span>
                      </div>
                      {operations.plainEnglishSummary && (
                        <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{operations.plainEnglishSummary}</div>
                      )}
                      {operations.recommendedAction && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)" }}><strong style={{ color: "var(--text)" }}>Recommended:</strong> {operations.recommendedAction}</div>
                      )}
                      {operations.preparedSlackMessage && (
                        <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                          <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Prepared Slack message</div>
                          <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap" }}>{operations.preparedSlackMessage}</div>
                        </div>
                      )}
                      {item.payload_preview.preparedTrelloAction && (
                        <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                          <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Prepared Trello action</div>
                          <div style={{ fontSize: 12.5, color: "var(--text)" }}>{(item.payload_preview.preparedTrelloAction.actionType || "task action").replace(/_/g, " ")}: {item.payload_preview.preparedTrelloAction.preview?.bodyPreview || item.payload_preview.preparedTrelloAction.title || operations.cardName}</div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className="pill" style={{ fontSize: 10 }}>Slack message: {item.payload_preview.operationsPolicy?.slackMessage || "Approval required"}</span>
                        <span className="pill" style={{ fontSize: 10 }}>Trello update: {item.payload_preview.operationsPolicy?.trelloUpdate || "Approval required"}</span>
                        <span className="pill" style={{ fontSize: 10 }}>Human review: {item.payload_preview.operationsPolicy?.humanReview || "Required"}</span>
                      </div>
                      {operations.cardUrl && (
                        <a className="lnk-open" href={operations.cardUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Open Trello card</a>
                      )}
                      {(operationsExecution.slackStatus === "sent" || operationsExecution.trelloStatus === "executed") && (
                        <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(81,216,138,0.08)", boxShadow: "inset 0 0 0 1px rgba(81,216,138,0.22)", color: "#8df5cf", fontSize: 12 }}>
                          {operationsExecution.slackStatus === "sent" ? "Slack update sent. " : ""}{operationsExecution.trelloStatus === "executed" ? "Trello action applied." : ""}
                          {typeof operationsExecution.cardUrl === "string" && operationsExecution.cardUrl ? (
                            <> <a className="lnk-open" href={operationsExecution.cardUrl} target="_blank" rel="noreferrer">Open card</a></>
                          ) : ""}
                        </div>
                      )}
                    </div>
                  )}
                  {!revenueApproval && !operationsApproval && item.payload_preview.to && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Recipient:" : "To:"}</strong> {item.payload_preview.to}
                    </div>
                  )}
                  {!revenueApproval && item.payload_preview.subject && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Draft subject:" : "Subject:"}</strong> {item.payload_preview.subject}
                    </div>
                  )}
                  {!revenueApproval && item.payload_preview.body && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Draft body:" : "Body:"}</strong> {item.payload_preview.body}
                    </div>
                  )}
                  {!revenueApproval && (item.payload_preview.approvalReason || item.policy_reason) && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>Approval reason:</strong> {item.payload_preview.approvalReason || item.policy_reason}
                    </div>
                  )}
                  {!revenueApproval && preparedActions.length > 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>Prepared actions:</strong> {preparedActions.map(actionLabel).join(" / ")}
                    </div>
                  )}
                  {!revenueApproval && item.payload_preview.crmPreparationStatus === "hubspot_not_connected" && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      CRM update not prepared because HubSpot is not connected.
                    </div>
                  )}
                  {!revenueApproval && item.payload_preview.crmPreparationStatus === "hubspot_execution_not_ready" && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>CRM:</strong> HubSpot update prepared, execution not implemented yet.
                    </div>
                  )}
                  {!revenueApproval && item.payload_preview.crmPreparation && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>CRM summary:</strong> {item.payload_preview.crmPreparation.summary}
                    </div>
                  )}
                  {revenueApproval && showDetails && item.payload_preview.whatHappensAfterApproval && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", paddingTop: 2 }}>
                      <strong style={{ color: "var(--text)" }}>What happens after approval:</strong> {item.payload_preview.whatHappensAfterApproval}
                    </div>
                  )}
                  {item.linked_run_id && (!revenueApproval || showDetails) && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      Run: {item.linked_run_id}
                    </div>
                  )}
                </div>
                {item.payload_preview.livePolicyDecision && (() => {
                  const d = item.payload_preview.livePolicyDecision;
                  const exec = recordValue(item.payload_preview.executionResult);
                  const tone = d.decision === "blocked" ? "var(--rose)" : d.decision === "allow_auto" ? "var(--green)" : "var(--amber)";
                  const postExec = exec.policyDecision || exec.gmailStatus === "blocked_by_policy" || exec.slackStatus === "blocked_by_policy" || exec.trelloStatus === "blocked_by_policy";
                  const execNote = item.status === "pending"
                    ? "Rechecked live before execution."
                    : exec.gmailStatus === "blocked_by_policy" || exec.slackStatus === "blocked_by_policy" || exec.trelloStatus === "blocked_by_policy" || exec.status === "blocked_by_policy"
                      ? "Blocked by updated policy."
                      : exec.gmailStatus === "draft_only_not_sent"
                        ? "Draft-only due to policy. Not sent."
                        : "Executed under live policy.";
                  return (
                    <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: `inset 0 0 0 1px ${tone === "var(--green)" ? "rgba(81,216,138,0.22)" : tone === "var(--rose)" ? "rgba(242,118,124,0.22)" : "rgba(245,194,107,0.22)"}`, display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Policy</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tone }}>{d.userFacingLabel}</span>
                        <span className="pill" style={{ fontSize: 10 }}>Risk: {d.riskLevel}</span>
                        {d.requiresHumanReview && <span className="pill" style={{ fontSize: 10 }}>Human review required</span>}
                        <span style={{ fontSize: 10.5, color: postExec && item.status !== "pending" ? tone : "var(--text-mute)" }}>{execNote}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{d.reason} <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>({d.matchedRuleId})</span></div>
                    </div>
                  );
                })()}
                <div style={{ marginTop: 12, padding: "11px 12px", borderRadius: 14, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.065)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 280 }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>Reject reason</span>
                    <select
                      value={rejectionReason}
                      onChange={(event) => setRejectReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                      style={{ minWidth: 190, background: "rgba(255,255,255,0.045)", color: "var(--text-dim)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 10px", fontSize: 12 }}
                    >
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </label>
                  <div className="appr-row-actions" style={{ marginTop: 0 }}>
                    <button className="appr-btn deny" disabled={isBusy || isSavingEdit} onClick={() => actOnApproval(item, "reject", rejectionReason)}>Reject</button>
                    <button className="appr-btn edit" disabled={isBusy || isSavingEdit} onClick={() => startEditingDraft(item)}>Edit draft</button>
                    <button className="appr-btn approve" disabled={isBusy || isSavingEdit} onClick={() => actOnApproval(item, "approve")}>
                      {customerEmailMode === "draft_only" ? "Mark reviewed" : item.approval_type === "email" ? "Approve and send" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-dim)" }}>Approval policy:</strong> Outbound communications require manual approval before execution. This inbox now reads real workspace approvals from the database.{" "}
        <button className="lnk-open" style={{ fontSize: 12.5 }} onClick={() => router.push("/policies")}>Edit policies</button>
      </div>
    </div>
  );
}
