"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";

export type OperatorBriefingState = {
  state: "needs_setup" | "needs_attention" | "ready_to_activate" | "plan_required" | "billing_attention" | "suspended" | "paused" | "active" | "active_limited" | "enhanced";
  label: string;
  description: string;
  lifecycle: "available_to_unlock" | "ready_to_activate" | "active" | "paused";
  health: "healthy" | "limited_context" | "needs_attention" | "billing_attention";
  connectedSystems: string[];
  availableNow: string[];
  missingOptionalCapabilities: string[];
  requiredActions: Array<{ label: string; href: string; reason: string; impact: string }>;
};

type OperatorRun = { id: string; status: string; created_at: string; output?: { title?: string; type?: string } | null };

const responsibility: Record<string, string[]> = {
  revenue: ["Spot meaningful commercial conversations", "Prepare thoughtful follow-up work", "Keep proposed external actions under approval"],
  client_flow: ["Notice customer requests and stalled handoffs", "Prepare a clear next response", "Coordinate safe follow-through across connected context"],
  operations: ["Surface blocked or stale delivery work", "Prepare recovery steps for review", "Keep internal follow-through visible"],
};

export function OperatorWorkforceBriefing({
  operatorKey,
  onStateChange,
}: {
  operatorKey: "revenue" | "client_flow" | "operations";
  onStateChange?: (state: OperatorBriefingState | null) => void;
}) {
  const { state } = useOS();
  const [product, setProduct] = useState<OperatorBriefingState | null>(null);
  const [runs, setRuns] = useState<OperatorRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowPresentation[]>([]);
  const [error, setError] = useState("");
  const params = useMemo(() => new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, operatorKey }), [operatorKey, state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const load = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const [productRes, runsRes, workflowRes] = await Promise.all([
        fetch(`/api/operators/product-state?${params}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${params}`, { cache: "no-store" }),
        fetch(`/api/workflows?operatorKey=${operatorKey}`, { cache: "no-store" }),
      ]);
      const [productJson, runsJson, workflowJson] = await Promise.all([productRes.json(), runsRes.json(), workflowRes.json()]);
      if (!productRes.ok || !runsRes.ok || !workflowRes.ok) throw new Error(productJson.error || runsJson.error || workflowJson.error || "Could not load the operator briefing.");
      const nextProduct = productJson.state ?? null;
      setProduct(nextProduct);
      onStateChange?.(nextProduct);
      setRuns(runsJson.runs ?? []);
      setWorkflows(workflowJson.workflows ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the operator briefing.");
    }
  }, [onStateChange, operatorKey, params, state.workspace.id]);

  useEffect(() => { void load(); }, [load]);

  const pending = workflows.filter((workflow) => workflow.steps.some((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"))).length;
  const active = product?.lifecycle === "active";
  const locked = product?.lifecycle === "available_to_unlock";
  const capabilityCopy = getOperatorCapabilityCopy(operatorKey);
  const action = product?.requiredActions[0] ?? null;

  return (
    <section className="p operator-runtime-briefing" data-operator-state={product?.state ?? "loading"} style={{ padding: 0, overflow: "hidden", background: "linear-gradient(110deg, rgba(77,232,225,.07), rgba(255,255,255,.012) 48%, rgba(255,255,255,.01))" }}>
      <div style={{ padding: "18px", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, .8fr)", gap: 20 }}>
        <div>
          <div className="p-meta">{active ? "Operator runtime" : locked ? "Available to unlock" : "Operator briefing"}</div>
          <div style={{ marginTop: 7, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
            <strong style={{ fontSize: 16 }}>{product?.label ?? "Checking operator state…"}</strong>
            {product?.state === "active_limited" && <span className="os-status" data-state="active_limited">Core work continues</span>}
          </div>
          <div style={{ marginTop: 5, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5 }}>{product?.description ?? "Auterim is checking the operator’s real setup and current state."}</div>
          {error && <div style={{ marginTop: 7, color: "var(--rose)", fontSize: 11.5 }}>{error}</div>}
          {action && (
            <div className="operator-runtime-attention" data-severity={product?.health === "needs_attention" ? "blocking" : "attention"} style={{ marginTop: 13, padding: "11px 12px", borderRadius: 10, background: "rgba(245,194,107,.06)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,.18)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div><strong style={{ fontSize: 12.5 }}>{action.reason}</strong><div style={{ marginTop: 3, color: "var(--text-mute)", fontSize: 11.8 }}>{action.impact}</div></div>
              <Link href={action.href} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>{action.label}</Link>
            </div>
          )}
          {locked && product?.requiredActions.length === 0 && product?.state === "needs_setup" && (
            <Link href={operatorKey === "operations" ? "/app/connectors?discover=1&category=project_management" : "/app/connectors?discover=1&category=email_calendar"} className="btn btn-primary btn-sm" style={{ width: "fit-content", marginTop: 13, textDecoration: "none" }}>Connect a system</Link>
          )}
        </div>
        <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 18 }}>
          <div className="p-meta">{active ? "Connected context" : "Optional context"}</div>
          <div style={{ marginTop: 7, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>
            {active
              ? `${capabilityCopy.required[0] ?? "Core context"}${product?.connectedSystems.length ? ` · Connected via ${product.connectedSystems.join(", ")}` : ""}`
              : `${capabilityCopy.optional.join(" · ")} can add richer context without blocking activation.`}
          </div>
          {pending > 0 ? (
            <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ display: "inline-flex", marginTop: 11 }}>{pending} awaiting review</Link>
          ) : (
            <Link href="/app/approvals" className="lnk-open" style={{ display: "inline-block", marginTop: 10 }}>Approval inbox</Link>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: "1px solid var(--line)" }}>
        <Brief label="What it does" value={responsibility[operatorKey][0]} />
        <Brief label={locked ? "Required capability" : "Available now"} value={locked ? capabilityCopy.required.join(" · ") : product?.availableNow?.[0] ?? "Core monitoring is available."} />
        <Brief label={active ? "Recent work" : "Your control"} value={active ? workflows[0]?.objective ?? runs[0]?.output?.title ?? "No issues need attention right now." : "You choose when this operator begins monitoring."} />
      </div>
    </section>
  );
}

function Brief({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: "13px 18px", borderRight: "1px solid var(--line)" }}><div className="p-meta">{label}</div><div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.45, color: "var(--text-dim)" }}>{value}</div></div>;
}
