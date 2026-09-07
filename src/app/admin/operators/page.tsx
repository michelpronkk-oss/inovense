import type { Metadata } from "next";
import { getOperatorFleetData } from "@/lib/admin/operators";

export const metadata: Metadata = { title: "Operators | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const number = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString("en-US");
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const time = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Not reported";

function Metric({ label: title, value, note, warning = false }: { label: string; value: string; note: string; warning?: boolean }) {
  return <article className="admin-kpi"><div className="admin-eyebrow">{title}</div><div className={`admin-kpi-value${value === "Unavailable" ? " unavailable" : ""}${warning ? " warning" : ""}`}>{value}</div><div className="admin-kpi-note">{note}</div></article>;
}

export default async function OperatorsPage() {
  const data = await getOperatorFleetData();
  const tone = data.sourceStatus === "connected" ? "live" : "offline";

  return <div className="admin-command-center admin-operators-page">
    <div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${tone}`} />Auterim / operators</div><h1>Operator fleet.</h1><p>A compact runtime view that groups work by operator and surfaces only the runs that need attention.</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${tone}`}>{data.sourceStatus === "connected" ? "Runtime source live" : "Source unavailable"}</span><span>Latest 500 runs</span></div></div>
    <section className="admin-kpi-grid admin-kpi-grid-four"><Metric label="Run window" value={number(data.sampledRuns)} note="Latest recorded runtime activity" /><Metric label="Active work" value={number(data.activeRuns)} note="Running, queued, or pending" /><Metric label="Needs attention" value={number(data.needsAttention)} note="Blocked, failed, errored, or canceled" warning={(data.needsAttention ?? 0) > 0} /><Metric label="Workspaces" value={number(data.workspaces)} note="With recorded operator work" /></section>
    {data.unavailable ? <section className="admin-panel"><div className="admin-empty-compact">{data.unavailable}</div></section> : <><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Fleet summary</div><h2>Top operators by recent runtime</h2></div>{data.fleet.length ? <div className="admin-fleet-table">{data.fleet.map((operator) => <div key={operator.key}><div><strong>{label(operator.key)}</strong><small>Last run {time(operator.lastRunAt)}</small></div><span><small>Runs</small>{operator.total.toLocaleString()}</span><span><small>Completed</small>{operator.clear.toLocaleString()}</span><span><small>Active</small><b className={operator.active ? "admin-detail-state live" : "admin-detail-state"}>{operator.active.toLocaleString()}</b></span><span><small>Attention</small><b className={operator.attention ? "admin-detail-state warning" : "admin-detail-state"}>{operator.attention.toLocaleString()}</b></span></div>)}</div> : <div className="admin-empty-compact">No operator runtime records are available.</div>}</section><div className="admin-grid-main"><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Exception queue</div><h2>Runs that need review</h2></div>{data.exceptions.length ? <div className="admin-fleet-list">{data.exceptions.map((run, index) => <div key={`${run.key}-${run.createdAt}-${index}`}><span className="admin-status-dot partial" /><div><strong>{label(run.key)}</strong><small>{time(run.createdAt)}</small></div><b className="admin-detail-state warning">{label(run.status)}</b></div>)}</div> : <div className="admin-empty-compact">No blocked or failed runs in the current window.</div>}</section><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Latest activity</div><h2>Most recent runs</h2></div>{data.latest.length ? <div className="admin-fleet-list">{data.latest.map((run, index) => <div key={`${run.key}-${run.createdAt}-${index}`}><span className={`admin-status-dot ${["completed", "success", "succeeded"].includes(run.status.toLowerCase()) ? "live" : "partial"}`} /><div><strong>{label(run.key)}</strong><small>{time(run.createdAt)}</small></div><b className="admin-detail-state">{label(run.status)}</b></div>)}</div> : <div className="admin-empty-compact">No recent runs are available.</div>}</section></div></>}
  </div>;
}
