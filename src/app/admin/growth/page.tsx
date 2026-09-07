import type { Metadata } from "next";
import Link from "next/link";
import { getGrowthData, type GrowthRange } from "@/lib/admin/growth";

export const metadata: Metadata = { title: "Growth | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ranges: Array<{ key: GrowthRange; label: string }> = [{ key: "7d", label: "7D" }, { key: "30d", label: "30D" }, { key: "90d", label: "90D" }, { key: "ytd", label: "YTD" }];
const count = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString("en-US");
const rate = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = ranges.some((item) => item.key === params.range) ? params.range as GrowthRange : "30d";
  const data = await getGrowthData(range);
  const tone = data.sourceStatus === "connected" ? "live" : data.sourceStatus === "partial" ? "partial" : "offline";
  const stages = [
    { label: "Visitors", value: data.visitors, note: "Captured marketing sessions" },
    { label: "Workspaces created", value: data.workspacesCreated, note: "New self-serve workspaces" },
    ...(data.trialsStarted === null ? [] : [{ label: "Trials started", value: data.trialsStarted, note: "First-time trials started in this window" }]),
    { label: "Running workspaces", value: data.workspacesRunning, note: "New workspaces with an operator run" },
    { label: "Paid workspaces", value: data.paidWorkspaces, note: "New workspaces currently active" },
  ];

  return <div className="admin-command-center admin-growth-page">
    <div className="admin-page-intro"><div><div className="admin-kicker"><span className={`admin-status-dot ${tone}`} />Auterim / product growth</div><h1>From first visit to useful work.</h1><p>Follow the self-serve path from marketing interest into a workspace that activates an operator.</p></div><div className="admin-intro-meta"><span className={`admin-status-pill ${tone}`}>{data.sourceStatus === "connected" ? "Product sources live" : data.sourceStatus === "partial" ? "Partial product data" : "Sources unavailable"}</span><span>Self-serve lifecycle</span></div></div>
    <div className="admin-toolbar"><div className="admin-eyebrow">Reporting window</div><div className="admin-range-group">{ranges.map((item) => <Link key={item.key} href={`/growth?range=${item.key}`} className={item.key === range ? "active" : ""}>{item.label}</Link>)}</div><span className="admin-toolbar-source">Traffic · workspaces · operator runtime</span></div>
    <section className="admin-growth-path" aria-label="Self-serve product lifecycle">{stages.map((stage, index) => <div className="admin-growth-stage" key={stage.label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{count(stage.value)}</strong><b>{stage.label}</b><small>{stage.note}</small>{index < stages.length - 1 && <i aria-hidden />}</div>)}</section>
    <div className="admin-growth-rates"><div><span>Visitor → workspace</span><strong>{rate(data.visitorToWorkspaceRate)}</strong><small>Period volume, not person-level attribution</small></div><div><span>Workspace → running</span><strong>{rate(data.workspaceActivationRate)}</strong><small>Workspace has at least one recorded operator run</small></div><div><span>Workspace → paid</span><strong>{rate(data.paidWorkspaceRate)}</strong><small>Workspace is currently on an active subscription</small></div></div>
    {data.unavailable ? <section className="admin-panel"><div className="admin-empty-compact">{data.unavailable}</div></section> : <><div className="admin-grid-main"><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Acquisition</div><h2>Where visitors first arrive</h2></div>{data.landingPaths.length ? <div className="admin-growth-list">{data.landingPaths.map((item) => <div key={item.path}><span>{item.path}</span><strong>{item.visitors.toLocaleString()} visitors</strong></div>)}</div> : <div className="admin-empty-compact">No captured entry pages in this window.</div>}</section><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Attribution</div><h2>First-touch sources</h2></div>{data.sources.length ? <div className="admin-growth-list">{data.sources.map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.visitors.toLocaleString()} visitors</strong></div>)}</div> : <div className="admin-empty-compact">No source tags captured in this window.</div>}</section></div><section className="admin-panel"><div className="admin-panel-head"><div className="admin-eyebrow">Workspace cohort</div><h2>New workspaces in this window</h2></div>{data.recentWorkspaces.length ? <div className="admin-growth-workspaces">{data.recentWorkspaces.map((workspace) => <div key={workspace.id}><div><strong>{workspace.name}</strong><small>Created {new Date(workspace.createdAt).toLocaleDateString("en-GB")}</small></div><span className={`admin-growth-state ${workspace.running ? "live" : ""}`}>{workspace.running ? "Running" : "Not running yet"}</span><span className={`admin-growth-state ${workspace.billingStatus === "active" ? "live" : ""}`}>{workspace.billingStatus === "active" ? "Paid" : workspace.billingStatus}</span></div>)}</div> : <div className="admin-empty-compact">No workspaces were created in this window.</div>}</section></>}
  </div>;
}
