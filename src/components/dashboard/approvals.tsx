"use client";

import { useState } from "react";
import { InboxIcon } from "@/components/dashboard/icons";

const INITIAL = [
  { id: 1, tag: "proposal", tagCls: "pill-cyan", title: "Proposal - Northwind onboarding kit", from: "Client Flow Operator · 4m ago", body: "Draft includes pricing, SOW, kickoff checklist. Memory: Acme Industries (similar scope)." },
  { id: 2, tag: "follow-up", tagCls: "pill-amber", title: "Reply to Aiko Tanaka - intro thread", from: "Revenue Operator · 11m ago", body: "Proposes Tue 2pm slot. Stage: intro to discovery. Includes 2 case studies." },
  { id: 3, tag: "campaign", tagCls: "pill-rose", title: "Outbound launch - Q3 industry list", from: "Marketing Operator · 28m ago", body: "320 contacts, 3 segments. Will pause if reply rate below 4% within 48h." },
];

export function ApprovalsList() {
  const [items, setItems] = useState(INITIAL);

  const dismiss = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));

  return (
    <div className="p">
      <div className="p-head">
        <h3><InboxIcon size={13} /> Approval inbox</h3>
        <div className="p-meta">
          {items.length > 0
            ? <><span className="dot dot-cyan pulsing" /> {items.length} waiting</>
            : <><span className="dot" style={{ background: "var(--green)" }} /> All clear</>
          }
        </div>
      </div>
      <div>
        {items.length === 0 ? (
          <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
            All approvals reviewed.
          </div>
        ) : (
          items.map((it) => (
            <div className="appr-row" key={it.id}>
              <div className="appr-row-top">
                <span className={`pill ${it.tagCls}`}>{it.tag}</span>
                <span className="appr-row-title">{it.title}</span>
              </div>
              <div className="appr-row-from">{it.from}</div>
              <div className="appr-row-body">{it.body}</div>
              <div className="appr-row-actions">
                <button className="appr-btn approve" onClick={() => dismiss(it.id)}>Approve</button>
                <button className="appr-btn edit">Edit</button>
                <button className="appr-btn deny" onClick={() => dismiss(it.id)}>Skip</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
