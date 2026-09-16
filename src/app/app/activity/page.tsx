"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { WorkforceActivityItem, WorkforceActivityPage } from "@/lib/activity/types";
import { EmptyState, MetricStrip } from "@/components/product-ui/page-primitives";
import { ActivityAvatar } from "@/components/activity/activity-avatar";
import { categoryLabel, operatorDisplayName, withoutLeadingOperatorName } from "@/lib/activity/presentation";
import { ResponsiveOverlay } from "@/components/app-ui/responsive-overlay";
import { useIsCompactViewport } from "@/components/app-ui/use-compact-viewport";
import { useOS } from "@/lib/os/app-provider";
import { useWorkspaceRealtimeInvalidation } from "@/lib/os/workspace-realtime";

type Range = "24h" | "7d" | "30d";
type Filter = "workflow" | "operator_run" | "approval" | "execution" | "outcome" | "attention" | "failure";

const filters: Array<{ key: Filter; label: string }> = [
  { key: "workflow", label: "Workflows" }, { key: "operator_run", label: "Runs" }, { key: "approval", label: "Approvals" },
  { key: "execution", label: "Actions" }, { key: "outcome", label: "Outcomes" }, { key: "attention", label: "Needs attention" }, { key: "failure", label: "Failures" },
];
const ranges: Array<{ key: Range; label: string }> = [{ key: "24h", label: "24H" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" }];

function timeLabel(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function routeLabel(item: WorkforceActivityItem) { return item.relatedRoute === "/approvals" ? "View approval" : item.relatedRoute === "/agents" ? "View operator" : item.relatedRoute?.startsWith("/workflows") ? "View workflow" : item.relatedRoute === "/connectors" ? "View connector" : item.relatedRoute === "/logs" ? "Technical details" : null; }

export default function ActivityPage() {
  const { state } = useOS();
  const [range, setRange] = useState<Range>("7d");
  const [selectedFilters, setSelectedFilters] = useState<Filter[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<WorkforceActivityPage | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(20);
  const [selectedItem, setSelectedItem] = useState<WorkforceActivityItem | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const compact = useIsCompactViewport();

  useEffect(() => {
    let active = false;
    let disposed = false;
    const refresh = async () => {
      if (disposed || active || document.visibilityState !== "visible") return;
      active = true;
      try {
        const response = await fetch(`/api/activity?range=${range}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Activity is unavailable.");
        if (!disposed) { setData(body as WorkforceActivityPage); setError(""); }
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : "Activity is unavailable.");
      } finally {
        active = false;
      }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [range]);
  useWorkspaceRealtimeInvalidation(state.workspace.id, ["activity", "dashboard"], () => { refreshRef.current?.(); });

  useEffect(() => {
    // The compact filter is a ResponsiveOverlay/Sheet, which already owns its
    // own outside-click and Escape dismissal (Radix); attaching this
    // document-level listener too would close it the instant a tap landed
    // inside the sheet's portal, since that portal sits outside filterMenuRef.
    if (compact) return;
    const closeOnOutsidePress = (event: MouseEvent) => { if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) setFilterOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsidePress); document.removeEventListener("keydown", closeOnEscape); };
  }, [compact]);

  const items = useMemo(() => (data?.items ?? []).filter((item) => selectedFilters.length === 0 || selectedFilters.some((filter) => filter === "attention" ? item.severity === "attention" : item.category === filter)), [data, selectedFilters]);
  const summary = data?.summary;
  function changeRange(value: Range) { setRange(value); setData(null); setError(""); setVisible(20); }
  function toggleFilter(filter: Filter) { setSelectedFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]); setVisible(20); }

  return <div className="os-page activity-page">
    <header className="page-head">
      <div>
        <span className="t-eyebrow" style={{ display: "block", marginBottom: 8 }}>Workforce / activity</span>
        <h1 className="t-title">Activity</h1>
        <p className="t-sub">A traceable record of what Auterim observed, prepared, approved, and executed.</p>
      </div>
      <div className="acts">
        <div className="seg">{ranges.map((item) => <button key={item.key} type="button" onClick={() => changeRange(item.key)} className={range === item.key ? "on" : ""}>{item.label}</button>)}</div>
        <div className="os-filter-wrap" ref={filterMenuRef} style={{ position: "relative" }}>
          <button type="button" className={`filter${filterOpen || selectedFilters.length ? " on" : ""}`} aria-expanded={filterOpen} aria-haspopup="menu" onClick={() => setFilterOpen((open) => !open)}>
            Filter{selectedFilters.length > 0 && <span className="n">{selectedFilters.length}</span>}
          </button>
          {filterOpen && !compact && <div className="os-filter-popover" role="menu" aria-label="Filter activity"><div className="os-filter-popover-head"><span>Event type</span><button type="button" onClick={() => { setSelectedFilters([]); setVisible(20); }}>Clear</button></div>{filters.map((item) => <button type="button" role="menuitemcheckbox" aria-checked={selectedFilters.includes(item.key)} key={item.key} className="os-filter-option" onClick={() => toggleFilter(item.key)}><span className="os-filter-check" aria-hidden="true" />{item.label}</button>)}</div>}
        </div>
      </div>
    </header>

    {filterOpen && compact && (
      <ResponsiveOverlay
        open
        onOpenChange={(next) => { if (!next) setFilterOpen(false); }}
        eyebrow="Filter activity"
        title="Event type"
        footer={<button type="button" className="btn btn-primary btn-sm" onClick={() => setFilterOpen(false)}>Show results</button>}
      >
        <div className="activity-filter-sheet" role="menu" aria-label="Filter activity">
          <div className="os-filter-popover-head"><span>Event type</span><button type="button" onClick={() => { setSelectedFilters([]); setVisible(20); }}>Clear</button></div>
          {filters.map((item) => <button type="button" role="menuitemcheckbox" aria-checked={selectedFilters.includes(item.key)} key={item.key} className="os-filter-option" onClick={() => toggleFilter(item.key)}><span className="os-filter-check" aria-hidden="true" />{item.label}</button>)}
        </div>
      </ResponsiveOverlay>
    )}

    {summary && (
      <div aria-label={`Activity totals for the last ${range}`}>
        <MetricStrip items={[
          { label: "Runs", value: summary.runs, detail: "operator activity" },
          { label: "Approvals", value: summary.approvals, detail: "review activity" },
          { label: "Actions", value: summary.actions, detail: "executed work" },
          { label: "Issues", value: summary.issues, detail: summary.issues > 0 ? "needs attention" : "no issues recorded", tone: summary.issues > 0 ? "attention" : "default" },
        ]} />
      </div>
    )}

    <section className="sec card activity-feed" aria-labelledby="activity-feed-title">
      <div className="card-head">
        <div>
          <h3 className="t-section" id="activity-feed-title">Workforce history</h3>
          <p className="t-meta" style={{ margin: "3px 0 0" }}>{data ? data.summary.total === 0 ? "No events recorded in this window" : `${data.summary.total} event${data.summary.total === 1 ? "" : "s"} recorded in this window` : "Loading activity"}</p>
        </div>
      </div>
      {error ? (
        <div className="card-pad"><EmptyState title="Activity could not be loaded.">{error}</EmptyState></div>
      ) : !data ? (
        <div className="card-pad t-compact dim">Loading workforce activity…</div>
      ) : items.length === 0 ? (
        <div className="card-pad">
          <EmptyState
            title={selectedFilters.length === 0 ? "No workforce activity yet." : "No matching activity in this window."}
            action={selectedFilters.length === 0 ? <Link className="btn btn-primary btn-sm" href="/agents">Activate an operator</Link> : undefined}
          >
            {selectedFilters.length === 0 ? "Once operators begin monitoring, preparing, approving, or executing work, their activity will appear here." : "Try another filter or time range."}
          </EmptyState>
        </div>
      ) : (
        <div className="rows">
          {items.slice(0, visible).map((item) => {
            const routeText = routeLabel(item);
            const name = operatorDisplayName(item.operatorKey);
            const action = withoutLeadingOperatorName(name, item.title);
            const supporting = withoutLeadingOperatorName(name, item.description);
            return (
              <button type="button" key={item.id} className="row activity-row activity-row-trigger" onClick={() => setSelectedItem(item)}>
                <time className="activity-row-time t-mono" dateTime={item.occurredAt}>{timeLabel(item.occurredAt)}</time>
                <ActivityAvatar operatorKey={item.operatorKey} />
                <span className="grow activity-row-body">
                  <span className="activity-row-primary">
                    <b className="activity-row-name">{name}</b>
                    <span className="activity-row-action">{action}</span>
                  </span>
                  <span className="activity-row-sub">{supporting}</span>
                </span>
                <span className="rt activity-row-meta">
                  <span className={`badge ${item.severity === "failure" ? "red" : item.severity === "attention" ? "amber" : "muted"}`}>{categoryLabel(item.category)}</span>
                  {routeText && item.relatedRoute ? <span className="t-meta activity-row-route">{routeText}<span className="os-caret" aria-hidden="true" /></span> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {data && items.length > visible && <div className="card-pad" style={{ paddingTop: 12, paddingBottom: 12, borderTop: "1px solid var(--line)" }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisible((count) => count + 20)}>Show more</button></div>}
      {data?.hasMore && items.length <= visible && <div className="card-pad t-meta" style={{ borderTop: "1px solid var(--line)" }}>Showing the most recent available activity for this window.</div>}
    </section>

    {selectedItem && (() => {
      const name = operatorDisplayName(selectedItem.operatorKey);
      const routeText = routeLabel(selectedItem);
      return (
        <ResponsiveOverlay
          open
          onOpenChange={(next) => { if (!next) setSelectedItem(null); }}
          eyebrow={categoryLabel(selectedItem.category)}
          title={withoutLeadingOperatorName(name, selectedItem.title)}
          context={`${name} · ${timeLabel(selectedItem.occurredAt)}`}
          size="sm"
          footer={routeText && selectedItem.relatedRoute ? <Link className="btn btn-primary btn-sm" href={selectedItem.relatedRoute} style={{ textDecoration: "none" }}>{routeText}</Link> : undefined}
        >
          <dl className="kv activity-detail-facts">
            <div><dt>Operator</dt><dd>{name}</dd></div>
            <div><dt>Event type</dt><dd>{categoryLabel(selectedItem.category)}</dd></div>
            <div><dt>Status</dt><dd>{selectedItem.status.replace(/_/g, " ")}</dd></div>
            <div><dt>Occurred</dt><dd>{timeLabel(selectedItem.occurredAt)}</dd></div>
          </dl>
          <p className="t-compact activity-detail-description">{withoutLeadingOperatorName(name, selectedItem.description)}</p>
          {selectedItem.technicalEventId && (
            <details className="approval-details">
              <summary><span>Event reference</span></summary>
              <div className="approval-details-body">
                <dl className="kv">
                  <div><dt>Event reference</dt><dd className="t-mono">{selectedItem.technicalEventId}</dd></div>
                  <div><dt>Category</dt><dd className="t-mono">{selectedItem.category}</dd></div>
                </dl>
              </div>
            </details>
          )}
        </ResponsiveOverlay>
      );
    })()}
  </div>;
}
