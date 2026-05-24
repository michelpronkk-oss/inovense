"use client";

import { useState } from "react";
import Link from "next/link";
import { FilterIcon, SwapIcon, PlusIcon, ZapIcon } from "@/components/dashboard/icons";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { OperatorsPanel } from "@/components/dashboard/operators-panel";
import { ApprovalsList } from "@/components/dashboard/approvals";
import { WorkflowRunPanel } from "@/components/dashboard/workflow-run";
import { RecentOutputs } from "@/components/dashboard/recent-outputs";
import { ActivityStream } from "@/components/dashboard/activity-stream";
import { ConnectorsStrip } from "@/components/dashboard/connectors-strip";
import { useOS } from "@/lib/os/app-provider";

const OPERATOR_FIRST_STEPS: Record<string, { task: string; tools: string[] }> = {
  "Revenue Operator": { task: "Qualify inbound leads and draft CRM follow-ups", tools: ["Gmail", "HubSpot", "Slack"] },
  "Marketing Operator": { task: "Generate content briefs and schedule campaign output", tools: ["Notion", "Google Drive", "Slack"] },
  "Client Flow Operator": { task: "Send onboarding kits and track client status", tools: ["HubSpot", "Gmail", "Slack"] },
  "Operations Operator": { task: "Compile weekly team digest across channels", tools: ["Slack", "Notion", "ClickUp"] },
  "Support Operator": { task: "Triage support tickets and draft first replies", tools: ["Gmail", "Slack", "Webhooks"] },
};

function GettingStartedCard() {
  const { state } = useOS();
  const firstAgent = state.agents[0];
  const connectedCount = state.connectors.filter((c) => c.isConnected).length;
  const firstStep = firstAgent ? OPERATOR_FIRST_STEPS[firstAgent.name] : null;
  const goals = state.onboarding.mainGoals ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      {/* Operator card */}
      <div className="p" style={{ gap: 0, gridColumn: firstAgent ? "1" : "1 / -1" }}>
        <div className="p-head">
          <h3>Your operator</h3>
          {firstAgent && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em" }}>deployed</span>
          )}
        </div>
        <div style={{ padding: "14px 18px" }}>
          {firstAgent ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${firstAgent.color}18`, boxShadow: `inset 0 0 0 1px ${firstAgent.color}44`, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, color: firstAgent.color, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                  {firstAgent.mark}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{firstAgent.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>{firstAgent.currentTask}</div>
                </div>
              </div>
              {firstStep && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <ZapIcon size={12} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>{firstStep.task}</span>
                  </div>
                </div>
              )}
              <button className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}>
                Run first task
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 13, color: "var(--text-mute)", marginBottom: 14 }}>No operator deployed yet.</div>
              <button className="btn btn-primary btn-sm" onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}>
                <PlusIcon size={12} /> Deploy operator
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connectors card */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Stack</h3>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: connectedCount > 0 ? "var(--cyan)" : "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {connectedCount} preview connected
          </span>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {state.connectors.filter((c) => c.isConnected).slice(0, 5).map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{c.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(77,232,225,0.08)", color: "var(--cyan)", textTransform: "uppercase" }}>preview</span>
            </div>
          ))}
          {connectedCount === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-mute)", padding: "8px 0" }}>No connectors active yet.</div>
          )}
          <Link href="/app/connectors" className="btn btn-ghost btn-sm" style={{ marginTop: 6, textAlign: "center" }}>
            Activate connectors
          </Link>
        </div>
      </div>

      {/* Next steps card */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Next steps</h3>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { done: firstAgent !== undefined, label: "Operator deployed", link: "/app/agents" },
            { done: connectedCount > 0, label: "Stack connected", link: "/app/connectors" },
            { done: false, label: "Run first workflow", link: "/app/agents" },
            { done: (state.onboarding.mainGoals?.length ?? 0) > 0, label: "Operating focus set", link: "/app/agents" },
            { done: false, label: "Activate Starter plan", link: "/pricing" },
          ].map((step) => (
            <Link key={step.label} href={step.link} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, display: "grid", placeItems: "center", background: step.done ? "var(--cyan)" : "rgba(255,255,255,0.04)", boxShadow: step.done ? "none" : "inset 0 0 0 1px var(--line)", flexShrink: 0 }}>
                {step.done && <span style={{ color: "#04130f", fontSize: 10, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: step.done ? "var(--text-dim)" : "var(--text)", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
            </Link>
          ))}
          {goals.length > 0 && (
            <div style={{ marginTop: 6, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Focus areas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {goals.map((g: string) => (
                  <span key={g} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(77,232,225,0.08)", color: "var(--cyan)", textTransform: "uppercase" }}>{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const hh = new Date().getHours();
  if (hh < 5) return "Good night";
  if (hh < 12) return "Good morning";
  if (hh < 18) return "Good afternoon";
  return "Good evening";
}

const ranges = [
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "quarter", label: "This quarter" },
] as const;

export function OSOverview() {
  const { state, setDashboardPrefs } = useOS();
  const [open, setOpen] = useState(false);
  const currentRange = ranges.find((r) => r.key === state.dashboard.timeRange)?.label ?? "Last 7 days";
  const modeLabel = state.dashboard.viewMode === "operator" ? "Operator view" : "Workflow view";
  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const runningAgents = state.agents.filter((a) => a.status === "running").length;

  // Fresh workspace: no workflows yet, came through onboarding
  const isFresh = state.workflows.length === 0 && state.onboarding.isComplete;

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">{isFresh ? "Preview workspace active" : "Operating - last sync 14s ago"}</span>
          <h1>{greeting()}, {state.currentUser.name.split(" ")[0]}.</h1>
          <div className="os-page-sub">
            {isFresh
              ? "Your operator is deployed and ready. Activate your stack to start live execution."
              : `${pendingApprovals} approvals waiting - ${runningAgents} agents running - ${currentRange} - ${modeLabel}.`}
          </div>
        </div>
        <div className="os-page-actions" style={{ position: "relative" }}>
          {!isFresh && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}><FilterIcon size={12} /> {currentRange}</button>
              {open && (
                <div className="os-menu-pop">
                  {ranges.map((r) => (
                    <button key={r.key} className="os-menu-item" onClick={() => { setDashboardPrefs({ timeRange: r.key }); setOpen(false); }}>{r.label}</button>
                  ))}
                </div>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setDashboardPrefs({ viewMode: state.dashboard.viewMode === "operator" ? "workflow" : "operator" })}><SwapIcon size={12} /> {modeLabel}</button>
              <button className="btn btn-primary btn-sm" onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}><PlusIcon size={12} /> Deploy agent</button>
            </>
          )}
        </div>
      </div>

      {isFresh ? (
        <GettingStartedCard />
      ) : (
        <>
          <KPIRow timeRange={state.dashboard.timeRange} viewMode={state.dashboard.viewMode} />
          {state.dashboard.viewMode === "operator" ? (
            <>
              <div className="os-grid-2">
                <OperatorsPanel />
                <ApprovalsList />
              </div>
              <WorkflowRunPanel />
            </>
          ) : (
            <>
              <WorkflowRunPanel />
              <div className="os-grid-2">
                <ApprovalsList />
                <OperatorsPanel />
              </div>
            </>
          )}
          <div className="os-grid-2">
            <RecentOutputs />
            <ActivityStream />
          </div>
          <ConnectorsStrip />
        </>
      )}
    </div>
  );
}
