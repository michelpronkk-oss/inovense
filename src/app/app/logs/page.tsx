"use client";

import { useState, useMemo } from "react";
import { useOS } from "@/lib/os/app-provider";
import { DocIcon, FilterIcon } from "@/components/dashboard/icons";

const STATUS_COLOR: Record<string, string> = { ok: "#51D88A", warn: "#F5C26B", waiting: "#4DE8E1", error: "#F2767C" };

export default function LogsPage() {
  const { state } = useOS();
  const [agentFilter, setAgentFilter] = useState("All agents");
  const [eventFilter, setEventFilter] = useState("All events");


  const agentMarks = useMemo(() => {
    const marks = Array.from(new Set(state.logs.map((l) => l.agentMark)));
    return ["All agents", ...marks];
  }, [state.logs]);

  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(state.logs.map((l) => l.event)));
    return ["All events", ...types];
  }, [state.logs]);

  const filtered = state.logs.filter((l) =>
    (agentFilter === "All agents" || l.agentMark === agentFilter) &&
    (eventFilter === "All events" || l.event === eventFilter)
  );

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Execution layer - live</span>
          <h1>Execution logs</h1>
          <div className="os-page-sub">Real-time log stream across all operators. Every action, tool call, and output recorded.</div>
        </div>
        <div className="os-page-actions">
          <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Export is coming soon"><FilterIcon size={12} /> Export</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Agent</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {agentMarks.map((a) => (
            <button key={a} onClick={() => setAgentFilter(a)} className={`appr-btn${agentFilter === a ? " approve" : " edit"}`} style={{ fontSize: 10.5, padding: "4px 10px" }}>{a}</button>
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: 8 }}>Event</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {eventTypes.map((e) => (
            <button key={e} onClick={() => setEventFilter(e)} className={`appr-btn${eventFilter === e ? " approve" : " edit"}`} style={{ fontSize: 10.5, padding: "4px 10px" }}>{e}</button>
          ))}
        </div>
      </div>

      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><DocIcon size={13} /> Log stream</h3>
          <div className="p-meta">
            <span className="dot dot-cyan pulsing" /> {filtered.length} entries
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", minWidth: 840 }}>
          {filtered.map((l) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 22px 130px 1fr 60px 60px",
                gap: 12, alignItems: "center",
                padding: "9px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.025)",
                fontSize: 11.5,
              }}
            >
              <span style={{ color: "var(--text-faint)" }}>{l.ts}</span>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: `${l.agentColor}18`, boxShadow: `inset 0 0 0 1px ${l.agentColor}55`, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: l.agentColor }}>{l.agentMark}</span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "var(--text-mute)", boxShadow: "inset 0 0 0 1px var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {l.event}
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.message}</span>
              <span style={{ color: "var(--text-faint)", textAlign: "right" }}>{l.duration}</span>
              <span style={{ color: STATUS_COLOR[l.status] ?? "var(--text-dim)", textAlign: "right" }}>{l.status}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-mute)", fontSize: 13, fontFamily: "var(--font-sans)" }}>No log entries match current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
