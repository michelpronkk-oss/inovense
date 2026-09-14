import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSectionData } from "@/lib/admin/sections";
import { getPlanLabel } from "@/lib/os/truth";
import { getAdminCommandCounts, getAdminWorkspaceData } from "@/lib/admin/workspaces";

export const metadata: Metadata = { title: "Command center | Auterim", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const copy: Record<string, { label: string; title: string; body: string }> = {
  growth: { label: "Growth", title: "Activation intelligence.", body: "Traffic remains unavailable until a privacy-safe analytics source is connected. Product activation is shown from workspace records where available." },
  revenue: { label: "Revenue", title: "Current-state revenue.", body: "Billing events are preserved, but recurring amounts and intervals are not normalized. MRR and ARR remain unavailable rather than estimated." },
  customers: { label: "Customers", title: "Customer workspaces.", body: "Read-only workspace identity and billing state. Credentials and customer content are never shown." },
  product: { label: "Product", title: "Product adoption.", body: "Connector and operator activity are shown from the current operational records." },
  connectors: { label: "Connectors", title: "Connector intelligence.", body: "Connection state is aggregated from workspace connector records." },
  operators: { label: "Operators", title: "Operator intelligence.", body: "Run volume and failure state are derived from the operator runtime." },
  support: { label: "Support", title: "Support queue.", body: "Read-only support requests, ordered by most recent submission." },
  feedback: { label: "Feedback", title: "Product demand.", body: "Feedback and connector demand are read directly from customer submissions." },
  "system-health": { label: "System health", title: "Runtime health.", body: "Operator failures are shown where runtime records exist. Provider checks without stored results remain unavailable." },
};

function cells(row: Record<string, unknown>) {
  row = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === "plan_tier" || key === "plan" ? getPlanLabel(String(value ?? "preview")) : value]));
  return Object.entries(row).filter(([key]) => !["id", "workspace_id"].includes(key)).slice(0, 4).map(([key, value]) => <span key={key}><small>{key.replace(/_/g, " ")}</small>{String(value ?? "—")}</span>);
}

const showDate = (value: string) => value.includes("T") ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : value;
const queryPage = (page: number) => `/customers?page=${page}`;

async function AdminWorkspacesPage({ requestedPage }: { requestedPage: number }) {
  const [data, counts] = await Promise.all([getAdminWorkspaceData(requestedPage), getAdminCommandCounts()]);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const summary = [
    ["Total workspaces", counts.totalWorkspaces], ["Active trials", counts.activeTrials], ["Expired trials", counts.expiredTrials],
    ["Paid subscriptions", counts.activePaidSubscriptions], ["Configured operators", counts.configuredOperators],
    ["Connector issues", counts.connectorIssues], ["Approvals pending", counts.pendingApprovals],
  ] as const;
  const value = (item: number | null) => item === null ? "Unavailable" : item.toLocaleString("en-US");
  const tone = (entitlement: string) => entitlement === "Paid active" || entitlement === "Trial active" ? "live" : entitlement === "Past due" || entitlement === "Expired trial" ? "warning" : "muted";

  return <div className="admin-command-center admin-workspaces-page">
    <div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${data.available ? "live" : "partial"}`} />Auterim / Workspaces</div><h1>Workspace state.</h1><p>Plan identity, product entitlement, trial lifecycle, and provider subscription are shown as separate facts.</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${data.available ? "live" : "partial"}`}>{data.total.toLocaleString()} workspaces</span></div></div>
    <div className="workspace-count-strip">{summary.map(([label, number]) => <div key={label}><span>{label}</span><strong>{value(number)}</strong></div>)}</div>
    {!data.available ? <section className="admin-panel"><p className="admin-empty-compact">Workspace records are unavailable in the current database.</p></section> : <>
      <section className="workspace-list-panel">
        <div className="workspace-list-heading"><div><div className="admin-eyebrow">Customer operations</div><h2>Latest workspaces</h2></div><span>Showing {(data.page - 1) * data.pageSize + (data.rows.length ? 1 : 0)}–{Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString()}</span></div>
        {data.rows.length ? <>
          <div className="workspace-desktop-wrap"><table className="workspace-table"><thead><tr><th>Workspace / owner</th><th>Plan</th><th>Entitlement</th><th>Trial</th><th>Subscription</th><th>Operators</th><th>Connectors</th><th>Approvals</th><th>Last operator run</th></tr></thead><tbody>
            {data.rows.map((workspace) => <tr key={workspace.id}>
              <td><strong>{workspace.name}</strong><small>{workspace.owner}</small></td>
              <td><span className="workspace-plan">{workspace.plan}</span></td>
              <td><span className={`workspace-state ${tone(workspace.entitlement)}`}>{workspace.entitlement}</span></td>
              <td>{workspace.trial}</td><td><span className={`workspace-subscription ${workspace.subscription === "Active" ? "live" : ""}`}>{workspace.subscription}</span></td>
              <td>{workspace.operators}</td><td>{workspace.connectors}</td><td>{workspace.approvals}</td><td>{showDate(workspace.lastActivity)}</td>
            </tr>)}
          </tbody></table></div>
          <div className="workspace-mobile-list">{data.rows.map((workspace) => <article className="workspace-mobile-card" key={workspace.id}>
            <div className="workspace-mobile-heading"><div><strong>{workspace.name}</strong><small>{workspace.owner}</small></div><span className={`workspace-state ${tone(workspace.entitlement)}`}>{workspace.entitlement}</span></div>
            <div className="workspace-mobile-state-grid"><span><small>Plan</small>{workspace.plan}</span><span><small>Trial</small>{workspace.trial}</span><span><small>Subscription</small>{workspace.subscription}</span><span><small>Operators</small>{workspace.operators}</span><span><small>Connectors</small>{workspace.connectors}</span><span><small>Pending approvals</small>{workspace.approvals}</span></div>
            <div className="workspace-mobile-last">Last operator run · {showDate(workspace.lastActivity)}</div>
          </article>)}</div>
        </> : <div className="admin-empty-compact">No workspaces are available on this page.</div>}
        <nav className="workspace-pagination" aria-label="Workspace pages"><Link aria-disabled={data.page <= 1} href={queryPage(Math.max(1, data.page - 1))}>← Previous</Link><span>Page {data.page} of {totalPages}</span><Link aria-disabled={data.page >= totalPages} href={queryPage(Math.min(totalPages, data.page + 1))}>Next →</Link></nav>
      </section>
      <div className="workspace-source-note">Entitlement reads from workspace billing state, trial lifecycle from trial records, and subscription from the normalized Dodo snapshot. Connector health is the last stored status, not a live provider probe. Operator activations count as active only when entitlement is currently usable. {data.sources.length !== 8 && <>Unavailable sources: {data.sources.join(", ")}.</>}</div>
    </>}
  </div>;
}

export default async function AdminSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ section }, query] = await Promise.all([params, searchParams]);
  if (section === "customers") {
    const page = Array.isArray(query.page) ? query.page[0] : query.page;
    return <AdminWorkspacesPage requestedPage={Number(page ?? "1")} />;
  }
  const page = copy[section] ?? { label: "Internal", title: "Command center.", body: "This route has no internal intelligence view." };
  const data = await getAdminSectionData(section);
  const sourceTone = data.unavailable ? "partial" : "live";

  return <div className="admin-command-center">
    <div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${sourceTone}`} />Auterim / {page.label}</div><h1>{page.title}</h1><p>{page.body}</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${sourceTone}`}>{data.unavailable ? "Source unavailable" : "Read-only live source"}</span><span>{data.source}</span></div></div>
    <div className="admin-kpi-grid admin-kpi-grid-three">{data.counts.map((item) => <article className="admin-kpi" key={item.label}><div className="admin-eyebrow">{item.label}</div><div className="admin-kpi-value">{item.value.toLocaleString()}</div><div className="admin-kpi-note">{data.source}</div></article>)}</div>
    {data.unavailable ? <div className="admin-empty-compact">{data.unavailable}</div> : <section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Latest records</div><h2>Operational detail</h2></div><div className="admin-record-list">{data.rows.length ? data.rows.map((row, index) => <div key={String(row.id ?? index)}>{cells(row)}</div>) : <div className="admin-empty-compact">No records available.</div>}</div></section>}
  </div>;
}
