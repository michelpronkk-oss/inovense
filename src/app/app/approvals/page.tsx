"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/product-ui/page-primitives";
import { useOS } from "@/lib/os/app-provider";
import { InboxIcon, CheckIcon } from "@/components/dashboard/icons";
import type { ApprovalPresentationError, ApprovalRow, ApprovalsResponse, DraftEdit } from "./types";
import { deriveApprovalPresentation } from "./derive";
import { describeApprovalError } from "./errorMessages";
import { ApprovalQueueRow } from "./ApprovalQueueRow";
import { ApprovalExpandedReview } from "./ApprovalExpandedReview";
import { matchesFilter, timeAgo } from "./utils";

const FILTER_TABS = ["All", "Email", "Follow-up", "Action"];

export default function ApprovalsPage() {
  const { state } = useOS();
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [approvalPresentationError, setApprovalPresentationError] = useState<ApprovalPresentationError | null>(null);
  const [expandedApprovalId, setExpandedApprovalId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [rejectingIds, setRejectingIds] = useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [editingDrafts, setEditingDrafts] = useState<Record<string, DraftEdit>>({});
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
      setApprovalPresentationError(null);
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

  const actOnApproval = async (item: ApprovalRow, action: "approve" | "reject", reason?: string) => {
    setBusyId(item.id);
    setBusyAction(action);
    setError("");
    setApprovalPresentationError(null);
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
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string; replacementApprovalId?: string };
      if (!res.ok) {
        if (json.error === "approval_scope_changed") {
          // A real scope change creates a new pending approval. It is never
          // silently approved; load it and put the reviewer directly on the
          // fresh version instead of leaving them at a stale dead end.
          if (json.replacementApprovalId) {
            setError("The action changed, so Auterim prepared a new approval for review.");
            await loadApprovals();
            setExpandedApprovalId(json.replacementApprovalId);
            return;
          }
          setApprovalPresentationError({
            itemId: item.id,
            code: json.error,
            message: json.message || "The prepared action or its business context changed after this approval was created.",
          });
        } else {
          setApprovalPresentationError({
            itemId: item.id,
            code: json.error || "unknown_error",
            message: json.message || json.error || `Could not ${action} approval.`,
          });
        }
        return;
      }
      setExpandedApprovalId(null);
      setRejectingIds((current) => ({ ...current, [item.id]: false }));
      await loadApprovals();
    } catch {
      setApprovalPresentationError({ itemId: item.id, code: "network_error", message: `Could not ${action} approval.` });
    } finally {
      setBusyId(null);
      setBusyAction(null);
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
  };

  const cancelEditingDraft = (id: string) => {
    setEditingDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const reviewUpdatedAction = (item: ApprovalRow) => {
    startEditingDraft(item);
    window.requestAnimationFrame(() => {
      document.getElementById(`approval-email-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const refreshAndReviewAction = async (itemId: string) => {
    setDetailsOpen((current) => ({ ...current, [itemId]: true }));
    await loadApprovals();
    document.getElementById(`approval-review-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        eyebrow="Approval inbox"
        title="Approvals"
        description="Review actions before they run."
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/logs")}>History</button>
          <button
            className="btn btn-ghost btn-sm approval-bulk-action"
            onClick={approveAll}
            disabled={visible.length === 0 || Boolean(busyId) || Object.keys(editingDrafts).length > 0}
            style={{ opacity: visible.length === 0 || busyId || Object.keys(editingDrafts).length > 0 ? 0.4 : 1 }}
          >
            <CheckIcon size={12} /> Approve all
          </button>
        </>}
      />

      <div className="sec-head">
        <div className="inline">
          {FILTER_TABS.map((t) => (
            <button key={t} aria-pressed={filter === t} onClick={() => { setExpandedApprovalId(null); setFilter(t); }} className={`filter${filter === t ? " on" : ""}`}>
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

      <div className="card approval-inbox-shell">
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
              const presentation = deriveApprovalPresentation(item);
              const isBusy = busyId === item.id;
              const isExpanded = expandedApprovalId === item.id;
              const isSavingEdit = savingEditId === item.id;
              const draftEdit = editingDrafts[item.id];
              const isRejecting = Boolean(rejectingIds[item.id]);
              const rejectReason = rejectReasons[item.id] ?? presentation.defaultRejectReason;
              const approvalErrorForItem = approvalPresentationError?.itemId === item.id ? approvalPresentationError : null;
              const friendlyError = approvalErrorForItem ? describeApprovalError(approvalErrorForItem.code, approvalErrorForItem.message) : null;

              return (
                <article id={`approval-review-${item.id}`} key={item.id} className={`approval-queue-item${isExpanded ? " is-expanded" : ""}`}>
                  <ApprovalQueueRow
                    item={item}
                    presentation={presentation}
                    isExpanded={isExpanded}
                    isBusy={isBusy}
                    busyAction={busyAction}
                    hasError={Boolean(approvalErrorForItem)}
                    onToggle={() => {
                      setDetailsOpen((current) => ({ ...current, [item.id]: false }));
                      setExpandedApprovalId((current) => current === item.id ? null : item.id);
                    }}
                  />

                  {isExpanded && (
                    <div className="approval-expanded-panel">
                      <ApprovalExpandedReview
                        item={item}
                        presentation={presentation}
                        draftEdit={draftEdit}
                        isSavingEdit={isSavingEdit}
                        onChangeDraft={(next) => setEditingDrafts((current) => ({ ...current, [item.id]: next }))}
                        onStartEdit={() => startEditingDraft(item)}
                        onSaveDraft={() => saveDraftEdit(item)}
                        onCancelEdit={() => cancelEditingDraft(item.id)}
                        isBusy={isBusy}
                        busyAction={busyAction}
                        friendlyError={friendlyError}
                        rawErrorCode={approvalErrorForItem?.code ?? null}
                        rawErrorMessage={approvalErrorForItem?.message ?? null}
                        isRejecting={isRejecting}
                        rejectReason={rejectReason}
                        onStartReject={() => setRejectingIds((current) => ({ ...current, [item.id]: true }))}
                        onCancelReject={() => setRejectingIds((current) => ({ ...current, [item.id]: false }))}
                        onChangeRejectReason={(reason) => setRejectReasons((current) => ({ ...current, [item.id]: reason }))}
                        onConfirmReject={() => actOnApproval(item, "reject", rejectReason)}
                        onApprove={() => actOnApproval(item, "approve")}
                        onErrorPrimaryAction={() => {
                          if (approvalErrorForItem?.code !== "approval_scope_changed") { void loadApprovals(); return; }
                          if (presentation.kind === "email") reviewUpdatedAction(item);
                          else void refreshAndReviewAction(item.id);
                        }}
                        detailsOpen={Boolean(detailsOpen[item.id])}
                        onToggleDetails={() => setDetailsOpen((current) => ({ ...current, [item.id]: !current[item.id] }))}
                      />
                    </div>
                  )}
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
