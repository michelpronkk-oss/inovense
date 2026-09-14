import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOverview, type AdminRange } from "@/lib/admin/analytics/overview";
import { getEarlyAccessOverview } from "@/lib/admin/early-access";
import { getAdminCommandCounts } from "@/lib/admin/workspaces";

export const metadata: Metadata = { title: "Command center | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ranges: Array<{ key: AdminRange; label: string }> = [
  { key: "today", label: "Today" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" }, { key: "90d", label: "90D" }, { key: "ytd", label: "YTD" },
];

function display(value: number | null, kind: "number" | "currency" | "percent" = "number") {
  if (value === null) return "—";
  if (kind === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  return kind === "percent" ? `${(value * 100).toFixed(1)}%` : value.toLocaleString("en-US");
}

function Kpi({ label, value, note, kind }: { label: string; value: number | null; note: string; kind?: "number" | "currency" | "percent" }) {
  return <article className="admin-kpi"><div className="admin-eyebrow">{label}</div><div className={`admin-kpi-value${value === null ? " unavailable" : ""}`}>{value === null ? "Unavailable" : display(value, kind)}</div><div className="admin-kpi-note">{note}</div></article>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel-head"><div>{eyebrow && <div className="admin-eyebrow">{eyebrow}</div>}<h2>{title}</h2></div></div>{children}</section>;
}

function EarlyAccessCommandBlock({ data }: { data: Awaited<ReturnType<typeof getEarlyAccessOverview>> }) {
  const metric = (label: string, value: number | null) => <div className="ea-home-metric" key={label}><span>{label}</span><strong>{value === null ? "Unavailable" : value.toLocaleString("en-US")}</strong></div>;
  const statusLabel: Record<string, string> = { requested: "Requested", reviewing: "Reviewing" };
  return <section className="ea-home-block" aria-label="Early Access operations">
    <div className="ea-home-heading"><div><div className="admin-eyebrow">Founder workflow · Early Access</div><h2>Applicant pipeline</h2></div><Link href="/early-access">Open applicant queue <span aria-hidden>→</span></Link></div>
    {!data.available ? <div className="ea-home-unavailable">Early Access source unavailable. No request totals or attribution are being reported.</div> : <>
      <div className="ea-home-metrics">
        {metric("Total requests", data.total)}{metric("New today · UTC", data.today)}{metric("New · 7 days", data.last7Days)}
        {metric("Reviewing", data.statuses.reviewing)}{metric("Invited", data.statuses.invited)}{metric("Accepted", data.statuses.accepted)}
      </div>
      <div className="ea-home-lower">
        <div className="ea-home-queue">
          <div className="ea-home-subhead"><div><span>Attention</span><strong>{(data.statuses.requested ?? 0) + (data.statuses.reviewing ?? 0)} need review</strong></div><small>{data.emailFailures} confirmation emails attempted without a recorded send</small></div>
          {data.reviewQueue.length ? data.reviewQueue.map((item) => <Link className="ea-home-request" href={`/early-access/${item.id}`} key={item.id}><span className="ea-home-request-initial">{item.name.trim().charAt(0).toUpperCase() || "•"}</span><span className="ea-home-request-main"><strong>{item.name} <small>{item.company}</small></strong><span>{item.use_case}</span></span><span className={`ea-status ea-status-${item.status}`}>{statusLabel[item.status] ?? item.status}</span><span className="ea-home-arrow" aria-hidden>↗</span></Link>) : <div className="ea-home-empty">No Early Access requests currently need review.</div>}
        </div>
        <div className="ea-home-attribution">
          <div className="ea-home-subhead"><div><span>Acquisition</span><strong>Recent attribution</strong></div><small>Latest {data.attributionSampleSize.toLocaleString()} requests</small></div>
          <div className="ea-home-breakdowns">
            <div><span className="ea-home-breakdown-title">Top sources</span>{data.attribution.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div><span className="ea-home-breakdown-title">UTM sources</span>{data.utmSources.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div><span className="ea-home-breakdown-title">Campaigns · accepted</span>{data.campaigns.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.accepted}/{item.value}</strong></div>)}</div>
            <div><span className="ea-home-breakdown-title">UTM medium</span>{data.utmMediums.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div><span className="ea-home-breakdown-title">Team size</span>{data.teamSizes.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div><span className="ea-home-breakdown-title">Plan interest</span>{data.plans.map((item) => <div className="ea-home-breakdown-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
          </div>
          <div className="ea-home-x-signal"><span>Tagged or referred from X</span><strong>{data.fromX ?? "Unavailable"}</strong><small>Within the same recent attribution sample</small></div>
        </div>
      </div>
    </>}
  </section>;
}

function OperationsCountStrip({ data }: { data: Awaited<ReturnType<typeof getAdminCommandCounts>> }) {
  const metrics = [
    ["Workspaces", data.totalWorkspaces], ["Active trials", data.activeTrials], ["Expired trials", data.expiredTrials],
    ["Paid subscriptions", data.activePaidSubscriptions], ["Configured operators", data.configuredOperators], ["Connector issues", data.connectorIssues],
    ["Billing issue records", data.billingIssues], ["Pending approvals", data.pendingApprovals], ["Failed runs · 7d", data.failedRuns7d],
  ] as const;
  return <section className="admin-ops-strip" aria-label="Workspace, billing, and product state">
    {metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value === null ? "Unavailable" : value.toLocaleString("en-US")}</strong></div>)}
    <p>Trials and paid subscriptions are counted separately. Connector issues reflect stored status; billing issues combine failed or held subscription and webhook records.</p>
  </section>;
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = ranges.some((item) => item.key === params.range) ? params.range as AdminRange : "30d";
  const [data, earlyAccess, operations] = await Promise.all([getAdminOverview(range), getEarlyAccessOverview(), getAdminCommandCounts()]);
  const tone = data.sourceStatus === "connected" ? "live" : data.sourceStatus === "partial" ? "partial" : "offline";

  return <div className="admin-command-center">
    <div className="admin-page-intro">
      <div><div className="admin-kicker"><span className={`admin-status-dot ${tone}`} />Auterim / internal operations</div><h1>Founder command center.</h1><p>Early Access demand, customer state, revenue, product use and operational signal in one place.</p></div>
      <div className="admin-intro-meta"><span className={`admin-status-pill ${tone}`}>{data.sourceStatus === "connected" ? "Sources live" : data.sourceStatus === "partial" ? "Partial sources" : "Connect sources"}</span><span>Updated {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></div>
    </div>
    <EarlyAccessCommandBlock data={earlyAccess} />
    <OperationsCountStrip data={operations} />
    <div className="admin-toolbar"><div className="admin-eyebrow">Reporting window</div><div className="admin-range-group">{ranges.map((item) => <Link key={item.key} href={`/?range=${item.key}`} className={item.key === range ? "active" : ""}>{item.label}</Link>)}</div><span className="admin-toolbar-source">Read-only · provider truth only</span></div>
    <div className="admin-kpi-grid"><Kpi label="MRR" value={data.kpis.mrr.value} note={data.kpis.mrr.label} kind="currency" /><Kpi label="Billing-state workspaces" value={data.kpis.activeSubscriptions.value} note={data.kpis.activeSubscriptions.label} /><Kpi label="Updated workspaces" value={data.kpis.activeWorkspaces.value} note={data.kpis.activeWorkspaces.label} /><Kpi label="New workspaces" value={data.kpis.newCustomers.value} note={data.kpis.newCustomers.label} /><Kpi label="Visitor conversion" value={data.kpis.previewConversion.value} note={data.kpis.previewConversion.label} kind="percent" /><Kpi label="Runs" value={data.kpis.runs.value} note={data.kpis.runs.label} /></div>
    <div className="admin-grid-main"><Panel eyebrow="Trial lifecycle" title="First-time trials">{data.trials.available ? <div className="admin-signal-list"><div><span>Active</span><strong>{display(data.trials.active)}</strong></div><div><span>Ending in 24h</span><strong>{display(data.trials.endingSoon)}</strong></div><div><span>Converted</span><strong>{display(data.trials.converted)}</strong></div><div><span>Expired</span><strong>{display(data.trials.expired)}</strong></div></div> : <div className="admin-empty-compact">Apply the trial lifecycle migration to report customer trial state.</div>}<Link className="admin-panel-link" href="/revenue">Review billing lifecycle</Link></Panel></div>
    <div className="admin-grid-main">
      <Panel eyebrow="Revenue" title="Revenue signal"><div className="admin-empty"><span className="admin-empty-mark">/</span><div><strong>{data.revenue.available ? "Revenue data is normalized from Dodo subscriptions." : "Revenue reporting is waiting for normalized Dodo data."}</strong><p>{data.revenue.reason}</p></div><Link href="/revenue">Review revenue →</Link></div></Panel>
      <Panel eyebrow="Acquisition" title="Self-serve lifecycle"><div className="admin-funnel">{[["Visitors", data.growth.visits], ["Preview", data.growth.previews], ["Workspaces", data.growth.workspaces], ["Paid", data.growth.paid]].map(([label, value], index) => <div className="admin-funnel-step" key={String(label)}><div className="admin-funnel-index">0{index + 1}</div><div className="admin-funnel-label">{label}</div><div className="admin-funnel-value">{display(value as number | null)}</div>{index < 3 && <div className="admin-funnel-line" />}</div>)}</div>{!data.growth.funnelAvailable && <p className="admin-muted">Traffic or workspace sources are unavailable.</p>}</Panel>
    </div>
    <div className="admin-grid-main">
      <Panel eyebrow="Product usage" title="Execution pulse"><div className="admin-signal-list"><div><span>Operator runs</span><strong>{display(data.usage.runs)}</strong></div><div><span>Approvals created</span><strong>{display(data.usage.approvals)}</strong></div><div><span>Failed runs</span><strong className={data.usage.failedRuns ? "warning" : ""}>{display(data.usage.failedRuns)}</strong></div></div><Link className="admin-panel-link" href="/product">Open product usage →</Link></Panel>
      <Panel eyebrow="Runtime" title="Most used operators">{data.operators.length ? <div className="admin-rank-list">{data.operators.map((item, index) => <div key={item.key}><span className="admin-rank">0{index + 1}</span><span>{item.label}</span><strong>{item.runs.toLocaleString()} runs</strong></div>)}</div> : <div className="admin-empty-compact">No operator run data available yet.</div>}<Link className="admin-panel-link" href="/operators">Operator analytics →</Link></Panel>
    </div>
    <div className="admin-grid-bottom">
      <Panel eyebrow="Connectors" title="Connection state">{data.connectors.length ? <div className="admin-connector-list">{data.connectors.map((item) => <div key={item.name}><span className={`admin-status-dot ${item.connected ? "live" : ""}`} />{item.name}<small>{item.connected ? "Connected" : item.status}</small></div>)}</div> : <div className="admin-empty-compact">No connector records available.</div>}</Panel>
      <Panel eyebrow="Activity" title="Latest signal">{data.activity.length ? <div className="admin-activity-list">{data.activity.slice(0, 5).map((item) => <div key={item.id}><span className="admin-status-dot live" /><div><strong>{item.type.replace(/[._]/g, " ")}</strong><small>{item.entity} · {new Date(item.createdAt).toLocaleDateString("en-GB")}</small></div></div>)}</div> : <div className="admin-empty-compact">No event stream available yet.</div>}</Panel>
    </div>
  </div>;
}
