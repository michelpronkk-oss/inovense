import { CpuIcon, InboxIcon, CheckIcon, ClockIcon } from "@/components/dashboard/icons";
import type { DashboardState } from "@/lib/os/types";

function Spark({ data, color = "#4DE8E1", w = 80, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const id = `sp-${color.replace("#", "")}-${data.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="kpi-spark">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
    </svg>
  );
}

function buildKPIs(timeRange: DashboardState["timeRange"], viewMode: DashboardState["viewMode"]) {
  const rangeLabel = timeRange === "24h" ? "24h" : timeRange === "7d" ? "7d" : timeRange === "30d" ? "30d" : "QTD";
  const taskValue = timeRange === "24h" ? "184" : timeRange === "7d" ? "1,284" : timeRange === "30d" ? "4,992" : "13,420";
  const hoursValue = timeRange === "24h" ? "61h" : timeRange === "7d" ? "412h" : timeRange === "30d" ? "1,682h" : "4,460h";
  const taskDelta = timeRange === "24h" ? "+6.2% d/d" : timeRange === "7d" ? "+38.4% w/w" : timeRange === "30d" ? "+22.1% m/m" : "+19.3% q/q";
  const hoursDelta = timeRange === "24h" ? "~1.5 FTE weeks" : timeRange === "7d" ? "~10 FTE weeks" : timeRange === "30d" ? "~41 FTE weeks" : "~109 FTE weeks";
  const activeLabel = viewMode === "operator" ? "Active operators" : "Active workflows";
  const activeVal = viewMode === "operator" ? "8" : "12";
  const activeDelta = viewMode === "operator" ? "+2 this week" : "+3 this week";

  return [
    { label: activeLabel, icon: <CpuIcon size={12} />, val: activeVal, delta: activeDelta, spark: [4, 5, 4, 6, 7, 6, 7, 8], color: "#4DE8E1", cyan: true },
    { label: "Pending approvals", icon: <InboxIcon size={12} />, val: "3", delta: "Median 4m 12s", deltaCls: "amber", spark: [2, 4, 3, 5, 3, 4, 3, 3], color: "#F5C26B" },
    { label: `Tasks completed (${rangeLabel})`, icon: <CheckIcon size={12} />, val: taskValue, delta: taskDelta, spark: [12, 18, 16, 22, 28, 26, 32, 38], color: "#4DE8E1" },
    { label: `Hours saved (${rangeLabel})`, icon: <ClockIcon size={12} />, val: hoursValue, delta: hoursDelta, spark: [10, 14, 16, 20, 24, 28, 30, 34], color: "#51D88A" },
  ];
}

export function KPIRow({ timeRange, viewMode }: DashboardState) {
  const KPIS = buildKPIs(timeRange, viewMode);
  return (
    <div className="kpi-row">
      {KPIS.map((k) => (
        <div className="kpi" key={k.label}>
          <div className="kpi-top">
            <span className={`ico${k.cyan ? " cyan" : ""}`}>{k.icon}</span>
            <span className="lab">{k.label}</span>
          </div>
          <div className="kpi-val">{k.val}</div>
          <div className="kpi-meta">
            <span className={`kpi-delta${k.deltaCls ? ` ${k.deltaCls}` : ""}`}>{k.delta}</span>
            <Spark data={k.spark} color={k.color} />
          </div>
        </div>
      ))}
    </div>
  );
}
