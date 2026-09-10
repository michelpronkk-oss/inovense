"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { MetricStrip, PageHeader } from "@/components/product-ui/page-primitives";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";

function relative(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 1 ? "Just now" : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

const ATTRIBUTION_TONE: Record<string, string> = { observed: "cyan", influenced: "amber", direct: "green" };

export default function InsightsPage() {
  const { state } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const [workflows, setWorkflows] = useState<WorkflowPresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/workflows", { cache: "no-store" });
      const json = await response.json().catch(() => ({})) as { workflows?: WorkflowPresentation[]; error?: string };
      if (!response.ok) throw new Error(json.error || "Could not load outcome evidence.");
      setWorkflows(json.workflows ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load outcome evidence."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!entitlements.features.insights) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [entitlements.features.insights, load]);
  const outcomes = useMemo(() => workflows.flatMap((workflow) => workflow.outcomes.map((outcome) => ({ ...outcome, workflow }))).sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()), [workflows]);
  const byOperator = useMemo(() => Object.entries(outcomes.reduce<Record<string, number>>((all, outcome) => { all[outcome.workflow.operatorName] = (all[outcome.workflow.operatorName] ?? 0) + 1; return all; }, {})), [outcomes]);

  if (!entitlements.features.insights) return <div className="os-page insights-page"><PageHeader eyebrow="Workforce feature" title="Insights" description="Evidence-backed outcome reporting for your workforce." /><UpgradePrompt feature="Outcome intelligence" description="Review observed outcomes from completed work when connected systems provide evidence." requiredPlan="growth" /></div>;

  const observed = outcomes.filter((outcome) => outcome.attribution === "observed").length;
  const influenced = outcomes.filter((outcome) => outcome.attribution === "influenced").length;
  const direct = outcomes.filter((outcome) => outcome.attribution === "direct").length;
  return <div className="os-page insights-page">
    <PageHeader eyebrow="Measured outcomes" title="Insights" description="Evidence Auterim has observed after work completed. Activity and technical logs remain separate views." actions={<Link className="btn btn-ghost btn-sm" href="/app/workflows">Open workflows</Link>} />
    {error && <div className="sec card card-pad" style={{ color: "var(--rose)" }}>{error} <button className="btn btn-ghost btn-sm" onClick={() => void load()} style={{ marginLeft: 8 }}>Retry</button></div>}
    {loading ? (
      <div className="sec card card-pad t-compact dim">Loading outcome evidence…</div>
    ) : outcomes.length === 0 ? (
      <section className="sec empty">
        <h4>Not enough evidence yet</h4>
        <p>Auterim records an insight only after a connected system confirms that completed work changed something.</p>
        <div className="acts"><Link className="btn btn-primary btn-sm" href="/app/workflows">View workflows</Link><Link className="btn btn-ghost btn-sm" href="/app/approvals">Review approvals</Link></div>
      </section>
    ) : <>
      <div className="sec">
        <MetricStrip items={[{ label: "Observed", value: observed, detail: "A connected system provides evidence" }, { label: "Influenced", value: influenced, detail: "Evidence linked to completed work" }, { label: "Direct", value: direct, detail: "Only where attribution supports it" }]} />
      </div>
      <div className="sec split">
        <section className="card insights-evidence-list">
          <div className="card-head">
            <div><h3 className="t-section">Latest evidence</h3><p className="t-meta" style={{ margin: "3px 0 0" }}>No estimates or unverified impact claims.</p></div>
          </div>
          <div className="rows">
            {outcomes.slice(0, 12).map((outcome) => (
              <div key={outcome.id} className="row">
                <span className="grow">
                  <span className="ttl">{outcome.label}</span>
                  <span className="sub">{outcome.workflow.objective} · {outcome.workflow.operatorName}</span>
                </span>
                <span className="rt">
                  <span className={`badge ${ATTRIBUTION_TONE[outcome.attribution] ?? "muted"}`}>{outcome.attribution}</span>
                  <span className="t-meta">{relative(outcome.observedAt)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card insights-by-operator">
          <div className="card-head">
            <div><h3 className="t-section">Where evidence appears</h3><p className="t-meta" style={{ margin: "3px 0 0" }}>By responsible operator</p></div>
          </div>
          <div className="rows">
            {byOperator.map(([name, count]) => (
              <div key={name} className="row">
                <span className="grow ttl">{name}</span>
                <span className="rt t-meta">{count} observed</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>}
  </div>;
}
