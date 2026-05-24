"use client";

import { CpuIcon, InboxIcon, CheckIcon } from "@/components/dashboard/icons";
import type { DashboardState } from "@/lib/os/types";
import { useOS } from "@/lib/os/app-provider";

export function KPIRow({ timeRange, viewMode }: DashboardState) {
  const { state } = useOS();

  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const runningAgents = state.agents.filter((a) => a.status === "running").length;
  const activeWorkflows = state.workflows.filter((w) => w.status === "active").length;

  const activeVal = viewMode === "operator" ? runningAgents : activeWorkflows;
  const activeLabel = viewMode === "operator" ? "Active operators" : "Active workflows";
  const activeOf = viewMode === "operator" ? state.agents.length : state.workflows.length;

  const tasksThisWeek = state.agents.reduce((sum, a) => sum + a.stats.actionsThisWeek, 0);
  const rangeLabel = timeRange === "24h" ? "24h" : timeRange === "7d" ? "7d" : timeRange === "30d" ? "30d" : "QTD";

  const kpis = [
    {
      label: activeLabel,
      icon: <CpuIcon size={12} />,
      val: String(activeVal),
      delta: activeOf > 0 ? `of ${activeOf} deployed` : "None deployed",
      color: "#4DE8E1",
      cyan: true,
    },
    {
      label: "Pending approvals",
      icon: <InboxIcon size={12} />,
      val: String(pendingApprovals),
      delta: pendingApprovals === 0 ? "None pending" : "Awaiting review",
      deltaCls: pendingApprovals > 0 ? "amber" : "",
      color: "#F5C26B",
    },
    {
      label: `Tasks completed (${rangeLabel})`,
      icon: <CheckIcon size={12} />,
      val: String(tasksThisWeek),
      delta: tasksThisWeek === 0 ? "No activity yet" : "From active operators",
      color: "#4DE8E1",
    },
  ];

  return (
    <div className="kpi-row">
      {kpis.map((k) => (
        <div className="kpi" key={k.label}>
          <div className="kpi-top">
            <span className={`ico${k.cyan ? " cyan" : ""}`}>{k.icon}</span>
            <span className="lab">{k.label}</span>
          </div>
          <div className="kpi-val">{k.val}</div>
          <div className="kpi-meta">
            <span className={`kpi-delta${k.deltaCls ? ` ${k.deltaCls}` : ""}`}>{k.delta}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
