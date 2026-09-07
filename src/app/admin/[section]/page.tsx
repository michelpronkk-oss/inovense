import type { Metadata } from "next";
import { getAdminSectionData } from "@/lib/admin/sections";

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
  return Object.entries(row).filter(([key]) => !["id", "workspace_id"].includes(key)).slice(0, 4).map(([key, value]) => <span key={key}><small>{key.replace(/_/g, " ")}</small>{String(value ?? "—")}</span>);
}
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const page = copy[section] ?? { label: "Internal", title: "Command center.", body: "This route has no internal intelligence view." }; const data = await getAdminSectionData(section);
  return <div className="admin-command-center"><div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${data.unavailable ? "partial" : "live"}`} /> Auterim / internal intelligence</div><h1>{page.title}</h1><p>{page.body}</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${data.unavailable ? "partial" : "live"}`}>{data.unavailable ? "Source unavailable" : "Read-only live source"}</span><span>{data.source}</span></div></div><div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 22 }}>{data.counts.map((item) => <article className="admin-kpi" key={item.label}><div className="admin-eyebrow">{item.label}</div><div className="admin-kpi-value">{item.value.toLocaleString()}</div><div className="admin-kpi-note">{data.source}</div></article>)}</div>{data.unavailable ? <div className="admin-empty-compact">{data.unavailable}</div> : <section className="admin-panel" style={{ marginTop: 12 }}><div className="admin-panel-head"><div className="admin-eyebrow">Latest records</div><h2>Operational detail</h2></div><div className="admin-record-list">{data.rows.length ? data.rows.map((row, index) => <div key={String(row.id ?? index)}>{cells(row)}</div>) : <div className="admin-empty-compact">No records available.</div>}</div></section>}</div>;
}
