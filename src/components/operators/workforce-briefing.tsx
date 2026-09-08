"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";

type ProductState = { label: string; description: string; connectedSystems: string[]; availableNow: string[] };
type OperatorRun = { id: string; status: string; created_at: string; output?: { title?: string; type?: string } | null };

const responsibility: Record<string, string[]> = {
  revenue: ["Spot meaningful commercial conversations", "Prepare thoughtful follow-up work", "Keep proposed external actions under approval"],
  client_flow: ["Notice customer requests and stalled handoffs", "Prepare a clear next response", "Coordinate safe follow-through across connected context"],
  operations: ["Surface blocked or stale delivery work", "Prepare recovery steps for review", "Keep internal follow-through visible"],
};

function time(value: string) { const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000)); return hours < 1 ? "Just now" : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`; }
function sentence(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function OperatorWorkforceBriefing({ operatorKey }: { operatorKey: "revenue" | "client_flow" | "operations" }) {
  const { state } = useOS();
  const [product, setProduct] = useState<ProductState | null>(null);
  const [runs, setRuns] = useState<OperatorRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowPresentation[]>([]);
  const [error, setError] = useState("");
  const params = useMemo(() => new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, operatorKey }), [operatorKey, state.currentUser.email, state.currentUser.id, state.workspace.id]);
  const load = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const [productRes, runsRes, workflowRes] = await Promise.all([fetch(`/api/operators/product-state?${params}`, { cache: "no-store" }), fetch(`/api/operators/runs?${params}`, { cache: "no-store" }), fetch(`/api/workflows?operatorKey=${operatorKey}`, { cache: "no-store" })]);
      const [productJson, runsJson, workflowJson] = await Promise.all([productRes.json(), runsRes.json(), workflowRes.json()]);
      if (!productRes.ok || !runsRes.ok || !workflowRes.ok) throw new Error(productJson.error || runsJson.error || workflowJson.error || "Could not load the operator briefing.");
      setProduct(productJson.state ?? null); setRuns(runsJson.runs ?? []); setWorkflows(workflowJson.workflows ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the operator briefing."); }
  }, [operatorKey, params, state.workspace.id]);
  useEffect(() => { void load(); }, [load]);
  const pending = workflows.filter((workflow) => workflow.steps.some((step) => step.status === "awaiting_approval" || (step.approvalRequired && step.status === "proposed"))).length;
  return <section className="p" style={{ padding: 0, overflow: "hidden", background: "linear-gradient(110deg, rgba(77,232,225,.07), rgba(255,255,255,.012) 48%, rgba(255,255,255,.01))" }}>
    <div style={{ padding: "17px 18px", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, .8fr)", gap: 20 }}><div><div className="p-meta">Operator briefing</div><div style={{ marginTop: 7, fontSize: 15.5, fontWeight: 650 }}>{product?.label ?? "Loading readiness…"}</div><div style={{ marginTop: 5, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5 }}>{product?.description ?? "Auterim is checking the operator’s real setup and current state."}</div>{error && <div style={{ marginTop: 7, color: "var(--rose)", fontSize: 11.5 }}>{error}</div>}<div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>{(product?.connectedSystems ?? []).length ? product?.connectedSystems.map((system) => <span className="appr-btn edit" key={system} style={{ cursor: "default" }}>{system}</span>) : <Link className="appr-btn edit" href="/app/connectors">Connect a system</Link>}</div></div><div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 18 }}><div className="p-meta">Your control</div><div style={{ marginTop: 7, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>Auterim prepares work from live context, requests approval for consequential actions, and records workflow history and outcome evidence.</div>{pending > 0 && <Link href="/app/approvals" className="lnk-open" style={{ display: "inline-block", marginTop: 10 }}>{pending} item{pending === 1 ? "" : "s"} ready for review →</Link>}</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: "1px solid var(--line)" }}><Brief label="Responsibility" value={responsibility[operatorKey][0]} /><Brief label="Available now" value={product?.availableNow?.[0] ?? "Connect the required system to begin."} /><Brief label="Recent work" value={workflows[0]?.objective ?? runs[0]?.output?.title ?? (runs[0] ? `${sentence(runs[0].status)} ${time(runs[0].created_at)}` : "No real work has been recorded yet.")} /></div>
  </section>;
}
function Brief({ label, value }: { label: string; value: string }) { return <div style={{ padding: "13px 18px", borderRight: "1px solid var(--line)" }}><div className="p-meta">{label}</div><div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.45, color: "var(--text-dim)" }}>{value}</div></div>; }
