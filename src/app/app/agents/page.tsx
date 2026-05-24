"use client";

import { useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { PlusIcon, ZapIcon, FilterIcon } from "@/components/dashboard/icons";
import { getPlanLimits, isAtOperatorLimit } from "@/lib/os/plans";
import { UsageBanner } from "@/components/upgrade-prompt";
import { getEntitlements } from "@/lib/os/entitlements";

const TABS = ["All", "Running", "Awaiting", "Paused"];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `${mins}m ago` : "just now";
}

export default function AgentsPage() {
  const { state, runAgent, toggleAgentPause } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview" || !entitlements.canRunRealActions;
  const [tab, setTab] = useState("All");
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const agents = state.agents;
  const limits = getPlanLimits(state.workspace.plan);
  const activeOperators = agents.filter((a) => a.status !== "paused").length;
  const atLimit = isAtOperatorLimit(state.workspace.plan, activeOperators);

  const filtered = agents.filter((a) => {
    if (tab === "All") return true;
    return a.status === tab.toLowerCase();
  });

  const running = agents.filter((a) => a.status === "running").length;
  const awaiting = agents.filter((a) => a.status === "awaiting").length;
  const totalActions = agents.reduce((sum, a) => sum + a.stats.actionsThisWeek, 0);

  const handleRun = (agentId: string) => {
    setRunningAgentId(agentId);
    runAgent(agentId);
    setTimeout(() => setRunningAgentId(null), 1200);
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Agent layer - {running} running{awaiting > 0 ? `, ${awaiting} awaiting` : ""}</span>
          <h1>Agents</h1>
          <div className="os-page-sub">{agents.length} operators deployed - Inovense OS manages execution.</div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview mode: operators run demo tasks. Real execution requires an active plan.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Advanced filters are coming soon"><FilterIcon size={12} /> Filter</button>
          {atLimit ? (
            <Link
              href="/pricing"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to deploy more
            </Link>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}
            >
              <PlusIcon size={12} /> Deploy agent
            </button>
          )}
        </div>
      </div>

      {limits.maxOperators !== -1 && (
        <UsageBanner used={activeOperators} max={limits.maxOperators} label="operators" planLabel={limits.name} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total deployed", val: String(agents.length), sub: `${running} active` },
          { label: "Running", val: String(running), sub: "across all operators" },
          { label: "Actions this week", val: totalActions.toLocaleString(), sub: "combined output" },
          { label: "Awaiting approval", val: String(awaiting), sub: awaiting > 0 ? "requires review" : "all clear" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`appr-btn${tab === t ? " approve" : " edit"}`}
            style={{ fontSize: 11.5, padding: "5px 12px" }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {filtered.map((a) => (
          <div className="p" key={a.id} style={{ gap: 0 }}>
            <div className="p-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div
                  className="ops-card-avatar"
                  style={{ color: a.color, background: `linear-gradient(135deg, ${a.color}22, ${a.color}06)`, boxShadow: `inset 0 0 0 1px ${a.color}55`, flexShrink: 0 }}
                >{a.mark}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>
                    {a.config.tools.slice(0, 3).join(" - ")}
                  </div>
                </div>
              </div>
              <div className="ops-card-status">
                {a.status === "running" && <><span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} /><span style={{ color: a.color }}>Running</span></>}
                {a.status === "awaiting" && <><span className="dot dot-amber pulsing" /><span style={{ color: "var(--amber)" }}>Awaiting</span></>}
                {a.status === "paused" && <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ color: "var(--text-mute)" }}>Paused</span></>}
                {a.status === "idle" && <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ color: "var(--text-mute)" }}>Idle</span></>}
              </div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div className="ops-task" style={{ marginBottom: 12 }}>
                <ZapIcon size={12} style={{ color: a.color, flexShrink: 0 }} />
                <span>{a.currentTask}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "This week", val: `${a.stats.metricValue} ${a.stats.metricLabel}` },
                  { label: "Total runs", val: a.stats.totalRuns.toLocaleString() },
                  { label: "Deployed", val: relativeTime(a.deployedAt) },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="appr-btn edit"
                  onClick={() => toggleAgentPause(a.id)}
                  disabled={a.status === "awaiting"}
                  style={{ opacity: a.status === "awaiting" ? 0.4 : 1 }}
                >
                  {a.status === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  className="appr-btn edit"
                  onClick={() => handleRun(a.id)}
                  disabled={runningAgentId === a.id || a.status === "paused"}
                  style={{ opacity: (runningAgentId === a.id || a.status === "paused") ? 0.4 : 1 }}
                >
                  {runningAgentId === a.id ? "Running..." : isPreview ? "Run demo" : "Run live"}
                </button>
                <button
                  className="appr-btn approve"
                  onClick={() => {
                    const run = state.agentRuns.find((r) => r.agentId === a.id);
                    if (run) setSelectedRunId(run.id);
                  }}
                >
                  View output
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
          No {tab.toLowerCase()} operators.
        </div>
      )}

      {selectedRunId && (() => {
        const run = state.agentRuns.find((r) => r.id === selectedRunId);
        if (!run) return null;
        const runLogs = state.logs.filter((l) => l.runId === run.id).slice(0, 20);
        return (
          <div className="os-modal-backdrop" onClick={() => setSelectedRunId(null)}>
            <div className="os-modal" style={{ width: "min(900px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
              <div className="os-modal-head">
                <h3>{run.agentName} run - {run.id.slice(-6)}</h3>
                <button className="appr-btn deny" onClick={() => setSelectedRunId(null)}>Close</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Plan steps</div>
                  {run.steps.map((s, idx) => (
                    <div key={`${s.id ?? idx}-${s.name}`} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 12.8, fontWeight: 500 }}>{idx + 1}. {s.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: s.state === "done" ? "var(--green)" : s.state === "failed" ? "var(--rose)" : s.state === "active" ? "var(--cyan)" : "var(--text-mute)" }}>{s.state}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 3 }}>{s.sub}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                        {s.tool && <span style={{ color: "var(--text-faint)" }}>{s.tool}</span>}
                        {s.riskLevel && <span style={{ color: "var(--text-faint)" }}>risk: {s.riskLevel}</span>}
                      </div>
                      {s.output && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--text-dim)" }}>{s.output}</div>}
                      {s.blockedReason && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--rose)" }}>{s.blockedReason}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Execution logs</div>
                  {runLogs.map((l) => (
                    <div key={l.id} style={{ padding: "9px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>{l.ts} - {l.event}</div>
                      <div style={{ fontSize: 11.8, color: "var(--text-dim)", marginTop: 3 }}>{l.message}</div>
                    </div>
                  ))}
                  {run.output && (
                    <div style={{ marginTop: 6, padding: "10px 12px", borderRadius: 8, background: "rgba(77,232,225,0.07)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: "var(--text)" }}>{run.output.title}</div>
                      <div style={{ fontSize: 11.8, color: "var(--text-dim)", marginTop: 3 }}>{run.output.summary}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
