"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WorkforceActivityItem, WorkforceActivityPage } from "@/lib/activity/types";

type Range = "24h" | "7d" | "30d";
type Filter = "all" | "operator_run" | "approval" | "execution" | "attention" | "failure";
const filters: Array<{ key: Filter; label: string }> = [{ key: "all", label: "All" }, { key: "operator_run", label: "Runs" }, { key: "approval", label: "Approvals" }, { key: "execution", label: "Actions" }, { key: "attention", label: "Needs attention" }, { key: "failure", label: "Failures" }];
const ranges: Array<{ key: Range; label: string }> = [{ key: "24h", label: "24H" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" }];

function timeLabel(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function routeLabel(item: WorkforceActivityItem) { return item.relatedRoute === "/approvals" ? "View approval" : item.relatedRoute === "/agents" ? "View operator" : item.relatedRoute === "/connectors" ? "View connector" : item.relatedRoute === "/logs" ? "Technical details" : null; }

export default function ActivityPage() {
  const [range, setRange] = useState<Range>("7d");
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<WorkforceActivityPage | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(20);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/activity?range=${range}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Activity is unavailable."); return body as WorkforceActivityPage; })
      .then(setData)
      .catch((reason) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "Activity is unavailable."); });
    return () => controller.abort();
  }, [range]);

  const items = useMemo(() => (data?.items ?? []).filter((item) => filter === "all" || (filter === "attention" ? item.severity === "attention" : item.category === filter)), [data, filter]);
  const summary = data?.summary;
  function changeRange(value: Range) { setRange(value); setData(null); setError(""); setVisible(20); }
  return <div className="os-page" style={{ maxWidth: 1120 }}>
    <header className="os-page-head" style={{ marginBottom: 18 }}><div><span className="os-greet">Workforce / activity</span><h1>Activity</h1><div className="os-page-sub">A clear history of what Auterim has seen, prepared, approved, and executed.</div></div><div className="os-page-actions" style={{ alignItems: "center" }}><div style={{ display: "flex", gap: 4, padding: 3, border: "1px solid var(--line)", borderRadius: 9 }}>{ranges.map((item) => <button key={item.key} type="button" onClick={() => changeRange(item.key)} className={`appr-btn ${range === item.key ? "approve" : "edit"}`} style={{ padding: "5px 9px", fontSize: 10.5 }}>{item.label}</button>)}</div></div></header>
    {summary && <section className="dashboard-metrics" aria-label={`Activity totals for the last ${range}`} style={{ marginBottom: 16 }}><div className="dashboard-metric-grid">{[["Runs", summary.runs], ["Approvals", summary.approvals], ["Actions", summary.actions], ["Issues", summary.issues]].map(([label, value]) => <div className="dashboard-metric" key={String(label)} data-attention={label === "Issues" && Number(value) > 0 ? true : undefined}><span>{label}</span><strong>{Number(value)}</strong></div>)}</div></section>}
    <section className="p" aria-labelledby="activity-feed-title"><div className="p-head" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}><div><h3 id="activity-feed-title">Workforce history</h3><span>{data ? `${data.summary.total} recorded event${data.summary.total === 1 ? "" : "s"} in this window` : "Loading activity"}</span></div><div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>{filters.map((item) => <button type="button" key={item.key} className={`appr-btn ${filter === item.key ? "approve" : "edit"}`} onClick={() => { setFilter(item.key); setVisible(20); }} style={{ padding: "5px 9px", fontSize: 10.5 }}>{item.label}</button>)}</div></div>
      {error ? <div className="dashboard-telemetry-empty"><strong>Activity could not be loaded.</strong><span>{error}</span></div> : !data ? <div className="dashboard-telemetry-empty"><strong>Loading workforce activity…</strong></div> : items.length === 0 ? <div className="dashboard-telemetry-empty"><strong>{filter === "all" ? "No workforce activity yet." : "No matching activity in this window."}</strong><span>{filter === "all" ? "Once operators begin monitoring, preparing, approving, or executing work, their activity will appear here." : "Try another filter or time range."}</span>{filter === "all" && <Link className="btn btn-primary btn-sm" href="/agents" style={{ width: "fit-content", marginTop: 8 }}>Activate an operator</Link>}</div> : <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>{items.slice(0, visible).map((item) => { const action = routeLabel(item); return <li key={item.id} style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr) auto", gap: 16, padding: "15px 18px", borderTop: "1px solid var(--line)", alignItems: "start" }}><time dateTime={item.occurredAt} style={{ color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.45 }}>{timeLabel(item.occurredAt)}</time><div><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><strong style={{ fontSize: 13 }}>{item.title}</strong><span className={`pill ${item.severity === "failure" ? "pill-rose" : item.severity === "attention" ? "pill-amber" : "pill-cyan"}`}>{item.category.replace(/_/g, " ")}</span>{item.operatorKey && <span style={{ color: "var(--text-mute)", fontSize: 11.5 }}>{item.operatorKey.replace(/_/g, " ")}</span>}</div><p style={{ color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5, margin: "5px 0 0" }}>{item.description}</p></div>{action && item.relatedRoute ? <Link className="lnk-open" href={item.relatedRoute} aria-label={`${action}: ${item.title}`}>{action}</Link> : null}</li>; })}</ol>}
      {data && items.length > visible && <div style={{ padding: "14px 18px", borderTop: "1px solid var(--line)" }}><button type="button" className="appr-btn edit" onClick={() => setVisible((count) => count + 20)}>Show more</button></div>}
      {data?.hasMore && items.length <= visible && <div style={{ padding: "12px 18px", color: "var(--text-mute)", fontSize: 11.5, borderTop: "1px solid var(--line)" }}>Showing the most recent available activity for this window.</div>}
    </section>
  </div>;
}
