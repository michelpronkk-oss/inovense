"use client";

import { useState } from "react";
import { FilterIcon, SwapIcon, PlusIcon } from "@/components/dashboard/icons";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { OperatorsPanel } from "@/components/dashboard/operators-panel";
import { ApprovalsList } from "@/components/dashboard/approvals";
import { WorkflowRunPanel } from "@/components/dashboard/workflow-run";
import { RecentOutputs } from "@/components/dashboard/recent-outputs";
import { ActivityStream } from "@/components/dashboard/activity-stream";
import { ConnectorsStrip } from "@/components/dashboard/connectors-strip";
import { useOS } from "@/lib/os/app-provider";

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

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Operating - last sync 14s ago</span>
          <h1>{greeting()}, {state.currentUser.name.split(" ")[0]}.</h1>
          <div className="os-page-sub">{state.approvals.filter((a) => a.status === "pending").length} approvals waiting - {state.agents.filter((a) => a.status === "running").length} agents running - {currentRange} - {modeLabel}.</div>
        </div>
        <div className="os-page-actions" style={{ position: "relative" }}>
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
        </div>
      </div>

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
    </div>
  );
}
