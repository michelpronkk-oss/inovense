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
    operatorKey: string | null;
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
    expectedOutcome?: string | null;
    approvalReason?: string | null;
    whatHappensAfterApproval?: string | null;
    crmPreparation?: {
      contactEmail?: string;
      contactName?: string | null;
      companyName?: string | null;
      classification?: string;
      confidence?: string;
      summary?: string;
      suggestedNextStep?: string;
      suggestedDealStage?: string;
      suggestedFollowUpTask?: string;
      matchedKeywords?: string[];
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

function isRevenueApproval(item: ApprovalRow): boolean {
  return item.payload_preview.operatorKey === "revenue" || item.agent_id === "revenue";
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
    return resolved.filter((a) => a.status === "approved" && a.resolved_at?.startsWith(today)).length;
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
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/logs")}>History</button>
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
            const preparedActions = item.payload_preview.preparedActions ?? [];
            const crmStatus = item.payload_preview.crmStatusText
              ?? (item.payload_preview.crmPreparationStatus === "hubspot_not_connected"
                ? "CRM update not prepared because HubSpot is not connected."
                : item.payload_preview.crmPreparationStatus === "hubspot_execution_not_ready"
                  ? "HubSpot actions are prepared but not executed yet."
                  : null);
            const rejectionReason = rejectReasons[item.id] ?? "Needs manual review";

            return (
              <div key={item.id} className="appr-row">
                <div className="appr-row-top">
                  <span className={`pill ${tagClass(category)}`}>{category}</span>
                  <span className="appr-row-title">{item.title}</span>
                </div>
                <div className="appr-row-from">{operatorName} - {timeAgo(item.created_at)}</div>
                <div className="appr-row-body">{item.description}</div>
                <div style={{ marginTop: 10, padding: revenueApproval ? "14px" : "9px 10px", borderRadius: revenueApproval ? 14 : 8, background: revenueApproval ? "linear-gradient(135deg, rgba(77,232,225,0.06), rgba(255,255,255,0.025))" : "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: revenueApproval ? 12 : 4 }}>
                  {revenueApproval && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                        {[
                          { label: "Detected signal", value: valueOrDash(item.payload_preview.detectedSignal) },
                          { label: "Source email", value: valueOrDash(item.payload_preview.sourceEmail) },
                          { label: "Classification", value: valueOrDash(item.payload_preview.classification) },
                          { label: "Confidence", value: valueOrDash(item.payload_preview.confidence) },
                        ].map((field) => (
                          <div key={field.label} style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(0,0,0,0.16)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)", minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{field.label}</div>
                            <div style={{ fontSize: 12.5, color: "var(--text)", overflowWrap: "anywhere" }}>{field.value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 10 }}>
                        <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                          <div style={{ fontSize: 11, color: "var(--text-mute)", marginBottom: 5 }}>Why this matters</div>
                          <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.55 }}>
                            {item.payload_preview.whyThisMatters || "Revenue Operator detected a high-confidence inbound revenue signal and prepared an approval-gated follow-up."}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)" }}>
                          <div style={{ fontSize: 11, color: "var(--text-mute)", marginBottom: 5 }}>Risk / expected outcome</div>
                          <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.55 }}>
                            <strong style={{ color: "var(--text)" }}>Risk:</strong> {valueOrDash(item.payload_preview.riskLevel)}<br />
                            {item.payload_preview.expectedOutcome || "Approval records the decision and executes only the approved action."}
                          </div>
                        </div>
                      </div>

                      {preparedActions.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {preparedActions.map((action) => (
                            <span key={action} className="pill pill-cyan" style={{ fontSize: 11 }}>{actionLabel(action)}</span>
                          ))}
                        </div>
                      )}

                      {crmStatus && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.025)" }}>
                          {crmStatus}
                        </div>
                      )}

                      {item.payload_preview.crmPreparation && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", display: "grid", gap: 4 }}>
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
                    </>
                  )}
                  {item.payload_preview.to && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Recipient:" : "To:"}</strong> {item.payload_preview.to}
                    </div>
                  )}
                  {item.payload_preview.subject && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Draft subject:" : "Subject:"}</strong> {item.payload_preview.subject}
                    </div>
                  )}
                  {item.payload_preview.body && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}>
                      <strong style={{ color: "var(--text)" }}>{revenueApproval ? "Draft body:" : "Body:"}</strong> {item.payload_preview.body}
                    </div>
                  )}
                  {(item.payload_preview.approvalReason || item.policy_reason) && (
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
                  {revenueApproval && item.payload_preview.whatHappensAfterApproval && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", paddingTop: 2 }}>
                      <strong style={{ color: "var(--text)" }}>What happens after approval:</strong> {item.payload_preview.whatHappensAfterApproval}
                    </div>
                  )}
                  {item.linked_run_id && (
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      Run: {item.linked_run_id}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Reject reason</span>
                  <select
                    value={rejectionReason}
                    onChange={(event) => setRejectReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", border: "1px solid var(--line)", borderRadius: 9, padding: "7px 9px", fontSize: 12 }}
                  >
                    {REJECTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
                <div className="appr-row-actions">
                  <button className="appr-btn approve" disabled={isBusy} onClick={() => actOnApproval(item, "approve")}>
                    {item.approval_type === "email" ? "Approve and send" : "Approve"}
                  </button>
                  <button className="appr-btn edit" disabled aria-disabled="true" title="Inline editor is coming soon">Edit</button>
                  <button className="appr-btn deny" disabled={isBusy} onClick={() => actOnApproval(item, "reject", rejectionReason)}>Reject</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-dim)" }}>Approval policy:</strong> Outbound communications require manual approval before execution. This inbox now reads real workspace approvals from the database.{" "}
        <button className="lnk-open" style={{ fontSize: 12.5 }} onClick={() => router.push("/app/policies")}>Edit policies</button>
      </div>
    </div>
  );
}
