"use client";

import { useState, useMemo } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { Agent, ExecutionLog } from "@/lib/os/types";
import { FilterIcon } from "@/components/dashboard/icons";
import { EmptyState, PageHeader } from "@/components/product-ui/page-primitives";

const STATUS_TONE: Record<string, string> = { ok: "green", warn: "amber", waiting: "cyan", error: "red" };

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
      <div className="sec inline" style={{ justifyContent: "space-between" }}>
        <div className="inline">
          <label className="field">
            <span className="label">Agent</span>
            <select className="select" value={agentFilter} onChange={(event) => { setAgentFilter(event.target.value); setVisibleCount(10); }}>
              {agentMarks.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Event</span>
            <select className="select" value={eventFilter} onChange={(event) => { setEventFilter(event.target.value); setVisibleCount(10); }}>
              {eventTypes.map((e) => <option key={e} value={e}>{e === "All events" ? e : formatEventKey(e)}</option>)}
            </select>
          </label>
        </div>
        <div className="inline">
          <span className="t-meta">{filtered.length} of {state.logs.length} entries</span>
          {hasActiveFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAgentFilter("All agents"); setEventFilter("All events"); setVisibleCount(10); }}>Clear filters</button>
          )}
        </div>
      </div>

      <section className="sec card logs-audit-surface">
        <div className="card-head">
          <h3 className="t-section">Log stream</h3>
          <p className="t-meta"><span className="dot dot-cyan pulsing" /> {visibleLogs.length} of {filtered.length} events</p>
        </div>
        {filtered.length === 0 ? (
          <div className="card-pad"><EmptyState title="No log entries match these filters.">Change a filter to inspect another part of the workspace activity.</EmptyState></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>Time</th><th>Actor</th><th>Event</th><th>Subject</th><th className="right">Status</th></tr>
              </thead>
              <tbody>
                {visibleLogs.map((l) => {
                  const actor = actorFor(l, state.agents);
                  return (
                    <tr key={l.id}>
                      <td className="mono">{l.ts}</td>
                      <td title={`${actor.label} · ${actor.detail}`}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ width: 22, height: 22, flex: "none", borderRadius: 7, background: `${actor.color}18`, boxShadow: `inset 0 0 0 1px ${actor.color}55`, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: actor.color }}>{actor.initials}</span>
                          <span className="ink">{actor.label}</span>
                        </span>
                      </td>
                      <td className="mono">{formatEventKey(l.event)}</td>
                      <td title={`${l.message} (${l.id})`}>{l.message}</td>
                      <td className="right"><span className={`badge ${STATUS_TONE[l.status] ?? "muted"}`}>{l.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {visibleLogs.length < filtered.length && (
          <div className="card-pad" style={{ paddingTop: 12, paddingBottom: 12, borderTop: "1px solid var(--line)" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setVisibleCount((count) => count + 10)}>Show 10 more</button>
          </div>
        )}
      </section>
    </div>
  );
}
