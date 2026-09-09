"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";
import { EmptyState, LoopRail, MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";
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
      <MetricStrip className="workflow-metric-strip" items={[
        { label: "Open workflows", value: active, detail: "Need attention or are moving forward" },
        { label: "Ready for review", value: waiting, detail: "Have a safe next action prepared" },
        { label: "Observed outcomes", value: workflows.reduce((sum, workflow) => sum + workflow.outcomes.length, 0), detail: "Evidence recorded after work completed" },
      ]} />
      <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0, 1fr) minmax(340px, .86fr)" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <section className="p" style={{ padding: 0, overflow: "hidden" }}><div className="p-head"><div><h3>Active and recent work</h3><div className="p-meta" style={{ marginTop: 3 }}>Each row is a real plan assembled from a connected-system signal.</div></div></div><div>{workflows.map((workflow) => <WorkflowRow key={workflow.id} workflow={workflow} selected={selectedId === workflow.id} onSelect={() => setSelectedId(workflow.id)} />)}</div></section>
        {selected && <WorkflowDetail workflow={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </>}
  </div>;
}

function EmptyWorkflows({ connectedSystemCount, hasActiveOperator }: { connectedSystemCount: number; hasActiveOperator: boolean }) {
  const stages = [["Detect", "Meaningful change found"], ["Prepare", "Response assembled"], ["Approve", "Human review"], ["Execute", "Action taken"], ["Measure", "Outcome observed"]] as const;
  const noConnectedSystems = connectedSystemCount === 0;
  // One truthful state drives the status line, the description and the single
  // call to action together -- never a CTA that contradicts the status.
  const state = noConnectedSystems
    ? { tone: "idle" as const, status: "No systems connected", description: "Connect a system so an operator can detect meaningful work and coordinate the next safe steps.", action: { href: "/app/connectors", label: "Connect a system" } }
    : hasActiveOperator
      ? { tone: "live" as const, status: "Operators monitoring", description: "Your operators are monitoring. Coordinated work will appear here when action is needed.", action: null }
      : { tone: "waiting" as const, status: "Waiting for an operator", description: "When an operator detects something that needs coordinated action, the plan will appear here.", action: { href: "/app/agents", label: "Activate an operator" } };
  return <section className="workflows-page-empty workflow-empty-workspace" aria-label="Workflow workspace is empty">
    <header className="workflow-empty-head">
      <span className="workflow-empty-kicker">Workflow workspace</span>
      <span className={`workflow-empty-state tone-${state.tone}`}><i aria-hidden />{state.status}</span>
    </header>
    <div className="workflow-empty-copy">
      <EmptyState title="No workflows in progress">{state.description}</EmptyState>
    </div>
    <LoopRail className="workflow-empty-lifecycle" stages={stages.map(([label, detail]) => ({ label, detail }))} />
    <footer className="workflow-empty-foot">
      <p>Workflows bring together context, approvals, execution, and outcome tracking.</p>
      {state.action && <Link href={state.action.href} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>{state.action.label}</Link>}
    </footer>
  </section>;
}
function WorkflowRow({ workflow, selected, onSelect }: { workflow: WorkflowPresentation; selected: boolean; onSelect: () => void }) {
  const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  const blocker = workflow.steps.find((step) => step.blocker)?.blocker ?? workflow.nextAttention;
  return <button type="button" className="workflow-operational-row" data-selected={selected || undefined} onClick={onSelect}>
    <span className="workflow-row-primary"><strong>{workflow.objective}</strong><small>{workflow.operatorName}{workflow.source ? ` · ${workflow.source.label}` : ""}</small></span>
    <span className="workflow-row-meta"><small>Priority</small><strong>{label(workflow.priority)}</strong></span>
    <span className="workflow-row-meta"><small>Progress</small><strong>{completed} of {workflow.steps.length}</strong></span>
    <span className="workflow-row-attention"><small>{blocker ? "Next attention" : "Updated"}</small><strong>{blocker || relativeTime(workflow.createdAt)}</strong></span>
    <span className="workflow-status" style={{ color: color(workflow.status) }}>{label(workflow.status)}</span>
  </button>;
}

function WorkflowDetail({ workflow, onClose }: { workflow: WorkflowPresentation; onClose: () => void }) {
  const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  return <aside className="p workflow-detail" aria-label={`Workflow detail: ${workflow.objective}`}>
    <div className="p-head workflow-detail-head"><div><span className="p-meta">Workflow detail</span><h3>{workflow.objective}</h3></div><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
    <div className="workflow-detail-body">
      <dl className="workflow-facts"><div><dt>Owner</dt><dd>{workflow.operatorName}</dd></div><div><dt>Source</dt><dd>{workflow.source?.label ?? "Workspace signal"}</dd></div><div><dt>Priority</dt><dd>{label(workflow.priority)}</dd></div><div><dt>Progress</dt><dd>{completed} of {workflow.steps.length} steps</dd></div></dl>
      <section className="workflow-detail-section"><h4>Why this started</h4><p>{workflow.whyStarted.length ? workflow.whyStarted.join(" ") : "Auterim identified a meaningful signal and prepared the next safe steps."}</p>{workflow.source?.detail && <small>{workflow.source.detail}</small>}</section>
      <section className="workflow-next-attention"><span>Next attention</span><strong>{workflow.nextAttention}</strong></section>
      <section className="workflow-detail-section"><h4>Prepared response plan</h4><ol className="workflow-step-list">{workflow.steps.length ? workflow.steps.map((step) => <li key={step.id} data-status={step.status}><span>{step.order}</span><div><strong>{step.label}</strong><small>{step.destination} · {label(step.status)}</small>{step.blocker && <em>{step.blocker}</em>}{step.approvalId && <Link href="/app/approvals">Open approval</Link>}</div></li>) : <li className="workflow-no-steps">No steps have been recorded for this workflow.</li>}</ol></section>
      <section className="workflow-detail-section"><h4>Outcome evidence</h4>{workflow.outcomes.length ? <ul className="workflow-outcomes">{workflow.outcomes.map((outcome) => <li key={outcome.id}><strong>{outcome.label}</strong><small>{outcome.attribution} · {relativeTime(outcome.observedAt)}</small></li>)}</ul> : <p>No outcome has been observed yet. Evidence appears after a connected system confirms it.</p>}</section>
    </div>
  </aside>;
}
