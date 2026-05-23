"use client";

import { useState } from "react";
import { CpuIcon, ZapIcon } from "@/components/dashboard/icons";

const OPERATORS = [
  { mark: "RV", color: "#4DE8E1", name: "Revenue Operator", tag: "Sales · Pipeline", task: "Drafting follow-ups for 14 leads in stage 2", status: "running", metric: "326 actions/wk", actions: ["Manage", "Output"] },
  { mark: "MK", color: "#A78BFA", name: "Marketing Operator", tag: "Content · SEO", task: "Generating Q3 campaign brief from research notes", status: "running", metric: "118 outputs/wk", actions: ["Manage", "Output"] },
  { mark: "CF", color: "#5B8DEF", name: "Client Flow Operator", tag: "Intake · Onboarding", task: "Awaiting approval - new client kit (Northwind Co.)", status: "awaiting", metric: "42 intakes/wk", actions: ["Review", "Manage"] },
  { mark: "OP", color: "#51D88A", name: "Operations Operator", tag: "Reports · Internal", task: "Compiling weekly summary across 6 channels", status: "running", metric: "9.2h saved/wk", actions: ["Manage", "Output"] },
];

const TABS = ["All", "Running", "Paused"];

export function OperatorsPanel() {
  const [tab, setTab] = useState("All");

  const visible = OPERATORS.filter((a) => tab === "All" || a.status === tab.toLowerCase() || (tab === "Paused" && a.status === "awaiting"));

  return (
    <div className="p">
      <div className="p-head">
        <h3><CpuIcon size={13} /> Active operators</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="p-tabs">
            {TABS.map((t) => (
              <span key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</span>
            ))}
          </div>
          <span className="p-meta">4 of 8 shown</span>
        </div>
      </div>
      <div className="ops-grid">
        {visible.map((a) => (
          <div className="ops-card" key={a.mark}>
            <div className="ops-card-head">
              <div className="ops-card-avatar" style={{ color: a.color, background: `linear-gradient(135deg, ${a.color}22, ${a.color}06)`, boxShadow: `inset 0 0 0 1px ${a.color}55` }}>
                {a.mark}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ops-card-name">{a.name}</div>
                <div className="ops-card-tag">{a.tag}</div>
              </div>
              <div className="ops-card-status">
                {a.status === "running" && <><span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} /><span style={{ color: a.color }}>Running</span></>}
                {a.status === "awaiting" && <><span className="dot dot-amber pulsing" /><span style={{ color: "var(--amber)" }}>Awaiting</span></>}
              </div>
            </div>
            <div className="ops-task">
              <ZapIcon size={12} style={{ color: a.color, flexShrink: 0 }} />
              <span>{a.task}</span>
            </div>
            <div className="ops-foot">
              <span className="ops-metric">
                <strong>{a.metric.split(" ")[0]}</strong>{a.metric.slice(a.metric.indexOf(" "))}
              </span>
              <div className="ops-actions">
                <span className="lnk cyan">{a.actions[0]}</span>
                <span className="lnk">{a.actions[1]}</span>
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
            No operators in this state.
          </div>
        )}
      </div>
    </div>
  );
}
