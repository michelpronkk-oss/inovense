"use client";

import { useState, useMemo } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { Agent, ExecutionLog } from "@/lib/os/types";
import { DocIcon, FilterIcon } from "@/components/dashboard/icons";
import { EmptyState, PageHeader } from "@/components/product-ui/page-primitives";

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
  const hasActiveFilter = agentFilter !== "All agents" || eventFilter !== "All events";

  return (
    <div className="os-page logs-page">
      <PageHeader
        eyebrow="Execution layer · live"
        title="Execution logs"
        description="A searchable record of operator actions, tool calls, and outcomes in this workspace."
        actions={<>
          <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Export is coming soon"><FilterIcon size={12} /> Export</button>
        </>}
      />

      {/* Two compact selects rather than a chip per event type: event keys grow
          with every new action the platform records, and a wrapping wall of
          chips stops being scannable well before that list is complete. */}
      <div className="logs-filter-bar">
        <label className="logs-filter">
          <span>Agent</span>
          <select className="os-input" value={agentFilter} onChange={(event) => { setAgentFilter(event.target.value); setVisibleCount(10); }}>
            {agentMarks.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="logs-filter">
          <span>Event</span>
          <select className="os-input" value={eventFilter} onChange={(event) => { setEventFilter(event.target.value); setVisibleCount(10); }}>
            {eventTypes.map((e) => <option key={e} value={e}>{e === "All events" ? e : formatEventKey(e)}</option>)}
          </select>
        </label>
        <div className="logs-filter-result">
          <span>{filtered.length} of {state.logs.length} entries</span>
          {hasActiveFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAgentFilter("All agents"); setEventFilter("All events"); setVisibleCount(10); }}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="p logs-audit-surface" style={{ overflow: "hidden" }}>
        <div className="p-head" style={{ alignItems: "flex-start" }}>
          <h3><DocIcon size={13} /> Log stream</h3>
          <div className="p-meta">
            <span className="dot dot-cyan pulsing" /> {visibleLogs.length} of {filtered.length} events
          </div>
        </div>
        <div className="logs-viewport">
          <div className="logs-table" style={{ fontFamily: "var(--font-mono)", minWidth: 0 }}>
          <div className="logs-table-head" style={{ display: "grid", gridTemplateColumns: "88px minmax(130px,0.55fr) minmax(120px,0.7fr) minmax(160px,1.5fr) 72px", gap: 12, padding: "8px 18px", color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
            <span>Time</span><span>Actor</span><span>Event</span><span>Subject</span><span style={{ textAlign: "right" }}>Status</span>
          </div>
          {visibleLogs.map((l) => {
            const actor = actorFor(l, state.agents);
            return (
            <div
              key={l.id}
              className="logs-table-row"
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
              <span className="logs-subject" style={{ color: "var(--text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${l.message} (${l.id})`}><strong>{l.message}</strong><small>{l.id}</small></span>
              <span style={{ justifySelf: "end", fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, padding: "4px 7px", borderRadius: 999, color: STATUS_COLOR[l.status] ?? "var(--text-dim)", background: `${STATUS_COLOR[l.status] ?? "#8B98A8"}14`, boxShadow: `inset 0 0 0 1px ${STATUS_COLOR[l.status] ?? "#8B98A8"}35` }}>{l.status}</span>
            </div>
            );
          })}
          {filtered.length === 0 && <EmptyState title="No log entries match these filters.">Change a filter to inspect another part of the workspace activity.</EmptyState>}
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
