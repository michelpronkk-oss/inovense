import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin intelligence | Auterim", robots: { index: false, follow: false } };

const pageCopy: Record<string, { label: string; title: string; body: string; source: string }> = {
  growth: { label: "Growth", title: "Acquisition intelligence.", body: "Traffic, preview starts and conversion will appear here as provider-backed analytics are connected.", source: "Traffic analytics source" },
  revenue: { label: "Revenue", title: "Revenue intelligence.", body: "Dodo subscription state is present in workspace records. Amount history is not yet normalized for reporting.", source: "Dodo Payments" },
  customers: { label: "Customers", title: "Customer intelligence.", body: "Workspace-level customer records will appear here without exposing credentials or session data.", source: "Supabase workspace tables" },
  sales: { label: "Sales", title: "Sales intelligence.", body: "The current CRM is available through leads and prospects. A HubSpot pipeline source is not yet connected.", source: "HubSpot / CRM" },
  usage: { label: "Product usage", title: "Usage intelligence.", body: "Operator runs and approvals are read from the execution tables. Deeper trend series will appear as usage aggregation is added.", source: "Auterim execution logs" },
  operators: { label: "Operators", title: "Operator intelligence.", body: "Operator analytics use the canonical operator registry and execution records. No second catalog is created here.", source: "Canonical operator registry" },
  connectors: { label: "Connectors", title: "Connector intelligence.", body: "Connection state will be shown from workspace connector records and the shared connector registry.", source: "Connector registry + Supabase" },
  health: { label: "System health", title: "System health.", body: "Failures and incidents will appear here from execution logs, webhook records and Trigger.dev observability.", source: "Execution logs + Trigger.dev" },
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const copy = pageCopy[section] ?? { label: "Internal", title: "Intelligence workspace.", body: "This internal surface is reserved for provider-backed business signal.", source: "Auterim data layer" };
  return <div className="admin-command-center"><div className="admin-page-intro"><div><div className="admin-kicker"><span className="admin-status-dot partial" /> Auterim / internal intelligence</div><h1>{copy.title}</h1><p>{copy.body}</p></div><div className="admin-intro-meta"><span className="admin-status-pill partial">Source pending</span><span>{copy.source}</span></div></div><div className="admin-grid-main" style={{ marginTop: 28 }}><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">{copy.label}</div><h2>Waiting for source-backed signal</h2></div><div className="admin-empty"><span className="admin-empty-mark">/</span><div><strong>No placeholder numbers are shown.</strong><p>Connect or normalize the source above and this view will populate with real records, definitions and period-aware comparisons.</p></div><Link href="/">Back to command center →</Link></div></section><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Data discipline</div><h2>Read-only by default</h2></div><div className="admin-empty-compact">Every metric must name its provider and remain unavailable until that provider can support it.</div></section></div></div>;
}
