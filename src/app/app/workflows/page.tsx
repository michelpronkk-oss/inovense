"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkflowPresentation, WorkflowStepPresentation } from "@/lib/workflows/presentation";
import { EmptyState, LoopRail, MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";
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
function badgeTone(status: string): "green" | "red" | "amber" | "cyan" {
  if (status === "completed") return "green";
  if (status === "blocked" || status === "failed") return "red";
  if (status.includes("approval") || status === "planned") return "amber";
  return "cyan";
}
/** Maps the real workflow status onto the fixed Detect/Prepare/Approve/Execute/Measure loop for LoopRail. */
function loopStageForStatus(status: string): string {
  if (["completed", "partially_completed"].includes(status)) return "Measure";
  if (status === "executing") return "Execute";
  if (["awaiting_approval", "partially_approved"].includes(status)) return "Approve";
  if (["blocked", "failed"].includes(status)) return "Execute";
  return "Prepare";
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
  const active = workflows.filter((workflow) => ["planned", "awaiting_approval", "partially_approved", "executing", "blocked"].includes(workflow.status)).length;
  const waiting = workflows.filter((workflow) => workflow.steps.some((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"))).length;
  return <div className="os-page workflows-page">
    <PageHeader eyebrow="Coordinated work" title="Workflows" description="The plans Auterim is handling across your connected systems. You stay in control of every consequential action." actions={<Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>Review approvals</Link>} />
    {error && <div role="alert" className="attn crit" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}><span className="t-compact">{error}</span><button className="btn btn-ghost btn-sm" onClick={() => void load()}>Retry</button></div>}
    {loading ? <div className="t-meta" style={{ padding: 20 }}>Loading real workflow activity…</div> : workflows.length === 0 ? <EmptyWorkflows connectedSystemCount={getRealConnectedConnectors(state.connectors).length} hasActiveOperator={state.agents.some((agent) => agent.status === "running")} /> : <>
      <MetricStrip className="workflow-metric-strip" items={[
        { label: "Open workflows", value: active, detail: "Need attention or are moving forward" },
        { label: "Ready for review", value: waiting, detail: "Have a safe next action prepared" },
        { label: "Observed outcomes", value: workflows.reduce((sum, workflow) => sum + workflow.outcomes.length, 0), detail: "Evidence recorded after work completed" },
      ]} />
      <div className={selected ? "sec split" : "sec"}>
        <div className="card">
          <div className="card-head"><div className="t-section">Open workflows</div><span className="t-meta">Each row is a real plan assembled from a connected-system signal.</span></div>
          <div className="rows">{workflows.map((workflow) => <WorkflowRow key={workflow.id} workflow={workflow} selected={selectedId === workflow.id} onSelect={() => setSelectedId(workflow.id)} />)}</div>
        </div>
        {selected && <WorkflowDetail workflow={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </>}
  </div>;
}

function EmptyWorkflows({ connectedSystemCount, hasActiveOperator }: { connectedSystemCount: number; hasActiveOperator: boolean }) {
  const noConnectedSystems = connectedSystemCount === 0;
  // One truthful state drives the status line, the description and the single
  // call to action together -- never a CTA that contradicts the status.
  const workflowState = noConnectedSystems
    ? { tone: "muted" as const, status: "No systems connected", description: "Connect a system so an operator can detect meaningful work and coordinate the next safe steps.", action: { href: "/app/connectors", label: "Connect a system" } }
    : hasActiveOperator
      ? { tone: "green" as const, status: "Operators monitoring", description: "Your operators are monitoring. Coordinated work will appear here when action is needed.", action: null }
      : { tone: "amber" as const, status: "Waiting for an operator", description: "When an operator detects something that needs coordinated action, the plan will appear here.", action: { href: "/app/agents", label: "Activate an operator" } };
  return <section className="stack" aria-label="Workflow workspace is empty">
    <div className="inline" style={{ justifyContent: "space-between" }}>
      <span className="t-eyebrow">Workflow workspace</span>
      <span className={`badge ${workflowState.tone}`}>{workflowState.status}</span>
    </div>
    <EmptyState title="No workflows in progress" action={workflowState.action ? <Link href={workflowState.action.href} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>{workflowState.action.label}</Link> : undefined}>
      {workflowState.description}
    </EmptyState>
    <div className="panel card-pad">
      <p className="t-meta" style={{ margin: "0 0 14px" }}>Workflows bring together context, approvals, execution, and outcome tracking.</p>
      <LoopRail stages={LOOP_STAGES.map(([stageLabel, detail]) => ({ label: stageLabel, detail }))} />
    </div>
  </section>;
}

function WorkflowRow({ workflow, selected, onSelect }: { workflow: WorkflowPresentation; selected: boolean; onSelect: () => void }) {
  const completed = workflow.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  const blocker = workflow.steps.find((step) => step.blocker)?.blocker ?? workflow.nextAttention;
  return <div className={`row link${selected ? " selected" : ""}`} role="button" tabIndex={0} aria-pressed={selected} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}>
    <span className="grow"><span className="ttl">{workflow.objective}</span><span className="sub">{workflow.operatorName}{workflow.source ? ` · ${workflow.source.label}` : ""} · {blocker ? blocker : `Updated ${relativeTime(workflow.createdAt)}`}</span></span>
    <span className="rt">
      <span className="t-meta">{label(workflow.priority)}</span>
      <span className="t-meta">{completed} of {workflow.steps.length}</span>
      <span className={`badge ${badgeTone(workflow.status)}`}>{label(workflow.status)}</span>
    </span>
  </div>;
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
        <div className="inline" style={{ marginTop: 4 }}><span className={`badge ${badgeTone(workflow.status)}`}>{label(workflow.status)}</span><span className="t-meta">{workflow.operatorName} · {relativeTime(workflow.createdAt)}</span></div>
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
