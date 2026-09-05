"use client";

import { useMemo, useState } from "react";
import { ChartIcon, TrendIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel } from "@/lib/os/truth";
import { UpgradePrompt } from "@/components/upgrade-prompt";

function BarChart({ data, color = "#4DE8E1" }: { data: { label: string; val: number }[]; color?: string }) {
  if (data.length === 0) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        No activity yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.val), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: `${color}20`, borderRadius: "4px 4px 0 0", position: "relative", height: 64, display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", background: color, borderRadius: "4px 4px 0 0", height: `${(d.val / max) * 100}%`, transition: "height 0.3s", boxShadow: `0 0 8px ${color}40` }} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

type ExportFormat = "csv" | "json";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function asCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
}

export default function InsightsPage() {
  const { state, appendExecutionLog } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const [exportOpen, setExportOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const totalActions = state.agents.reduce((sum, a) => sum + a.stats.actionsThisWeek, 0);
  const totalOutputs = state.agents.reduce((sum, a) => sum + a.stats.outputsThisWeek, 0);
  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const totalApprovals = state.approvals.length;
  const approvalRate = totalApprovals > 0 ? ((totalApprovals - pendingApprovals) / totalApprovals * 100).toFixed(1) : null;

  const kpis = useMemo(() => ([
    { label: "Actions this week", val: totalActions > 0 ? totalActions.toLocaleString() : "0", delta: totalActions > 0 ? "From active operators" : "No activity yet", color: "#4DE8E1" },
    { label: "Outputs created", val: String(totalOutputs), delta: totalOutputs > 0 ? "This week" : "No outputs yet", color: "#A78BFA" },
    { label: "Approval rate", val: approvalRate !== null ? `${approvalRate}%` : "â€”", delta: totalApprovals > 0 ? `${totalApprovals} total` : "No approvals yet", color: "#F5C26B" },
    { label: "Pending review", val: String(pendingApprovals), delta: pendingApprovals > 0 ? "Awaiting action" : "All clear", color: "#51D88A" },
  ]), [totalActions, totalOutputs, approvalRate, totalApprovals, pendingApprovals]);

  const agentPerf = state.agents.map((a) => ({
    mark: a.mark,
    color: a.color,
    name: a.name,
    actions: a.stats.actionsThisWeek,
    outputs: a.stats.outputsThisWeek,
    status: a.status,
  }));

  const exportReport = (format: ExportFormat) => {
    const stamp = new Date();
    const date = stamp.toISOString().slice(0, 10);
    const filenameBase = `auterim-insights-${state.workspace.name.toLowerCase().replace(/\s+/g, "-")}-${date}`;

    if (format === "csv") {
      const kpiRows = [
        ["Section", "Label", "Value", "Delta"],
        ...kpis.map((k) => ["kpi", k.label, k.val, k.delta]),
      ];
      const agentRows = [
        ["Section", "Operator", "Actions/wk", "Outputs/wk", "Status"],
        ...agentPerf.map((a) => ["agent_performance", a.name, String(a.actions), String(a.outputs), a.status]),
      ];
      const csv = [asCSV(kpiRows), "", asCSV(agentRows)].join("\n");
      downloadFile(csv, `${filenameBase}.csv`, "text/csv;charset=utf-8");
      appendExecutionLog("insights_exported", `Exported insights report as CSV (${state.workspace.name})`);
      setFeedback("Insights CSV exported.");
      return;
    }

    const payload = {
      brand: "Auterim OS",
      workspace: state.workspace.name,
      generatedAt: stamp.toISOString(),
      kpis,
      operatorPerformance: agentPerf,
    };
    downloadFile(JSON.stringify(payload, null, 2), `${filenameBase}.json`, "application/json;charset=utf-8");
    appendExecutionLog("insights_exported", `Exported insights report as JSON (${state.workspace.name})`);
    setFeedback("Insights JSON exported.");
  };

  const exportVisualPdf = async () => {
    const stamp = new Date();
    const payload = {
      workspace: state.workspace.name,
      periodLabel: "Current week",
      generatedAt: stamp.toISOString(),
      kpis,
      operators: agentPerf.map((a) => ({ name: `${a.name} Operator`, actions: a.actions, outputs: a.outputs })),
    };

    const res = await fetch("/insights/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setFeedback("Could not generate visual PDF.");
      appendExecutionLog("insights_export_failed", `Visual PDF export failed for ${state.workspace.name}`, "error");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auterim-insights-${state.workspace.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    appendExecutionLog("insights_exported", `Exported insights report as Visual PDF (${state.workspace.name})`);
    setFeedback("Visual PDF exported.");
  };

  if (entitlements.planTier !== "operator" && entitlements.planTier !== "enterprise") {
    return (
      <div className="os-page" style={{ display: "flex", flexDirection: "column" }}>
        <div className="os-page-head">
          <div>
            <span className="os-greet">Performance layer</span>
            <h1>Insights</h1>
            <div className="os-page-sub">Operating metrics across all agents.</div>
          </div>
        </div>
        <UpgradePrompt
          feature="Operating insights"
          description="Cross-operator performance metrics, trend analysis, and exportable board-ready reports. See exactly where your operators deliver and where to optimize."
          requiredPlan="operator"
        />
      </div>
    );
  }

  const planLabel = getPlanLabel(entitlements.planTier);

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Performance layer - {planLabel}</span>
          <h1>Insights</h1>
          <div className="os-page-sub">Operating metrics across all agents. Current week activity.</div>
        </div>
        <div className="os-page-actions" style={{ position: "relative" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setExportOpen((v) => !v)}><ChartIcon size={12} /> Export report</button>
          {exportOpen && (
            <div className="os-menu-pop">
              <button className="os-menu-item" onClick={async () => { await exportVisualPdf(); setExportOpen(false); }}>Export Visual PDF - Executive</button>
              <button className="os-menu-item" onClick={() => { exportReport("csv"); setExportOpen(false); }}>Export CSV - Board pack</button>
              <button className="os-menu-item" onClick={() => { exportReport("json"); setExportOpen(false); }}>Export JSON - Data sync</button>
            </div>
          )}
        </div>
      </div>

      {feedback && <div style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {kpis.map((s) => (
          <div className="kpi" key={s.label} style={{ boxShadow: `inset 0 0 0 1px var(--line), inset 0 -2px 0 ${s.color}30` }}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.delta}</span></div>
          </div>
        ))}
      </div>

      <div className="os-grid-2">
        <div className="p">
          <div className="p-head">
            <h3><ChartIcon size={13} /> Actions this week</h3>
            <div className="p-meta">by operator</div>
          </div>
          <div style={{ padding: "20px 18px 14px" }}>
            <BarChart
              data={state.agents.filter((a) => a.stats.actionsThisWeek > 0).map((a) => ({ label: a.mark, val: a.stats.actionsThisWeek }))}
              color="#4DE8E1"
            />
          </div>
        </div>

        <div className="p">
          <div className="p-head">
            <h3><TrendIcon size={13} /> Outputs this week</h3>
            <div className="p-meta">by operator</div>
          </div>
          <div style={{ padding: "20px 18px 14px" }}>
            <BarChart
              data={state.agents.filter((a) => a.stats.outputsThisWeek > 0).map((a) => ({ label: a.mark, val: a.stats.outputsThisWeek }))}
              color="#A78BFA"
            />
          </div>
        </div>
      </div>

      {agentPerf.length > 0 && (
        <div className="p" style={{ overflowX: "auto" }}>
          <div className="p-head">
            <h3><ChartIcon size={13} /> Agent performance</h3>
            <div className="p-meta">by operator</div>
          </div>
          <div style={{ minWidth: 580 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 120px", gap: 14, padding: "10px 18px 8px", borderBottom: "1px solid var(--line)" }}>
              {["", "Operator", "Actions/wk", "Outputs/wk", "Status"].map((h) => (
                <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{h}</span>
              ))}
            </div>
            {agentPerf.map((a) => (
              <div key={a.mark} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 120px", gap: 14, alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: a.color, background: `${a.color}15`, boxShadow: `inset 0 0 0 1px ${a.color}40` }}>{a.mark}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{a.name} Operator</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{a.actions}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{a.outputs}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {a.status === "running"
                    ? <><span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} /><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: a.color }}>Running</span></>
                    : <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
