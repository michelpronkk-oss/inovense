"use client";

import { useMemo, useState } from "react";
import { ChartIcon, TrendIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import { getPlanLimits } from "@/lib/os/plans";
import { UpgradePrompt } from "@/components/upgrade-prompt";

function BarChart({ data, color = "#4DE8E1" }: { data: { label: string; val: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.val));
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

const WEEKLY = [
  { label: "W16", val: 620 },
  { label: "W17", val: 780 },
  { label: "W18", val: 830 },
  { label: "W19", val: 920 },
  { label: "W20", val: 1080 },
  { label: "W21", val: 1284 },
];

const HOURS_SAVED = [
  { label: "W16", val: 210 },
  { label: "W17", val: 260 },
  { label: "W18", val: 310 },
  { label: "W19", val: 350 },
  { label: "W20", val: 390 },
  { label: "W21", val: 412 },
];

const AGENT_PERF = [
  { mark: "RV", color: "#4DE8E1", name: "Revenue", actions: 326, outputs: 18, success: 98.4 },
  { mark: "MK", color: "#A78BFA", name: "Marketing", actions: 118, outputs: 14, success: 97.8 },
  { mark: "CF", color: "#5B8DEF", name: "Client Flow", actions: 84, outputs: 9, success: 100 },
  { mark: "OP", color: "#51D88A", name: "Operations", actions: 62, outputs: 6, success: 100 },
  { mark: "PR", color: "#F2767C", name: "Proposal", actions: 48, outputs: 8, success: 100 },
  { mark: "SE", color: "#7EF6F0", name: "SEO", actions: 42, outputs: 14, success: 99.2 },
];

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
  const limits = getPlanLimits(state.workspace.plan);
  const [exportOpen, setExportOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const kpis = useMemo(() => ([
    { label: "Actions this week", val: "1,284", delta: "+38.4% vs W20", color: "#4DE8E1" },
    { label: "Hours saved", val: "412h", delta: "+5.6% vs W20", color: "#51D88A" },
    { label: "Outputs created", val: "69", delta: "+28% vs W20", color: "#A78BFA" },
    { label: "Approval rate", val: "94.2%", delta: "+1.8% vs W20", color: "#F5C26B" },
  ]), []);

  const exportReport = (format: ExportFormat) => {
    const stamp = new Date();
    const date = stamp.toISOString().slice(0, 10);
    const filenameBase = `inovense-insights-${state.workspace.name.toLowerCase().replace(/\s+/g, "-")}-${date}`;

    if (format === "csv") {
      const kpiRows = [
        ["Section", "Label", "Value", "Delta"],
        ...kpis.map((k) => ["kpi", k.label, k.val, k.delta]),
      ];
      const weekRows = [["Section", "Week", "Actions"], ...WEEKLY.map((w) => ["weekly_actions", w.label, String(w.val)])];
      const hoursRows = [["Section", "Week", "HoursSaved"], ...HOURS_SAVED.map((w) => ["weekly_hours", w.label, String(w.val)])];
      const agentRows = [
        ["Section", "Operator", "Actions", "Outputs", "SuccessPct"],
        ...AGENT_PERF.map((a) => ["agent_performance", a.name, String(a.actions), String(a.outputs), String(a.success)]),
      ];

      const csv = [asCSV(kpiRows), "", asCSV(weekRows), "", asCSV(hoursRows), "", asCSV(agentRows)].join("\n");
      downloadFile(csv, `${filenameBase}.csv`, "text/csv;charset=utf-8");
      appendExecutionLog("insights_exported", `Exported insights report as CSV (${state.workspace.name})`);
      setFeedback("Insights CSV exported.");
      return;
    }

    const payload = {
      brand: "Inovense OS",
      workspace: state.workspace.name,
      generatedAt: stamp.toISOString(),
      kpis,
      weeklyActions: WEEKLY,
      weeklyHoursSaved: HOURS_SAVED,
      operatorPerformance: AGENT_PERF,
    };
    downloadFile(JSON.stringify(payload, null, 2), `${filenameBase}.json`, "application/json;charset=utf-8");
    appendExecutionLog("insights_exported", `Exported insights report as JSON (${state.workspace.name})`);
    setFeedback("Insights JSON exported.");
  };

  const exportVisualPdf = async () => {
    const stamp = new Date();
    const payload = {
      workspace: state.workspace.name,
      periodLabel: "Week 21 vs prior periods",
      generatedAt: stamp.toISOString(),
      kpis,
      weeklyActions: WEEKLY,
      weeklyHoursSaved: HOURS_SAVED,
      operators: AGENT_PERF.map((a) => ({ name: `${a.name} Operator`, actions: a.actions, outputs: a.outputs, success: a.success })),
    };

    const res = await fetch("/app/insights/export", {
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
    a.download = `inovense-insights-${state.workspace.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    appendExecutionLog("insights_exported", `Exported insights report as Visual PDF (${state.workspace.name})`);
    setFeedback("Visual PDF exported.");
  };

  if (!limits.insights) {
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

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Performance layer - W21</span>
          <h1>Insights</h1>
          <div className="os-page-sub">Operating metrics across all agents. Week 21 versus prior periods.</div>
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
            <h3><ChartIcon size={13} /> Actions per week</h3>
            <div className="p-meta">6-week rolling</div>
          </div>
          <div style={{ padding: "20px 18px 14px" }}>
            <BarChart data={WEEKLY} color="#4DE8E1" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
              <span>620 (W16)</span>
              <span style={{ color: "var(--green)" }}>1,284 (W21) +107%</span>
            </div>
          </div>
        </div>

        <div className="p">
          <div className="p-head">
            <h3><TrendIcon size={13} /> Hours saved per week</h3>
            <div className="p-meta">6-week rolling</div>
          </div>
          <div style={{ padding: "20px 18px 14px" }}>
            <BarChart data={HOURS_SAVED} color="#51D88A" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
              <span>210h (W16)</span>
              <span style={{ color: "var(--green)" }}>412h (W21) +96%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><ChartIcon size={13} /> Agent performance - W21</h3>
          <div className="p-meta">by operator</div>
        </div>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 100px 120px", gap: 14, padding: "10px 18px 8px", borderBottom: "1px solid var(--line)" }}>
            {["", "Operator", "Actions/wk", "Outputs/wk", "Success", "Status"].map((h) => (
              <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{h}</span>
            ))}
          </div>
          {AGENT_PERF.map((a) => (
            <div key={a.mark} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 120px 100px 120px", gap: 14, alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: a.color, background: `${a.color}15`, boxShadow: `inset 0 0 0 1px ${a.color}40` }}>{a.mark}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{a.name} Operator</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{a.actions}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{a.outputs}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--green)" }}>{a.success}%</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: a.color }}>Running</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 22px", borderRadius: 14, background: "rgba(77,232,225,0.04)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)", overflowX: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 10 }}>Weekly operating digest - W21</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, minWidth: 720 }}>
          {[
            { label: "Pipeline", change: "+18%", detail: "4 new deals entered proposal stage. $340k in active opportunities." },
            { label: "Content output", change: "+24%", detail: "14 SEO briefs, 3 campaign angles, 2 proposals delivered." },
            { label: "Operations", change: "-1.4h overhead", detail: "Digest automation saved 5.6h. 3 manual tasks eliminated." },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--green)" }}>{s.change}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
