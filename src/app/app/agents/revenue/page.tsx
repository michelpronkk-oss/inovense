"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { humanizeOperatorActions } from "@/lib/operators/action-labels";
import { OperatorActivationToggle, type ActivationEligibility } from "@/components/operators/activation-toggle";
import { OperatorDegradedNotice } from "@/components/operators/degraded-notice";

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  readinessPercent: number;
  missingRequiredConnectors: string[];
  connectedRequiredConnectors: string[];
  optionalConnectors: string[];
  availableActions: string[];
  availableBusinessActions?: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  executionEligibility?: ActivationEligibility;
  reason: string;
};

type RevenueRun = {
  id: string;
  operator_key: string;
  status: string;
  output: {
    title?: string;
    type?: string;
    draft?: { to?: string; subject?: string; body?: string };
    approvalId?: string;
  } | null;
  approval_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type RevenueRunResult = {
  run?: { id: string; status: string; approvalId?: string };
  output?: { draft?: { to: string; subject: string; body: string }; approvalId?: string };
  approval?: { approvalId?: string };
  error?: string;
};

type RevenueScanResult = {
  status?: string;
  message?: string;
  scanned?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  reconnectRequired?: boolean;
  opportunities?: { messageId: string; from: string; subject: string; matchedKeywords: string[]; runId: string; approvalId: string }[];
  skipped?: { messageId: string; subject?: string; from?: string; reason: string; dedupeKey?: string }[];
  error?: string;
};

type RevenueStatus = {
  readiness?: OperatorReadiness | null;
  gmail?: {
    status?: string;
    accountEmail?: string | null;
    reconnectRequired?: boolean;
    permissions?: { compose?: boolean; send?: boolean; readonly?: boolean };
  } | null;
  hubspot?: {
    status?: string;
    accountEmail?: string | null;
    connected?: boolean;
    hasNangoConnection?: boolean;
  } | null;
  revenueMode?: "email_only_mode" | "full_crm_mode" | string;
  capabilityReadiness?: {
    optionalUpsellConnectors?: { connectorKey: string; displayName: string; status: string }[];
  };
  v1Readiness?: {
    status: string;
    checks: {
      gmailSendAfterApproval?: string;
      hubspotContactDealExecution?: string;
      contactDealAssociation?: string;
      hubspotAttributionProperties?: string;
      pipelineMapping?: string;
    };
    optionalCrmEnrichmentMissing?: boolean;
    hubspotSetupRecommendation?: {
      missingContactProperties?: string[];
      missingDealProperties?: string[];
      suggestedAction?: string;
      severity?: string;
    } | null;
    pipeline?: {
      status?: string;
      pipelineLabel?: string | null;
      dealstageLabel?: string | null;
      pipelineSelectionReason?: string | null;
    } | null;
  };
  monitoring?: {
    status: string;
    message: string;
    monitoringEnabled?: boolean;
    cadence?: string;
    sourceMode?: "scheduled" | "manual" | "event_ready" | string;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastRunStatus?: string | null;
    lastRunSummary?: Record<string, unknown> | null;
    manualRunAvailable?: boolean;
    lastScanTime: string | null;
    lastScannedCount: number;
    opportunitiesFound: number;
    approvalsCreated: number;
    skippedSafelyCount: number;
    routedItemCount: number | null;
    reconnectRequired: boolean;
    nextScanLabel: string;
    recentPendingApprovals: { id: string; title: string; created_at: string | null; to: string | null; subject: string | null }[];
  };
  error?: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return mins > 0 ? `${mins}m ago` : "just now";
}

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TagList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(items.length ? items : [empty]).map((item) => <span key={item} className="appr-btn edit" style={{ cursor: "default" }}>{item}</span>)}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 13px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function RevenueOperatorPage() {
  const { state } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const [revenueReadiness, setRevenueReadiness] = useState<OperatorReadiness | null>(null);
  const [revenueStatus, setRevenueStatus] = useState<RevenueStatus | null>(null);
  const [revenueRuns, setRevenueRuns] = useState<RevenueRun[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [runtimeError, setRuntimeError] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<RevenueScanResult | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RevenueRunResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [context, setContext] = useState("");

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadRevenueRuntime = useCallback(async () => {
    if (!state.workspace.id) return;
    setRuntimeLoading(true);
    setRuntimeError("");
    try {
      const readinessQs = new URLSearchParams(identityParams);
      readinessQs.set("operatorKey", "revenue");
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", "revenue");
      const statusQs = new URLSearchParams(identityParams);

      const [readinessRes, runsRes, statusRes] = await Promise.all([
        fetch(`/api/operators/readiness?${readinessQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/revenue/status?${statusQs.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness; error?: string };
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: RevenueRun[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as RevenueStatus;
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load Revenue Operator readiness.");
      if (!runsRes.ok) throw new Error(runsJson.error || "Could not load Revenue Operator runs.");
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Revenue Operator status.");
      setRevenueReadiness(statusJson.readiness ?? readinessJson.readiness ?? null);
      setRevenueStatus(statusJson);
      setRevenueRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Could not load Revenue Operator runtime.");
    } finally {
      setRuntimeLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadRevenueRuntime(); }, [loadRevenueRuntime]);

  const startGmailReconnect = () => {
    if (!entitlements.canUseRealConnectors) {
      window.location.assign("/plans?source=revenue");
      return;
    }
    const params = new URLSearchParams({ workspaceId: state.workspace.id, userEmail: state.currentUser.email });
    window.location.href = `/api/connectors/gmail/auth?${params.toString()}`;
  };

  const submitRevenueScan = async () => {
    setScanSubmitting(true);
    setRuntimeError("");
    setScanResult(null);
    try {
      const res = await fetch("/api/operators/revenue/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 15 }),
      });
      const json = await res.json().catch(() => ({})) as RevenueScanResult;
      setScanResult(json);
      if (!res.ok && json.status !== "requires_gmail_read_scope") throw new Error(json.message || json.error || "Revenue scan failed.");
      await loadRevenueRuntime();
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Revenue scan failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const submitRevenueRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRunSubmitting(true);
    setRuntimeError("");
    setRunResult(null);
    try {
      const res = await fetch("/api/operators/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, operatorKey: "revenue", input: { leadName, leadEmail, context, goal: "follow_up" } }),
      });
      const json = await res.json().catch(() => ({})) as RevenueRunResult;
      if (!res.ok) throw new Error(json.error || "Revenue Operator run failed.");
      setRunResult(json);
      setLeadName("");
      setLeadEmail("");
      setContext("");
      await loadRevenueRuntime();
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Revenue Operator run failed.");
    } finally {
      setRunSubmitting(false);
    }
  };

  const monitoring = revenueStatus?.monitoring;
  const gmailReconnectRequired = Boolean(revenueStatus?.gmail?.reconnectRequired || monitoring?.reconnectRequired);
  const scanNeedsReconnect = gmailReconnectRequired || scanResult?.status === "requires_gmail_read_scope" || scanResult?.status === "requires_gmail_send_scope";
  const canRunRevenue = Boolean(revenueReadiness?.canRunManual && (revenueReadiness.status === "ready" || revenueReadiness.status === "draft_only"));
  const latestScanHadNoOpportunities = Boolean((monitoring?.lastRunAt || monitoring?.lastScanTime) && monitoring.opportunitiesFound === 0);
  const lastCheckAt = monitoring?.lastRunAt ?? monitoring?.lastScanTime ?? null;
  const scanSkippedSummary = scanResult?.skipped?.length
    ? Object.entries(scanResult.skipped.reduce<Record<string, number>>((counts, item) => {
      counts[item.reason] = (counts[item.reason] ?? 0) + 1;
      return counts;
    }, {})).map(([reason, count]) => `${reason}: ${count}`).join(" / ")
    : "";
  const modeLabel = revenueStatus?.revenueMode === "full_crm_mode" ? "Full CRM mode" : "Email-only mode";
  const modeHelp = revenueStatus?.revenueMode === "full_crm_mode"
    ? "Gmail and HubSpot are connected. CRM contact and deal updates execute after approval."
    : "Gmail is connected. HubSpot is missing, so Revenue Operator prepares email follow-ups only.";
  const revenueStatusMessage = (() => {
    if (!entitlements.canUseRealConnectors) return "Choose a plan to begin a trial before connecting live systems.";
    if (!revenueReadiness) return "Loading Revenue Operator readiness.";
    if (revenueReadiness.status === "missing_connector") return "Connect Gmail to run Revenue Operator.";
    if (revenueReadiness.status === "draft_only") return "HubSpot missing, Gmail draft and approval mode available.";
    if (revenueReadiness.status === "upgrade_required") return "Upgrade your plan to run Revenue Operator.";
    return revenueReadiness.reason;
  })();
  const v1Checks = revenueStatus?.v1Readiness?.checks;
  const showLegacyDiagnostics = false;

  if (!showLegacyDiagnostics) {
    const setupTone = gmailReconnectRequired || revenueReadiness?.status === "missing_connector" || revenueReadiness?.status === "upgrade_required";
    const nextAction = !entitlements.canUseRealConnectors
      ? { label: "Choose plan & start trial", onClick: () => window.location.assign("/plans?source=revenue") }
      : gmailReconnectRequired || revenueReadiness?.status === "missing_connector"
      // Route through the central Connectors hub rather than launching a
      // single provider's OAuth inline from the operator page - Connectors
      // is where reconnect/connect always happens now (see /app/connectors).
      ? { label: "Connect required system", onClick: () => window.location.assign("/connectors") }
      : revenueReadiness?.status === "upgrade_required"
        ? null
        : { label: scanSubmitting ? "Checking..." : "Run a check", onClick: submitRevenueScan };
    const connectionLabel = !entitlements.canUseRealConnectors
      ? "Available after trial activation"
      : revenueStatus?.gmail?.accountEmail
      ? revenueStatus.gmail.accountEmail
      : "Gmail connection required";

    return (
      <div className="os-page operator-detail-page">
        <div className="os-page-head" style={{ marginBottom: 24 }}>
          <div>
            <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Revenue</span>
            <h1>Revenue Operator</h1>
            <div className="os-page-sub">Find opportunities and prepare follow-ups for approval.</div>
          </div>
          <div className="os-page-actions">
            <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link>
          </div>
        </div>

        {runtimeError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{runtimeError}</div>}

        <section className="p" style={{ overflow: "hidden", padding: 0, background: "linear-gradient(112deg, rgba(77,232,225,0.08), rgba(255,255,255,0.012) 43%, rgba(255,255,255,0.01))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)" }}>
            <div style={{ padding: "28px 30px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: setupTone ? "var(--amber)" : "#64ffd7" }}><span className="d" /> {runtimeLoading ? "Loading operator" : setupTone ? "Setup needed" : "Monitoring"}</div>
              <div style={{ marginTop: 16, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.025em", fontWeight: 560, maxWidth: 620 }}>
                {setupTone ? "Connect a system to get started." : "Review revenue signals. Approve the next step."}
              </div>
              <p style={{ margin: "12px 0 0", maxWidth: 620, color: "var(--text-mute)", fontSize: 13, lineHeight: 1.65 }}>{revenueStatusMessage}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
                {nextAction ? <button className="btn btn-primary btn-sm" type="button" onClick={nextAction.onClick} disabled={scanSubmitting || (!gmailReconnectRequired && !canRunRevenue)}>{nextAction.label}</button> : <Link href="/plans" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View plans</Link>}
                <Link href="/connectors" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Manage connections</Link>
              </div>
            </div>
            <div style={{ borderLeft: "1px solid var(--line)", padding: "24px 26px", display: "grid", alignContent: "center", gap: 15, background: "rgba(0,0,0,0.12)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-faint)" }}>Primary connection</div>
                <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 520 }}>{connectionLabel}</div>
              </div>
              <div style={{ height: 1, background: "var(--line)" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-faint)" }}>Operating mode</div>
                <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 520 }}>{modeLabel}</div>
                <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--text-mute)", lineHeight: 1.5 }}>{modeHelp}</div>
              </div>
            </div>
          </div>
          <div className="operator-metrics" style={{ borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {[
              ["Last check", lastCheckAt ? relativeTime(lastCheckAt) : "Not run"],
              ["Next check", dateTimeLabel(monitoring?.nextRunAt)],
              ["Signals found", String(monitoring?.opportunitiesFound ?? 0)],
              ["Waiting approval", String(monitoring?.approvalsCreated ?? 0)],
            ].map(([label, value]) => <div key={label} style={{ padding: "13px 18px", borderRight: "1px solid var(--line)" }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)" }}>{label}</div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 550 }}>{value}</div></div>)}
          </div>
        </section>

        <section className="p" style={{ marginTop: 14, padding: 0 }}>
          <div className="p-head"><h3>Activity</h3><Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>View approvals</Link></div>
          <div style={{ padding: "8px 18px 16px" }}>
            {(monitoring?.recentPendingApprovals?.length ?? 0) > 0 ? monitoring?.recentPendingApprovals.map((approval) => <div key={approval.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: 20 }}><div><div style={{ fontSize: 13, fontWeight: 520 }}>{approval.subject || approval.title}</div><div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{approval.to || "Unknown recipient"}</div></div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber)" }}>Approval needed</div></div>) : <div style={{ padding: "14px 0 6px", color: "var(--text-mute)", fontSize: 12.5 }}>{revenueRuns.length ? `${revenueRuns.length} recorded run${revenueRuns.length === 1 ? "" : "s"}.` : "No signals or approvals yet. The first meaningful action will appear here."}</div>}
          </div>
        </section>

        <details className="p" style={{ marginTop: 14, padding: 0 }}>
          <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 540 }}>Connection and policy details</span><span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 10 }}>Show</span></summary>
          <div style={{ borderTop: "1px solid var(--line)", padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 }}>
            <div><div className="p-meta">Gmail</div><div style={{ marginTop: 6, fontSize: 12.5 }}>{connectionLabel}</div><div style={{ marginTop: 4, color: "var(--text-mute)", fontSize: 11.5 }}>Inbox monitoring {revenueStatus?.gmail?.permissions?.readonly ? "granted" : "not granted"}</div></div>
            <div><div className="p-meta">CRM</div><div style={{ marginTop: 6, fontSize: 12.5 }}>{revenueStatus?.hubspot?.connected ? "HubSpot connected" : "Optional - not connected"}</div><div style={{ marginTop: 4, color: "var(--text-mute)", fontSize: 11.5 }}>{revenueStatus?.hubspot?.accountEmail || "Email follow-ups remain approval-gated."}</div></div>
            <div><div className="p-meta">Control boundary</div><div style={{ marginTop: 6, fontSize: 12.5 }}>External sends require approval</div><div style={{ marginTop: 4, color: "var(--text-mute)", fontSize: 11.5 }}>{v1Checks?.pipelineMapping ? `Pipeline mapping: ${v1Checks.pipelineMapping}` : "No uncontrolled actions."}</div></div>
          </div>
        </details>

        {(() => {
          const systemsInUse = [
            ...(revenueReadiness?.connectedRequiredConnectors ?? []).map((key) => getConnectorDefinition(key)?.displayName ?? key),
            ...(revenueStatus?.hubspot?.connected ? ["HubSpot"] : []),
          ];
          const availableNow = revenueReadiness?.availableBusinessActions ?? humanizeOperatorActions(revenueReadiness?.availableActions ?? []);
          const upgrades = (revenueStatus?.capabilityReadiness?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
          const configured = Boolean(revenueReadiness?.canRunManual);
          const eligibility = revenueReadiness?.executionEligibility;
          return (
            <section className="p" style={{ marginTop: 14, padding: 0 }}>
              <div className="p-head"><h3>Operator activation</h3></div>
              <div style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                  <div>
                    <div className="p-meta">Systems in use</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-dim)" }}>{systemsInUse.length ? systemsInUse.join(", ") : "None connected yet"}</div>
                    <Link href="/app/connectors" className="lnk-open" style={{ marginTop: 6, display: "inline-block" }}>Manage connections</Link>
                  </div>
                  <div>
                    <div className="p-meta">Available now</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-dim)" }}>{availableNow.length ? availableNow.join(", ") : "Connect a system to get started"}</div>
                  </div>
                </div>
                {upgrades.length > 0 && (
                  <div>
                    <div className="p-meta">Optional enhancements</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-dim)" }}>
                      {upgrades.map((c) => c.displayName).join(", ")} could add further context. <Link href="/app/connectors" className="lnk-open">Connect</Link>
                    </div>
                  </div>
                )}
                {eligibility && state.workspace.id && (
                  <OperatorActivationToggle
                    operatorKey="revenue"
                    workspaceId={state.workspace.id}
                    userId={state.currentUser.id}
                    userEmail={state.currentUser.email}
                    executionEligibility={eligibility}
                    configured={configured}
                  />
                )}
              </div>
            </section>
          );
        })()}

        {state.workspace.id && (
          <OperatorDegradedNotice
            operatorKey="revenue"
            workspaceId={state.workspace.id}
            userId={state.currentUser.id}
            userEmail={state.currentUser.email}
          />
        )}

        <details className="p" style={{ marginTop: 14, padding: 0 }} open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}>
          <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 540 }}>Prepare a one-off follow-up</span><span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 10 }}>Advanced</span></summary>
          <form onSubmit={submitRevenueRun} style={{ borderTop: "1px solid var(--line)", padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="os-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" required />
            <input className="os-input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Lead email" type="email" required />
            <textarea className="os-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context for the follow-up" rows={3} required style={{ gridColumn: "1 / -1" }} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!canRunRevenue || runSubmitting} style={{ width: "fit-content" }}>{runSubmitting ? "Preparing..." : "Prepare for approval"}</button>
          </form>
        </details>
      </div>
    );
  }

  return (
    <div className="os-page operator-detail-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Revenue</span>
          <h1>Revenue Operator</h1>
          <div className="os-page-sub">Auterim watches revenue signals in the background and asks for approval only when action is needed.</div>
        </div>
        <div className="os-page-actions">
          <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitRevenueScan} disabled={!canRunRevenue || scanSubmitting} style={{ opacity: !canRunRevenue || scanSubmitting ? 0.45 : 1 }}>
            {scanSubmitting ? "Checking..." : "Run manual check"}
          </button>
        </div>
      </div>

      {runtimeError && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{runtimeError}</div>}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Monitoring active</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>{runtimeLoading ? "Loading real operator state..." : monitoring?.nextScanLabel ?? "Daily scan ready"}</div>
          </div>
          {gmailReconnectRequired && <button className="btn btn-primary btn-sm" type="button" onClick={startGmailReconnect}>Reconnect Gmail</button>}
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 820 }}>Auterim monitors in the background and only creates approvals for high-confidence revenue opportunities. Manual checks remain available for testing or one-off review.</div>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{revenueStatus?.v1Readiness?.status ?? modeLabel}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-mute)" }}>{modeHelp}</div>
              {revenueStatus?.v1Readiness?.optionalCrmEnrichmentMissing && (
                <div style={{ marginTop: 5, fontSize: 11.5, color: "var(--amber)" }}>Optional CRM enrichment missing: HubSpot custom attribution properties are not fully configured.</div>
              )}
            </div>
            <span className="appr-btn edit" style={{ cursor: "default" }}>{revenueStatus?.hubspot?.connected ? "HubSpot connected" : "HubSpot missing"}</span>
          </div>
          {v1Checks && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
              {[
                ["Gmail send after approval", v1Checks.gmailSendAfterApproval],
                ["HubSpot contact/deal", v1Checks.hubspotContactDealExecution],
                ["Contact/deal association", v1Checks.contactDealAssociation],
                ["Attribution properties", v1Checks.hubspotAttributionProperties],
                ["Pipeline mapping", v1Checks.pipelineMapping],
              ].map(([label, value]) => (
                <MetricCard key={label} label={label || ""} value={value || "unknown"} />
              ))}
            </div>
          )}
          {revenueStatus?.v1Readiness?.pipeline && (
            <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
              Pipeline: {revenueStatus.v1Readiness.pipeline.pipelineLabel || "-"} · Stage: {revenueStatus.v1Readiness.pipeline.dealstageLabel || "-"} · {revenueStatus.v1Readiness.pipeline.pipelineSelectionReason || ""}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            <MetricCard label="Monitoring status" value={monitoring?.status ?? "loading"} />
            <MetricCard label="Last check" value={lastCheckAt ? relativeTime(lastCheckAt) : "No check yet"} />
            <MetricCard label="Next check" value={dateTimeLabel(monitoring?.nextRunAt)} />
            <MetricCard label="Cadence" value={monitoring?.cadence ?? "daily"} />
            <MetricCard label="Opportunities" value={String(monitoring?.opportunitiesFound ?? 0)} />
            <MetricCard label="Approvals" value={String(monitoring?.approvalsCreated ?? 0)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <MetricCard label="Emails checked last run" value={String(monitoring?.lastScannedCount ?? 0)} />
            <MetricCard label="Skipped duplicates/noise" value={String(monitoring?.skippedSafelyCount ?? 0)} />
            <MetricCard label="Source mode" value={monitoring?.sourceMode ?? "scheduled"} />
          </div>
          {gmailReconnectRequired && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(245,194,107,0.06)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)", color: "var(--amber)", fontSize: 12 }}>Reconnect Gmail to enable inbox monitoring.</div>}
          {!gmailReconnectRequired && !monitoring?.lastRunAt && !monitoring?.lastScanTime && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Monitoring is active. No background check has run yet.</div>}
          {!gmailReconnectRequired && latestScanHadNoOpportunities && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>No high-confidence revenue opportunities found in the latest check.</div>}
          {scanResult && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: scanNeedsReconnect ? "rgba(245,194,107,0.06)" : "rgba(77,232,225,0.06)", boxShadow: scanNeedsReconnect ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(77,232,225,0.18)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanNeedsReconnect ? "Reconnect Gmail required" : `Manual check ${scanResult.status ?? "completed"}`}</div>
              {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
              {!scanNeedsReconnect && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.scanned ?? 0} scanned / {scanResult.opportunitiesFound ?? 0} found / {scanResult.approvalsCreated ?? 0} approvals prepared.</div>}
              {!scanNeedsReconnect && scanSkippedSummary && <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Skipped safely: {scanSkippedSummary}</div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Readiness</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{revenueReadiness?.status ?? "loading"}</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${revenueReadiness?.readinessPercent ?? 0}%`, background: "linear-gradient(90deg, #4DE8E1, #51D88A)" }} /></div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{revenueStatusMessage}</div>
            <TagList title="Connected required connectors" items={revenueReadiness?.connectedRequiredConnectors ?? []} empty="None" />
            <TagList title="Missing required connectors" items={revenueReadiness?.missingRequiredConnectors ?? []} empty="None" />
            <TagList title="Available now" items={revenueReadiness?.availableBusinessActions ?? humanizeOperatorActions(revenueReadiness?.availableActions ?? [])} empty="None" />
            <TagList title="Approval required actions" items={revenueReadiness?.approvalRequiredActions ?? []} empty="None" />
            <TagList title="Blocked actions" items={revenueReadiness?.blockedActions ?? []} empty="None" />
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Gmail permissions</h3><span className="appr-btn edit" style={{ cursor: "default" }}>{revenueStatus?.gmail?.status ?? "unknown"}</span></div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{revenueStatus?.gmail?.accountEmail ?? "No Gmail account loaded"}</div>
            <TagList title="Permissions" items={[
              `Compose: ${revenueStatus?.gmail?.permissions?.compose ? "granted" : "missing"}`,
              `Send: ${revenueStatus?.gmail?.permissions?.send ? "granted" : "missing"}`,
              `Inbox monitoring: ${revenueStatus?.gmail?.permissions?.readonly ? "granted" : "missing"}`,
            ]} empty="None" />
          </div>
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Recent approvals and runs</h3><Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link></div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Revenue approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 12.8, fontWeight: 500 }}>{approval.subject || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{approval.to || "Unknown recipient"} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent runs</div>
            {revenueRuns.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No real Revenue Operator runs yet.</div> : revenueRuns.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 12.8, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Revenue run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {runResult?.run && (
        <div className="p" style={{ padding: 12, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Manual follow-up approval created</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Run: {runResult.run.id} · Status: {runResult.run.status} · Approval: {runResult.output?.approvalId || runResult.approval?.approvalId || runResult.run.approvalId}</div>
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ width: "fit-content", textDecoration: "none" }}>View approval</Link>
        </div>
      )}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Advanced</h3>
          <button className="appr-btn edit" type="button" onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? "Hide manual follow-up" : "Advanced: prepare one follow-up manually"}</button>
        </div>
        {advancedOpen && (
          <form onSubmit={submitRevenueRun} style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-mute)" }}>Manual mode creates a single follow-up draft and approval from your input.</div>
            <input className="os-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" required />
            <input className="os-input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Lead email" type="email" required />
            <textarea className="os-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context for the follow-up" rows={4} required />
            <input className="os-input" value="follow_up" disabled aria-disabled="true" />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!canRunRevenue || runSubmitting} style={{ opacity: !canRunRevenue || runSubmitting ? 0.45 : 1, width: "fit-content" }}>{runSubmitting ? "Preparing..." : "Prepare manual follow-up approval"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
