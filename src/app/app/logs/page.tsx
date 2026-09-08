"use client";

import { useState, useMemo } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { Agent, ExecutionLog } from "@/lib/os/types";
import { DocIcon, FilterIcon } from "@/components/dashboard/icons";

const STATUS_COLOR: Record<string, string> = { ok: "#51D88A", warn: "#F5C26B", waiting: "#4DE8E1", error: "#F2767C" };

function formatEventKey(event: string): string {
  return event.replace(".nango.", ".");
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

function actorFor(log: ExecutionLog, agents: Agent[]): { label: string; detail: string; initials: string; color: string } {
  if (log.actorType === "user" && (log.actorDisplayName || log.actorEmail)) {
    const label = log.actorDisplayName || log.actorEmail || "Workspace member";
    return { label, detail: log.actorEmail ?? label, initials: initials(label), color: "#A78BFA" };
  }
  if (log.actorType === "operator") {
    const operator = agents.find((agent) => agent.id === log.agentId);
    const label = operator?.name ?? "Operator automation";
    return { label, detail: "Operator automation", initials: initials(label), color: operator?.color ?? "#5B8DEF" };
  }
  if (log.agentId && log.agentId !== "system" && log.agentMark !== "OS") {
    const operator = agents.find((agent) => agent.id === log.agentId);
    const label = operator?.name ?? `${log.agentMark} automation`;
    return { label, detail: "Operator automation", initials: initials(label), color: operator?.color ?? log.agentColor };
  }
  return { label: "Auterim system", detail: "System-generated event", initials: "A", color: "#4DE8E1" };
}

export default function LogsPage() {
  const { state } = useOS();
  const [agentFilter, setAgentFilter] = useState("All agents");
  const [eventFilter, setEventFilter] = useState("All events");
  const [visibleCount, setVisibleCount] = useState(10);


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
  const visibleLogs = filtered.slice(0, visibleCount);

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

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,0.018)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Agent</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {agentMarks.map((a) => (
            <button key={a} onClick={() => { setAgentFilter(a); setVisibleCount(10); }} className={`appr-btn${agentFilter === a ? " approve" : " edit"}`} style={{ fontSize: 10.5, padding: "4px 10px" }}>{a}</button>
          ))}
        </div>
        <span style={{ width: 1, height: 18, background: "var(--line)" }} aria-hidden="true" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Event</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {eventTypes.map((e) => (
            <button key={e} onClick={() => { setEventFilter(e); setVisibleCount(10); }} className={`appr-btn${eventFilter === e ? " approve" : " edit"}`} style={{ fontSize: 10.5, padding: "4px 10px" }}>{e === "All events" ? e : formatEventKey(e)}</button>
          ))}
        </div>
      </div>

      <div className="p" style={{ overflow: "hidden" }}>
        <div className="p-head" style={{ alignItems: "flex-start" }}>
          <h3><DocIcon size={13} /> Log stream</h3>
          <div className="p-meta">
            <span className="dot dot-cyan pulsing" /> {visibleLogs.length} of {filtered.length} events
          </div>
        </div>
        <div className="logs-viewport">
          <div style={{ fontFamily: "var(--font-mono)", minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "88px minmax(130px,0.55fr) minmax(120px,0.7fr) minmax(160px,1.5fr) 72px", gap: 12, padding: "8px 18px", color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
            <span>Time</span><span>Actor</span><span>Event</span><span>Subject</span><span style={{ textAlign: "right" }}>Status</span>
          </div>
          {visibleLogs.map((l) => {
            const actor = actorFor(l, state.agents);
            return (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "88px minmax(130px,0.55fr) minmax(120px,0.7fr) minmax(160px,1.5fr) 72px",
                gap: 12, alignItems: "center",
                padding: "11px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontSize: 11.5,
                transition: "background 140ms ease",
              }}
            >
              <span style={{ color: "var(--text-faint)", fontSize: 10.5 }}>{l.ts}</span>
              <span title={`${actor.label} · ${actor.detail}`} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 25, height: 25, flex: "0 0 auto", borderRadius: 8, background: `${actor.color}18`, boxShadow: `inset 0 0 0 1px ${actor.color}55`, display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 700, color: actor.color }}>{actor.initials}</span>
                <span style={{ color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor.label}</span>
              </span>
              <span style={{ width: "fit-content", maxWidth: "100%", fontSize: 10, padding: "4px 7px", borderRadius: 6, background: "rgba(255,255,255,0.04)", color: "var(--text-mute)", boxShadow: "inset 0 0 0 1px var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formatEventKey(l.event)}
              </span>
              <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.message}>{l.message}</span>
              <span style={{ justifySelf: "end", fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, padding: "4px 7px", borderRadius: 999, color: STATUS_COLOR[l.status] ?? "var(--text-dim)", background: `${STATUS_COLOR[l.status] ?? "#8B98A8"}14`, boxShadow: `inset 0 0 0 1px ${STATUS_COLOR[l.status] ?? "#8B98A8"}35` }}>{l.status}</span>
            </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-mute)", fontSize: 13, fontFamily: "var(--font-sans)" }}>No log entries match current filters.</div>
          )}
          </div>
        </div>
        {visibleLogs.length < filtered.length && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line)" }}>
            <button className="appr-btn edit" onClick={() => setVisibleCount((count) => count + 10)}>Show 10 more</button>
          </div>
        )}
      </div>
    </div>
  );
}
