"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";
import { EmptyState, PageHeader } from "@/components/product-ui/page-primitives";
import { useOS } from "@/lib/os/app-provider";
import { getRealConnectedConnectors } from "@/lib/os/truth";

function relativeTime(value: string) {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
function label(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function color(status: string) { return status === "completed" ? "var(--green)" : status === "blocked" || status === "failed" ? "var(--rose)" : status.includes("approval") || status === "planned" ? "var(--amber)" : "var(--cyan)"; }

export default function WorkflowsPage() {
  const { state } = useOS();
  const searchParams = useSearchParams();
  const [workflows, setWorkflows] = useState<WorkflowPresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("workflow"));
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/workflows", { cache: "no-store" });
      const json = await response.json().catch(() => ({})) as { workflows?: WorkflowPresentation[]; error?: string };
      if (!response.ok) throw new Error(json.error || "Could not load workflows.");
      setWorkflows(json.workflows ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load workflows."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (searchParams.get("workflow")) setSelectedId(searchParams.get("workflow")); }, [searchParams]);
  const selected = useMemo(() => workflows.find((workflow) => workflow.id === selectedId) ?? null, [selectedId, workflows]);
  const active = workflows.filter((workflow) => ["planned", "awaiting_approval", "partially_approved", "executing", "blocked"].includes(workflow.status)).length;
  const waiting = workflows.filter((workflow) => workflow.steps.some((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"))).length;
  return <div className="os-page workflows-page">
    <PageHeader eyebrow="Coordinated work" title="Workflows" description="The plans Auterim is handling across your connected systems. You stay in control of every consequential action." actions={<Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>Review approvals</Link>} />
    {error && <div role="alert" className="p" style={{ padding: "12px 14px", color: "var(--rose)" }}>{error} <button className="btn btn-ghost btn-sm" onClick={() => void load()} style={{ marginLeft: 8 }}>Retry</button></div>}
    {loading ? <div className="p" style={{ padding: 20, color: "var(--text-mute)" }}>Loading real workflow activity…</div> : workflows.length === 0 ? <EmptyWorkflows connectedSystemCount={getRealConnectedConnectors(state.connectors).length} hasActiveOperator={state.agents.some((agent) => agent.status === "running")} /> : <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {[{ label: "Open workflows", value: active, detail: "Need attention or are moving forward" }, { label: "Ready for review", value: waiting, detail: "Have a safe next action prepared" }, { label: "Observed outcomes", value: workflows.reduce((sum, workflow) => sum + workflow.outcomes.length, 0), detail: "Evidence recorded after work completed" }].map((item) => <div className="kpi" key={item.label}><div className="lab">{item.label}</div><div className="kpi-val">{item.value}</div><div className="kpi-meta">{item.detail}</div></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0, 1fr) minmax(340px, .86fr)" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <section className="p" style={{ padding: 0, overflow: "hidden" }}><div className="p-head"><div><h3>Active and recent work</h3><div className="p-meta" style={{ marginTop: 3 }}>Each row is a real plan assembled from a connected-system signal.</div></div></div><div>{workflows.map((workflow) => <WorkflowRow key={workflow.id} workflow={workflow} selected={selectedId === workflow.id} onSelect={() => setSelectedId(workflow.id)} />)}</div></section>
        {selected && <WorkflowDetail workflow={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </>}
  </div>;
}

function EmptyWorkflows({ connectedSystemCount, hasActiveOperator }: { connectedSystemCount: number; hasActiveOperator: boolean }) {
  const stages = [["Detect", "Identify meaningful change"], ["Prepare", "Assemble the response"], ["Approve", "Review consequential action"], ["Execute", "Act through connected systems"], ["Measure", "Observe the result"]] as const;
  const noConnectedSystems = connectedSystemCount === 0;
  const title = noConnectedSystems ? "No workflows in progress" : hasActiveOperator ? "No workflows in progress" : "Your systems are ready for an operator";
  const description = noConnectedSystems
    ? "Connect a system so an operator can detect meaningful work and coordinate the next safe steps."
    : hasActiveOperator
      ? "Your operators are monitoring. When something needs coordinated action, the plan will appear here."
      : "When an operator detects something that needs coordinated action, the plan will appear here.";
  const action = noConnectedSystems ? { href: "/app/connectors", label: "Connect a system" } : hasActiveOperator ? null : { href: "/app/agents", label: "Activate an operator" };
  return <section className="workflows-page-empty workflow-empty-workspace" aria-label="Workflow workspace is empty">
    <div className="workflow-empty-copy">
      <span className="workflow-empty-kicker">Workflow workspace</span>
      <EmptyState title={title}>{description}</EmptyState>
      <div className="workflow-empty-actions">{action && <Link href={action.href} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>{action.label}</Link>}<Link href="/app/agents" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>View operators</Link></div>
    </div>
    <ol className="workflow-empty-lifecycle">{stages.map(([stage, detail], index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{stage}</strong><small>{detail}</small></div></li>)}</ol>
  </section>;
}
function WorkflowRow({ workflow, selected, onSelect }: { workflow: WorkflowPresentation; selected: boolean; onSelect: () => void }) { const done = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length; return <button type="button" onClick={onSelect} style={{ width: "100%", textAlign: "left", background: selected ? "rgba(77,232,225,0.055)" : "transparent", color: "inherit", border: 0, borderTop: "1px solid var(--line)", padding: "15px 18px", cursor: "pointer" }}><div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={{ fontSize: 13.5, fontWeight: 650 }}>{workflow.objective}</div><div style={{ marginTop: 4, fontSize: 12, color: "var(--text-mute)" }}>{workflow.operatorName}{workflow.source ? ` · Started from ${workflow.source.label}` : ""}</div></div><span style={{ color: color(workflow.status), fontSize: 11.5, whiteSpace: "nowrap" }}>{label(workflow.status)}</span></div><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, fontSize: 11.5, color: "var(--text-mute)" }}><span>{done} of {workflow.steps.length} steps complete{workflow.priority === "high" ? " · High priority" : ""}</span><span>{relativeTime(workflow.createdAt)}</span></div></button>; }
function WorkflowDetail({ workflow, onClose }: { workflow: WorkflowPresentation; onClose: () => void }) { const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length; return <aside className="p" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 16 }}><div className="p-head" style={{ alignItems: "flex-start" }}><div><div className="p-meta">Workflow detail</div><h3 style={{ marginTop: 6 }}>{workflow.objective}</h3></div><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div><div style={{ padding: "0 18px 18px", display: "grid", gap: 17 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}><Info label="Owned by" value={workflow.operatorName} /><Info label="Progress" value={`${completed} of ${workflow.steps.length} steps`} /><Info label="Priority" value={label(workflow.priority)} /><Info label="Started" value={relativeTime(workflow.createdAt)} /></div><div><div className="p-meta">Why this started</div><div style={{ marginTop: 6, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5 }}>{workflow.whyStarted.length ? workflow.whyStarted.join(" ") : "Auterim identified a meaningful signal and prepared the next safe steps."}</div>{workflow.source && <div style={{ marginTop: 7, color: "var(--text-mute)", fontSize: 11.5 }}>Source: {workflow.source.label}{workflow.source.detail ? ` · ${workflow.source.detail}` : ""}</div>}</div><div><div className="p-meta">Next attention</div><div style={{ marginTop: 6, padding: "10px 11px", borderRadius: 9, background: "rgba(255,255,255,.025)", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.45 }}>{workflow.nextAttention}</div></div><div><div className="p-meta">Plan</div><div style={{ marginTop: 8, display: "grid", gap: 7 }}>{workflow.steps.length ? workflow.steps.map((step) => <div key={step.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 8, fontSize: 12 }}><div style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(77,232,225,.08)", color: color(step.status), fontSize: 10 }}>{step.order}</div><div><div style={{ color: "var(--text-dim)", fontWeight: 600 }}>{step.label}</div><div style={{ marginTop: 2, color: "var(--text-mute)" }}>{step.destination} · {label(step.status)}</div>{step.blocker && <div style={{ marginTop: 3, color: "var(--rose)" }}>{step.blocker}</div>}{step.approvalId && <Link href="/app/approvals" style={{ display: "inline-block", marginTop: 4, fontSize: 11.5, color: "var(--cyan)" }}>Open approval →</Link>}</div></div>) : <div style={{ fontSize: 12, color: "var(--text-mute)" }}>No steps have been recorded for this workflow.</div>}</div></div><div><div className="p-meta">Outcome evidence</div><div style={{ marginTop: 7, display: "grid", gap: 6 }}>{workflow.outcomes.length ? workflow.outcomes.map((outcome) => <div key={outcome.id} style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{outcome.label} <span style={{ color: "var(--text-mute)" }}>· {outcome.attribution} · {relativeTime(outcome.observedAt)}</span></div>) : <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.45 }}>No outcome has been observed yet. Auterim only records evidence after the connected system confirms it.</div>}</div></div></div></aside>; }
function Info({ label, value }: { label: string; value: string }) { return <div><div className="p-meta">{label}</div><div style={{ marginTop: 4, color: "var(--text-dim)" }}>{value}</div></div>; }
