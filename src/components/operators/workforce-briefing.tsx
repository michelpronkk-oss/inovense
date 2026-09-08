"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import type { WorkflowPresentation } from "@/lib/workflows/presentation";

type ProductState = { state: "needs_setup" | "needs_attention" | "ready_to_activate" | "plan_required" | "billing_attention" | "suspended" | "paused" | "active" | "enhanced"; label: string; description: string; connectedSystems: string[]; availableNow: string[] };
type OperatorRun = { id: string; status: string; created_at: string; output?: { title?: string; type?: string } | null };

const responsibility: Record<string, string[]> = {
  revenue: ["Spot meaningful commercial conversations", "Prepare thoughtful follow-up work", "Keep proposed external actions under approval"],
  client_flow: ["Notice customer requests and stalled handoffs", "Prepare a clear next response", "Coordinate safe follow-through across connected context"],
  operations: ["Surface blocked or stale delivery work", "Prepare recovery steps for review", "Keep internal follow-through visible"],
};
const unlock: Record<string, { requirement: string; compatible: string[]; optional: string[]; scope: string }> = {
  revenue: { requirement: "Connect one email system", compatible: ["Gmail", "Microsoft 365"], optional: ["HubSpot", "Salesforce", "Google Drive"], scope: "Commercial conversations" },
  client_flow: { requirement: "Connect one customer conversation system", compatible: ["Gmail", "Microsoft 365"], optional: ["HubSpot", "Salesforce", "Google Drive"], scope: "Customer conversations" },
  operations: { requirement: "Connect one project system", compatible: ["Jira", "Asana", "Trello"], optional: ["Slack", "Microsoft Teams", "Google Drive"], scope: "Selected project" },
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
  const mode = product?.state === "needs_setup" ? "locked" : product?.state === "ready_to_activate" ? "ready" : product?.state === "active" || product?.state === "enhanced" ? "active" : "other";
  const requirement = unlock[operatorKey];
  return <section className="p" style={{ padding: 0, overflow: "hidden", background: "linear-gradient(110deg, rgba(77,232,225,.07), rgba(255,255,255,.012) 48%, rgba(255,255,255,.01))" }}>
    <div style={{ padding: "18px", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, .8fr)", gap: 20 }}><div><div className="p-meta">{mode === "locked" ? "Available to unlock" : mode === "ready" ? "Ready to activate" : mode === "active" ? "Operator runtime" : "Operator briefing"}</div><div style={{ marginTop: 7, fontSize: 16, fontWeight: 650 }}>{mode === "locked" ? requirement.requirement : product?.label ?? "Loading readiness…"}</div><div style={{ marginTop: 5, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5 }}>{mode === "locked" ? `Unlock this role with any compatible system. ${responsibility[operatorKey][0]}.` : product?.description ?? "Auterim is checking the operator’s real setup and current state."}</div>{error && <div style={{ marginTop: 7, color: "var(--rose)", fontSize: 11.5 }}>{error}</div>}<div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>{mode === "locked" ? requirement.compatible.map((system) => <span className="appr-btn edit" key={system} style={{ cursor: "default" }}>{system}</span>) : (product?.connectedSystems ?? []).map((system) => <span className="appr-btn edit" key={system} style={{ cursor: "default" }}>{system}</span>)}</div>{mode === "locked" && <Link href="/app/connectors" className="btn btn-primary btn-sm" style={{ width: "fit-content", marginTop: 13, textDecoration: "none" }}>Connect a compatible system</Link>}</div><div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 18 }}><div className="p-meta">{mode === "active" ? "What it is monitoring" : "Optional context"}</div><div style={{ marginTop: 7, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>{mode === "active" ? `${requirement.scope}. Auterim prepares safe work from current context and holds consequential actions for approval.` : `${requirement.optional.join(" · ")} can add richer context, but does not block activation.`}</div>{pending > 0 && <Link href="/app/approvals" className="lnk-open" style={{ display: "inline-block", marginTop: 10 }}>{pending} awaiting review →</Link>}</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: "1px solid var(--line)" }}><Brief label="What it does" value={responsibility[operatorKey][0]} /><Brief label={mode === "locked" ? "Works with" : "Available now"} value={mode === "locked" ? requirement.compatible.join(" · ") : product?.availableNow?.[0] ?? "Activate this operator to begin monitoring."} /><Brief label={mode === "active" ? "Recent work" : "Your control"} value={mode === "active" ? workflows[0]?.objective ?? runs[0]?.output?.title ?? "No issues need attention right now." : "You choose when this operator begins monitoring."} /></div>
  </section>;
}
function Brief({ label, value }: { label: string; value: string }) { return <div style={{ padding: "13px 18px", borderRight: "1px solid var(--line)" }}><div className="p-meta">{label}</div><div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.45, color: "var(--text-dim)" }}>{value}</div></div>; }
