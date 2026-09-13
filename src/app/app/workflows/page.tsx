"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkflowPresentation, WorkflowStepPresentation } from "@/lib/workflows/presentation";
import { loopStageForStatus } from "@/lib/workflows/stage";
import { ActivityAvatar } from "@/components/activity/activity-avatar";
import { LoopRail, PageHeader } from "@/components/product-ui/page-primitives";
import { useOS } from "@/lib/os/app-provider";
import { getRealConnectedConnectors } from "@/lib/os/truth";

const LOOP_STAGES = [["Detect", "Meaningful change found"], ["Prepare", "Response assembled"], ["Approve", "Human review"], ["Execute", "Action taken"], ["Measure", "Outcome observed"]] as const;

function relativeTime(value: string) {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
function label(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function badgeTone(status: string): "green" | "red" | "amber" | "cyan" | "muted" {
  if (status === "completed" || status === "partially_completed") return "green";
  if (status === "blocked" || status === "failed") return "red";
  if (status.includes("approval")) return "amber";
  if (status === "executing") return "cyan";
  return "muted";
}

function workflowStatusLabel(status: string) {
  if (status === "planned") return "Detecting";
  if (status === "partially_approved") return "Awaiting approval";
  if (status === "failed") return "Blocked";
  return label(status);
}

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
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const requested = searchParams.get("workflow");
    if (!requested) return;
    const timer = window.setTimeout(() => setSelectedId(requested), 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);
  const selected = useMemo(() => workflows.find((workflow) => workflow.id === selectedId) ?? null, [selectedId, workflows]);
  const openWorkflows = workflows.filter((workflow) => !["completed", "partially_completed", "cancelled"].includes(workflow.status));
  const selectedIsHistory = Boolean(selected && !openWorkflows.some((workflow) => workflow.id === selected.id));
  const displayedWorkflows = selectedIsHistory && selected ? [selected, ...openWorkflows] : openWorkflows;
  const active = openWorkflows.length;
  const waiting = openWorkflows.filter((workflow) => workflow.steps.some((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"))).length;
  const blocked = openWorkflows.filter((workflow) => workflow.status === "blocked" || workflow.status === "failed").length;
  const workflowSummary = [
    `${active} open`,
    waiting > 0 ? `${waiting} awaiting approval` : null,
    blocked > 0 ? `${blocked} blocked` : null,
  ].filter(Boolean).join(" · ");
  return <div className="os-page workflows-page">
    <PageHeader eyebrow="Coordinated work" title="Workflows" description="The plans Auterim is handling across your connected systems. You stay in control of every consequential action." actions={<Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>Review approvals</Link>} />
    {error && <div role="alert" className="attn crit" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}><span className="t-compact">{error}</span><button className="btn btn-ghost btn-sm" onClick={() => void load()}>Retry</button></div>}
    {loading ? <div className="t-meta workflow-loading">Loading real workflow activity…</div> : openWorkflows.length === 0 && !selected ? <EmptyWorkflows connectedSystemCount={getRealConnectedConnectors(state.connectors).length} hasActiveOperator={state.agents.some((agent) => agent.status === "running")} /> : <>
      <div className={selected ? "sec split workflow-index-layout" : "sec"}>
        <section className="card workflow-index-card" aria-label={selectedIsHistory ? "Selected workflow and open workflows" : "Open workflows"}>
          <div className="card-head workflow-index-head"><div className="t-section">{selectedIsHistory ? "Selected workflow" : "Open workflows"}</div><span className="t-meta">{selectedIsHistory ? `${workflowSummary} · showing workflow history` : workflowSummary}</span></div>
          <div className="rows">{displayedWorkflows.map((workflow) => <WorkflowRow key={workflow.id} workflow={workflow} selected={selectedId === workflow.id} onSelect={() => setSelectedId(workflow.id)} />)}</div>
        </section>
        {selected && <WorkflowDetail workflow={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </>}
  </div>;
}

function EmptyWorkflows({ connectedSystemCount, hasActiveOperator }: { connectedSystemCount: number; hasActiveOperator: boolean }) {
  const variants = {
    noSystems: {
      title: "No systems connected",
      description: "Operators need at least one business system before they can detect anything.",
      action: { href: "/app/connectors", label: "Connect a system" },
    },
    noOperator: {
      title: "Systems connected, no operator active",
      description: "Context is available. Activate an operator to start monitoring for work.",
      action: { href: "/app/agents", label: "Activate an operator" },
    },
    monitoring: {
      title: "Operators monitoring, no workflow yet",
      description: "Your operators are monitoring. Coordinated work appears here when a signal needs a response.",
      action: { href: "/app/agents", label: "View workforce" },
    },
  } as const;
  const workflowState = connectedSystemCount === 0 ? variants.noSystems : hasActiveOperator ? variants.monitoring : variants.noOperator;

  return <section className="workflow-empty-surface" aria-label="Workflow workspace is empty">
    <h2 className="sr-only">No workflows in progress</h2>
    <div className="card workflow-empty-variant">
      <div className="workflow-empty-variant-copy">
        <strong>{workflowState.title}</strong>
        <span>{workflowState.description}</span>
      </div>
      <Link href={workflowState.action.href} className="btn btn-ghost btn-sm">{workflowState.action.label}</Link>
    </div>
    <div className="panel workflow-how-work">
      <span className="t-eyebrow">How work reaches this page</span>
      <LoopRail stages={LOOP_STAGES.map(([stageLabel, detail]) => ({ label: stageLabel, detail }))} current="Detect" />
    </div>
  </section>;
}

function WorkflowRow({ workflow, selected, onSelect }: { workflow: WorkflowPresentation; selected: boolean; onSelect: () => void }) {
  const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  const source = workflow.source ? `Signal · ${workflow.source.label}` : "Scheduled work";
  return <button type="button" className="workflow-operational-row" data-selected={selected || undefined} aria-pressed={selected} onClick={onSelect}>
    <span className="workflow-row-primary">
      <strong>{workflow.objective}</strong>
      <small>{workflow.operatorName} · {source} · updated {relativeTime(workflow.updatedAt)}</small>
    </span>
    <span className="workflow-row-priority">{label(workflow.priority)}</span>
    <span className="workflow-row-progress">{completed} of {workflow.steps.length}</span>
    <span className={`badge ${badgeTone(workflow.status)}`}><i />{workflowStatusLabel(workflow.status)}</span>
    <ActivityAvatar operatorKey={workflow.operatorKey} size={32} />
  </button>;
}

function WorkflowDetail({ workflow, onClose }: { workflow: WorkflowPresentation; onClose: () => void }) {
  const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  const firstIncompleteStep = workflow.steps.find((step) => !["completed", "skipped"].includes(step.status));
  const stepState = (step: WorkflowStepPresentation): "done" | "now" | "next" => {
    if (["completed", "skipped"].includes(step.status)) return "done";
    return step.id === firstIncompleteStep?.id ? "now" : "next";
  };
  const approvalStep = workflow.steps.find((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"));
  const blockedSteps = workflow.steps.filter((step) => Boolean(step.blocker));
  return <aside className="card workflow-detail" aria-label={`Workflow detail: ${workflow.objective}`}>
    <div className="card-head workflow-detail-head">
      <div>
        <span className="t-meta">Workflow detail</span>
        <div className="inline" style={{ marginTop: 4 }}><span className={`badge ${badgeTone(workflow.status)}`}>{label(workflow.status)}</span><span className="t-meta">{workflow.operatorName} · started {relativeTime(workflow.createdAt)} · updated {relativeTime(workflow.updatedAt)}</span></div>
        <h3 className="t-section" style={{ marginTop: 8 }}>{workflow.objective}</h3>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
    </div>
    <div className="card-pad stack">
      <div className="panel card-pad">
        <LoopRail stages={LOOP_STAGES.map(([stageLabel, detail]) => ({ label: stageLabel, detail }))} current={loopStageForStatus(workflow.status)} />
      </div>
      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="t-section">Why this started</div></div>
            <div className="card-pad">
              <p className="t-compact" style={{ margin: 0 }}>{workflow.whyStarted.length ? workflow.whyStarted.join(" ") : "Auterim identified a meaningful signal and prepared the next safe steps."}</p>
              <dl className="kv" style={{ marginTop: 14 }}>
                <div><dt>Owner</dt><dd>{workflow.operatorName}</dd></div>
                <div><dt>External communication</dt><dd>{workflow.externalCommunicationOwner ? `${workflow.externalCommunicationOwner.replace(/_/g, " ")} only` : "Not allowed"}</dd></div>
                <div><dt>Source</dt><dd>{workflow.source?.label ?? "Workspace signal"}{workflow.source?.detail ? ` · ${workflow.source.detail}` : ""}</dd></div>
                <div><dt>Priority</dt><dd>{label(workflow.priority)}</dd></div>
                <div><dt>Workforce state</dt><dd>{label(workflow.workforceState)}</dd></div>
                <div><dt>Progress</dt><dd>{completed} of {workflow.steps.length} steps</dd></div>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="t-section">Plan</div><span className="t-meta">Prepared response steps</span></div>
            <div className="rows">
              {workflow.steps.length ? workflow.steps.map((step) => {
                const dotState = stepState(step);
                return <div className="row" key={step.id}>
                  <span className={`dot${dotState === "done" ? " dot-green" : dotState === "now" ? " dot-amber" : ""}`} />
                  <span className="grow">
                    <span className="ttl">{step.label}</span>
                    <span className="sub">{step.destination}{step.blocker ? ` · ${step.blocker}` : ""}</span>
                  </span>
                  <span className="rt">
                    {step.approvalId && <Link className="btn btn-ghost btn-sm" href="/app/approvals">Open approval</Link>}
                    <span className={`badge ${badgeTone(step.status)}`}>{label(step.status)}</span>
                  </span>
                </div>;
              }) : <div className="row"><span className="t-meta">No steps have been recorded for this workflow.</span></div>}
            </div>
          </div>

          {approvalStep && (
            <section className="attn" role="status" style={{ padding: "16px 18px" }}>
              <div className="t-object">Approval required</div>
              <dl className="kv" style={{ marginTop: 12 }}>
                <div><dt>Step</dt><dd>{approvalStep.label}</dd></div>
                <div><dt>Destination</dt><dd>{approvalStep.destination}</dd></div>
                <div><dt>Reason</dt><dd>{workflow.nextAttention}</dd></div>
              </dl>
              <div className="inline" style={{ marginTop: 14 }}><Link className="btn btn-primary btn-sm" href="/app/approvals" style={{ textDecoration: "none" }}>Review in approvals</Link></div>
            </section>
          )}

          {workflow.supportingWork.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="t-section">Supporting work</div><span className="t-meta">Internal dependencies return evidence to the owner</span></div>
              <div className="rows">
                {workflow.supportingWork.map((child) => <div className="row" key={child.id}>
                  <span className={`dot${child.status === "completed" ? " dot-green" : child.status === "blocked" ? " dot-amber" : ""}`} />
                  <span className="grow"><span className="ttl">{child.operatorName}</span><span className="sub">{child.requestedOutcome ?? "Linked internal work"}</span><span className="sub">{child.handoffReason ? `Why: ${child.handoffReason}` : "Internal work only"}{Object.keys(child.resultEvidence).length ? ` · Evidence: ${Object.keys(child.resultEvidence).slice(0, 3).join(", ")}` : ""}</span></span>
                  <span className={`badge ${badgeTone(child.status)}`}>{label(child.status)}</span>
                </div>)}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="t-section">Ownership</div></div>
            <div className="rows">
              <div className="row">
                <span className="op-id">
                  <span className="cn-mark lg" aria-hidden>{workflow.operatorName.slice(0, 2).toUpperCase()}</span>
                  <span className="nm"><b>{workflow.operatorName}</b><span>Owns this workflow</span></span>
                </span>
              </div>
            </div>
          </div>

          {blockedSteps.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="t-section">Blockers</div><span className="badge amber">{blockedSteps.length}</span></div>
              <div className="rows">
                {blockedSteps.map((step) => <div className="row" key={step.id}><span className="grow"><span className="ttl">{step.label}</span><span className="sub">{step.blocker}</span></span></div>)}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><div className="t-section">Observed outcome</div></div>
            {workflow.outcomes.length ? (
              <div className="rows">
                {workflow.outcomes.map((outcome) => <div className="row" key={outcome.id}><span className="grow"><span className="ttl">{outcome.label}</span><span className="sub">{outcome.attribution} · {relativeTime(outcome.observedAt)}</span></span></div>)}
              </div>
            ) : <div className="card-pad"><p className="t-meta" style={{ margin: 0 }}>No outcome has been observed yet. Evidence appears after a connected system confirms it.</p></div>}
          </div>
        </div>
      </div>
    </div>
  </aside>;
}
