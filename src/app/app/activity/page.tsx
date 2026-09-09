"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { WorkforceActivityItem, WorkforceActivityPage } from "@/lib/activity/types";

type Range = "24h" | "7d" | "30d";
type Filter = "workflow" | "operator_run" | "approval" | "execution" | "attention" | "failure";

const filters: Array<{ key: Filter; label: string }> = [
  { key: "workflow", label: "Workflows" }, { key: "operator_run", label: "Runs" }, { key: "approval", label: "Approvals" },
  { key: "execution", label: "Actions" }, { key: "attention", label: "Needs attention" }, { key: "failure", label: "Failures" },
];
const ranges: Array<{ key: Range; label: string }> = [{ key: "24h", label: "24H" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" }];

function timeLabel(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function routeLabel(item: WorkforceActivityItem) { return item.relatedRoute === "/approvals" ? "View approval" : item.relatedRoute === "/agents" ? "View operator" : item.relatedRoute?.startsWith("/workflows") ? "View workflow" : item.relatedRoute === "/connectors" ? "View connector" : item.relatedRoute === "/logs" ? "Technical details" : null; }

export default function ActivityPage() {
  const [range, setRange] = useState<Range>("7d");
  const [selectedFilters, setSelectedFilters] = useState<Filter[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<WorkforceActivityPage | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(20);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/activity?range=${range}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Activity is unavailable."); return body as WorkforceActivityPage; })
      .then(setData)
      .catch((reason) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "Activity is unavailable."); });
    return () => controller.abort();
  }, [range]);

  useEffect(() => {
    const closeOnOutsidePress = (event: MouseEvent) => { if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) setFilterOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsidePress); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  const items = useMemo(() => (data?.items ?? []).filter((item) => selectedFilters.length === 0 || selectedFilters.some((filter) => filter === "attention" ? item.severity === "attention" : item.category === filter)), [data, selectedFilters]);
  const summary = data?.summary;
  function changeRange(value: Range) { setRange(value); setData(null); setError(""); setVisible(20); }
  function toggleFilter(filter: Filter) { setSelectedFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]); setVisible(20); }

  return <div className="os-page activity-page">
    <header className="os-page-head activity-page-head"><div><span className="os-greet">Workforce / activity</span><h1>Activity</h1><div className="os-page-sub">A clear history of what Auterim has seen, prepared, approved, and executed.</div></div><div className="os-page-actions activity-range-control">{ranges.map((item) => <button key={item.key} type="button" onClick={() => changeRange(item.key)} className={`appr-btn ${range === item.key ? "approve" : "edit"}`}>{item.label}</button>)}</div></header>
    {summary && <section className="dashboard-metrics" aria-label={`Activity totals for the last ${range}`}><div className="dashboard-metric-grid">{[["Runs", summary.runs], ["Approvals", summary.approvals], ["Actions", summary.actions], ["Issues", summary.issues]].map(([label, value]) => <div className="dashboard-metric" key={String(label)} data-attention={label === "Issues" && Number(value) > 0 ? true : undefined}><span>{label}</span><strong>{Number(value)}</strong></div>)}</div></section>}
    <section className="p activity-feed" aria-labelledby="activity-feed-title">
      <div className="p-head activity-feed-head"><div className="activity-feed-heading"><h3 id="activity-feed-title">Workforce history</h3><span>{data ? data.summary.total === 0 ? "No events recorded in this window" : `${data.summary.total} event${data.summary.total === 1 ? "" : "s"} recorded in this window` : "Loading activity"}</span></div><div className="os-filter-wrap" ref={filterMenuRef}><button type="button" className="btn btn-ghost btn-sm os-filter-trigger" aria-expanded={filterOpen} aria-haspopup="menu" onClick={() => setFilterOpen((open) => !open)}>Filter{selectedFilters.length ? ` · ${selectedFilters.length}` : ""}<span className="os-caret" aria-hidden="true" /></button>{filterOpen && <div className="os-filter-popover" role="menu" aria-label="Filter activity"><div className="os-filter-popover-head"><span>Event type</span><button type="button" onClick={() => { setSelectedFilters([]); setVisible(20); }}>Clear</button></div>{filters.map((item) => <button type="button" role="menuitemcheckbox" aria-checked={selectedFilters.includes(item.key)} key={item.key} className="os-filter-option" onClick={() => toggleFilter(item.key)}><span className="os-filter-check" aria-hidden="true" />{item.label}</button>)}</div>}</div></div>
      {error ? <div className="dashboard-telemetry-empty"><strong>Activity could not be loaded.</strong><span>{error}</span></div> : !data ? <div className="dashboard-telemetry-empty"><strong>Loading workforce activity…</strong></div> : items.length === 0 ? <div className="dashboard-telemetry-empty"><strong>{selectedFilters.length === 0 ? "No workforce activity yet." : "No matching activity in this window."}</strong><span>{selectedFilters.length === 0 ? "Once operators begin monitoring, preparing, approving, or executing work, their activity will appear here." : "Try another filter or time range."}</span>{selectedFilters.length === 0 && <Link className="btn btn-primary btn-sm" href="/agents" style={{ width: "fit-content", marginTop: 8 }}>Activate an operator</Link>}</div> : <ol className="activity-feed-list">{items.slice(0, visible).map((item) => { const action = routeLabel(item); return <li key={item.id} className="activity-feed-row"><time dateTime={item.occurredAt}>{timeLabel(item.occurredAt)}</time><div className="activity-feed-event"><div className="activity-feed-title"><strong>{item.title}</strong>{item.operatorKey && <span>{item.operatorKey.replace(/_/g, " ")}</span>}</div><p>{item.description}</p></div><span className={`activity-event-marker ${item.severity === "failure" ? "is-failure" : item.severity === "attention" ? "is-attention" : ""}`}>{item.category.replace(/_/g, " ")}</span>{action && item.relatedRoute ? <Link className="lnk-open" href={item.relatedRoute} aria-label={`${action}: ${item.title}`}>{action}</Link> : null}</li>; })}</ol>}
      {data && items.length > visible && <div className="activity-feed-more"><button type="button" className="appr-btn edit" onClick={() => setVisible((count) => count + 20)}>Show more</button></div>}
      {data?.hasMore && items.length <= visible && <div className="activity-feed-more activity-feed-note">Showing the most recent available activity for this window.</div>}
    </section>
  </div>;
}
