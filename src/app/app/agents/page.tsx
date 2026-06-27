"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OPERATOR_REGISTRY, type OperatorDefinition } from "@/lib/operators/registry";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  readinessPercent: number;
  missingRequiredConnectors: string[];
  connectedRequiredConnectors: string[];
  optionalConnectors: string[];
  availableActions: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  reason: string;
};

type RevenueStatus = {
  monitoring?: {
    status: string;
    lastScanTime: string | null;
    lastScannedCount: number;
    opportunitiesFound: number;
    approvalsCreated: number;
    reconnectRequired: boolean;
  };
  gmail?: { reconnectRequired?: boolean } | null;
  error?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "#4DE8E1",
  delivery: "#9DEFEA",
  operations: "#51D88A",
  marketing: "#F5C26B",
  governance: "#B8A7FF",
  finance: "#74D2FF",
  people: "#F0A6CA",
  support: "#8BD7A8",
  automation: "#FFB86B",
};

function initials(name: string): string {
  return name.split(/\s|&/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `${mins}m ago` : "just now";
}

function statusLabel(operator: OperatorDefinition, readiness?: OperatorReadiness, revenueStatus?: RevenueStatus): { label: string; color: string; sub: string } {
  if (operator.key === "revenue" && revenueStatus?.gmail?.reconnectRequired) {
    return { label: "Needs setup", color: "var(--amber)", sub: "Reconnect Gmail for inbox monitoring" };
  }
  if (readiness?.status === "ready") return { label: "Available", color: "var(--green)", sub: readiness.reason };
  if (readiness?.status === "draft_only") return { label: "Available", color: "var(--cyan)", sub: readiness.reason };
  if (readiness?.status === "missing_connector") return { label: "Needs setup", color: "var(--amber)", sub: readiness.nextSetupStep || readiness.reason };
  if (readiness?.status === "upgrade_required") return { label: "Upgrade", color: "var(--amber)", sub: readiness.reason };
  if (readiness?.status === "preview") return { label: "Preview", color: "var(--text-dim)", sub: readiness.reason };
  if (operator.currentReleaseStatus === "coming_next") return { label: "Coming next", color: "var(--text-faint)", sub: "Not active yet" };
  return { label: "Coming next", color: "var(--text-faint)", sub: "Not active yet" };
}

function connectorSummary(operator: OperatorDefinition, readiness?: OperatorReadiness): string {
  const connected = readiness?.connectedRequiredConnectors ?? [];
  const missing = readiness?.missingRequiredConnectors ?? operator.requiredConnectors;
  if (operator.requiredConnectors.length === 0 && operator.optionalConnectors.length === 0) return "No connector required yet";
  if (missing.length === 0 && connected.length > 0) return `Connected: ${connected.join(", ")}`;
  if (missing.length > 0) return `Needs: ${missing.join(", ")}`;
  return operator.optionalConnectors.length ? `Optional: ${operator.optionalConnectors.join(", ")}` : "Connector-ready";
}

function workflowSummary(operator: OperatorDefinition): string {
  const parts = [
    operator.capabilities.length ? "Detect" : null,
    operator.allowedActions.length ? "Prepare" : null,
    operator.approvalRequiredActions.length ? "Approve" : null,
    operator.supportedModes.includes("real_action") ? "Execute" : null,
    operator.allowedActions.includes("log.write") ? "Log" : null,
  ].filter(Boolean);
  return parts.join(" / ") || "Prepare / Approve / Log";
}

export default function AgentsOverviewPage() {
  const { state } = useOS();
  const [readiness, setReadiness] = useState<OperatorReadiness[]>([]);
  const [revenueStatus, setRevenueStatus] = useState<RevenueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadOverview = useCallback(async () => {
    if (!state.workspace.id) return;
    setLoading(true);
    setError("");
    try {
      const [readinessRes, revenueRes] = await Promise.all([
        fetch(`/api/operators/readiness?${identityParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/revenue/status?${identityParams.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness[]; error?: string };
      const revenueJson = await revenueRes.json().catch(() => ({})) as RevenueStatus;
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load operator readiness.");
      if (!revenueRes.ok) throw new Error(revenueJson.error || "Could not load Revenue Operator status.");
      setReadiness(Array.isArray(readinessJson.readiness) ? readinessJson.readiness : []);
      setRevenueStatus(revenueJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operators.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const readinessByKey = useMemo(() => new Map(readiness.map((item) => [item.operatorKey, item])), [readiness]);
  const availableCount = readiness.filter((item) => item.status === "ready" || item.status === "draft_only").length;
  const setupCount = readiness.filter((item) => item.status === "missing_connector" || item.status === "upgrade_required").length;

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Operator registry</span>
          <h1>Agents</h1>
          <div className="os-page-sub">A clean overview of Inovense OS operators. Open an operator for real runtime controls.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link>
        </div>
      </div>

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Operators", val: String(OPERATOR_REGISTRY.length), sub: "code-first registry" },
          { label: "Available", val: loading ? "..." : String(availableCount), sub: "real readiness" },
          { label: "Needs setup", val: loading ? "..." : String(setupCount), sub: "connector or plan" },
          { label: "Revenue latest", val: revenueStatus?.monitoring?.lastScanTime ? relativeTime(revenueStatus.monitoring.lastScanTime) : "No scan yet", sub: "DB-backed" },
        ].map((item) => (
          <div className="kpi" key={item.label}>
            <div className="kpi-top"><span className="lab">{item.label}</span></div>
            <div className="kpi-val">{item.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{item.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {OPERATOR_REGISTRY.map((operator) => {
          const item = readinessByKey.get(operator.key);
          const status = statusLabel(operator, item, operator.key === "revenue" ? revenueStatus ?? undefined : undefined);
          const color = CATEGORY_COLORS[operator.category] ?? "#4DE8E1";
          const href = operator.key === "revenue" ? "/app/agents/revenue" : operator.key === "client_flow" ? "/app/agents/client-flow" : "#";
          const isOpenable = operator.key === "revenue" || operator.key === "client_flow";
          return (
            <div className="p" key={operator.key} style={{ gap: 0, overflow: "hidden" }}>
              <div className="p-head" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                  <div className="ops-card-avatar" style={{ color, background: `linear-gradient(135deg, ${color}22, ${color}06)`, boxShadow: `inset 0 0 0 1px ${color}55`, flexShrink: 0 }}>{initials(operator.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{operator.name}</div>
                    <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{operator.category}</div>
                  </div>
                </div>
                <span className="appr-btn edit" style={{ cursor: "default", color: status.color }}>{status.label}</span>
              </div>
              <div style={{ padding: "13px 14px", display: "grid", gap: 11 }}>
                <div style={{ fontSize: 12.3, color: "var(--text-dim)", minHeight: 48 }}>{operator.description}</div>
                <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 5 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Execution path</div>
                  <div style={{ fontSize: 12.2, color: "var(--text-dim)" }}>{workflowSummary(operator)}</div>
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{connectorSummary(operator, item)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{status.sub}</div>
                </div>
                {operator.key === "revenue" && revenueStatus?.monitoring && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[{ l: "Scanned", v: revenueStatus.monitoring.lastScannedCount }, { l: "Found", v: revenueStatus.monitoring.opportunitiesFound }, { l: "Approvals", v: revenueStatus.monitoring.approvalsCreated }].map((metric) => (
                      <div key={metric.l} style={{ padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)" }}>{metric.l}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{metric.v}</div>
                      </div>
                    ))}
                  </div>
                )}
                {isOpenable ? (
                  <Link href={href} className="btn btn-primary btn-sm" style={{ width: "fit-content", textDecoration: "none" }}>Open operator</Link>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" style={{ width: "fit-content", opacity: 0.48 }}>Open operator</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
