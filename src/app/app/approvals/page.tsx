"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { InboxIcon, CheckIcon } from "@/components/dashboard/icons";

const FILTER_TABS = ["All", "Proposal", "Follow-up", "Campaign", "Report"];

function tagClass(type: string): string {
  if (type === "proposal") return "pill-cyan";
  if (type === "campaign") return "pill-rose";
  return "pill-amber";
}

export default function ApprovalsPage() {
  const { state, approveItem, skipItem } = useOS();
  const router = useRouter();
  const [filter, setFilter] = useState("All");

  const pending = state.approvals.filter((a) => a.status === "pending");
  const resolved = state.approvals.filter((a) => a.status !== "pending");

  const visible = pending.filter((a) =>
    filter === "All" || a.type === filter.toLowerCase().replace("-", "-")
  );

  const approveAll = () => {
    visible.forEach((a) => approveItem(a.id, a.runId, a.agentId));
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
            disabled={visible.length === 0}
            style={{ opacity: visible.length === 0 ? 0.4 : 1 }}
          >
            <CheckIcon size={12} /> Approve all
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Pending", val: String(pending.length), sub: "across all operators" },
          { label: "Approved today", val: String(resolved.filter((a) => a.status === "approved").length + 12), sub: "since session start" },
          { label: "Avg. review time", val: "4m 12s", sub: "median per item" },
          { label: "Auto-approved (7d)", val: "84", sub: "within policy bounds" },
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
        {visible.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              <CheckIcon size={28} style={{ color: "var(--green)", margin: "0 auto" }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>All caught up</div>
            <div style={{ fontSize: 13, color: "var(--text-mute)" }}>No pending approvals{filter !== "All" ? ` in "${filter}"` : ""}.</div>
          </div>
        ) : (
          visible.map((item) => {
            const agentName = state.agents.find((a) => a.id === item.agentId)?.name ?? item.agentMark;
            const timeAgo = (() => {
              const diff = Date.now() - new Date(item.createdAt).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 60) return `${mins}m ago`;
              return `${Math.floor(mins / 60)}h ago`;
            })();

            return (
              <div key={item.id} className="appr-row">
                <div className="appr-row-top">
                  <span className={`pill ${tagClass(item.type)}`}>{item.type}</span>
                  <span className="appr-row-title">{item.title}</span>
                </div>
                <div className="appr-row-from">{agentName} - {timeAgo}</div>
                <div className="appr-row-body">{item.body}</div>
                {(item.proposedAction || item.draftOutput || (item.policyChecks?.length ?? 0) > 0) && (
                  <div style={{ marginTop: 8, padding: "9px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 4 }}>
                    {item.proposedAction && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        <strong style={{ color: "var(--text)" }}>Proposed action:</strong> {item.proposedAction}
                      </div>
                    )}
                    {item.draftOutput && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        <strong style={{ color: "var(--text)" }}>Draft:</strong> {item.draftOutput}
                      </div>
                    )}
                    {(item.policyChecks?.length ?? 0) > 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        <strong style={{ color: "var(--text)" }}>Policy checks:</strong> {item.policyChecks?.join(" | ")}
                      </div>
                    )}
                  </div>
                )}
                <div className="appr-row-actions">
                  <button className="appr-btn approve" onClick={() => approveItem(item.id, item.runId, item.agentId)}>
                    {item.type === "email" ? "Approve and send" : "Approve"}
                  </button>
                  <button className="appr-btn edit" disabled aria-disabled="true" title="Inline editor is coming soon">Edit</button>
                  <button className="appr-btn deny" onClick={() => skipItem(item.id, item.runId, item.agentId)}>Skip</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-dim)" }}>Approval policy:</strong> All outbound communications, proposals, and campaign launches require manual approval. Internal reports and digests can be auto-approved if within defined parameters.{" "}
        <button className="lnk-open" style={{ fontSize: 12.5 }} onClick={() => router.push("/app/policies")}>Edit policies</button>
      </div>
    </div>
  );
}
