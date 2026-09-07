import type { Metadata } from "next";
import { getRevenueData } from "@/lib/admin/revenue";

export const metadata: Metadata = { title: "Revenue | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const number = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString("en-US");
const currency = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Metric({ label: title, value, note }: { label: string; value: string; note: string }) {
  return <article className="admin-kpi"><div className="admin-eyebrow">{title}</div><div className={`admin-kpi-value${value === "Unavailable" ? " unavailable" : ""}`}>{value}</div><div className="admin-kpi-note">{note}</div></article>;
}

export default async function RevenuePage() {
  const data = await getRevenueData();
  const tone = data.sourceStatus === "connected" ? "live" : data.sourceStatus === "partial" ? "partial" : "offline";

  return <div className="admin-command-center admin-detail-page">
    <div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${tone}`} />Auterim / revenue</div><h1>Revenue health.</h1><p>Current subscription state, webhook processing, and normalized recurring revenue when billing facts are ready.</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${tone}`}>{data.sourceStatus === "connected" ? "Billing sources live" : data.sourceStatus === "partial" ? "Partial billing data" : "Sources unavailable"}</span><span>Read-only provider truth</span></div></div>
    <section className="admin-kpi-grid admin-kpi-grid-four"><Metric label="MRR" value={currency(data.mrr)} note={data.mrrNote} /><Metric label="Active subscriptions" value={number(data.subscriptionStates.active)} note="Workspace billing state" /><Metric label="Trialing" value={number(data.subscriptionStates.trialing)} note="Workspace billing state" /><Metric label="Past due" value={number(data.subscriptionStates.pastDue)} note="Workspace billing state" /></section>
    {data.unavailable ? <section className="admin-panel"><div className="admin-empty-compact">{data.unavailable}</div></section> : <><div className="admin-grid-main"><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Webhook processing</div><h2>Billing event health</h2></div><div className="admin-detail-signal-list"><div><span>Events received</span><strong>{number(data.billingEvents.received)}</strong></div><div><span>Processed</span><strong>{number(data.billingEvents.processed)}</strong></div><div><span>Needs review</span><strong className={data.billingEvents.needsReview ? "warning" : ""}>{number(data.billingEvents.needsReview)}</strong></div><div><span>Failed</span><strong className={data.billingEvents.failed ? "warning" : ""}>{number(data.billingEvents.failed)}</strong></div></div></section><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">MRR readiness</div><h2>Subscription reporting</h2></div><div className="admin-detail-callout"><span className={`admin-status-dot ${data.mrr !== null ? "live" : "partial"}`} /><div><strong>{data.mrr !== null ? "Recurring revenue is ready to report." : data.subscriptionsAvailable ? "Subscription facts need completion." : "Subscription facts need migration."}</strong><p>{data.mrrNote}</p></div></div></section></div><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Workspace billing</div><h2>Current entitlement state</h2></div>{data.workspaces.length ? <div className="admin-detail-table">{data.workspaces.map((workspace) => <div key={workspace.id}><div><strong>{workspace.name}</strong><small>Workspace</small></div><span><small>Plan</small>{label(workspace.plan)}</span><span><small>Billing state</small><b className={`admin-detail-state ${workspace.billingStatus === "active" ? "live" : workspace.billingStatus === "past_due" ? "warning" : ""}`}>{label(workspace.billingStatus)}</b></span><span><small>Updated</small>{workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleDateString("en-GB") : "Not reported"}</span></div>)}</div> : <div className="admin-empty-compact">No workspace billing records are available.</div>}</section></>}
  </div>;
}
