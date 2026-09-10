"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { OperatorActivationToggle, type ActivationEligibility } from "@/components/operators/activation-toggle";
import { OperatorWorkforceBriefing, type OperatorBriefingState } from "@/components/operators/workforce-briefing";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";
import { OperatorRuntimeAvatar } from "@/components/operators/runtime-avatar";

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
    source?: string | null;
    missingScopes?: string[];
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

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RevenueOperatorPage() {
  const { state } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const [revenueReadiness, setRevenueReadiness] = useState<OperatorReadiness | null>(null);
  const [revenueStatus, setRevenueStatus] = useState<RevenueStatus | null>(null);
  const [presentationState, setPresentationState] = useState<OperatorBriefingState | null>(null);
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
  const scanSkippedSummary = scanResult?.skipped?.length
    ? Object.entries(scanResult.skipped.reduce<Record<string, number>>((counts, item) => {
      counts[item.reason] = (counts[item.reason] ?? 0) + 1;
      return counts;
    }, {})).map(([reason, count]) => `${reason}: ${count}`).join(" / ")
    : "";
  const pendingApprovals = monitoring?.recentPendingApprovals?.length ?? 0;
  const optionalContext = getOperatorCapabilityCopy("revenue").optional;
  const showRuntime = presentationState?.lifecycle === "active";
  const showControls = Boolean(presentationState && presentationState.lifecycle !== "available_to_unlock");
  const connectionLabel = !entitlements.canUseRealConnectors
    ? "Available after trial activation"
    : revenueStatus?.gmail?.accountEmail
    ? revenueStatus.gmail.accountEmail
    : "Gmail connection required";

  return (
    <div className="os-page operator-detail-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div className="inline" style={{ gap: 16, alignItems: "flex-start" }}>
          <OperatorRuntimeAvatar operatorKey="revenue" />
          <div>
            <div className="inline" style={{ gap: 11 }}>
              <h1 className="t-title" style={{ fontSize: 24 }}>Revenue Operator</h1>
              {presentationState && <span className="os-status" data-state={presentationState.state}>{presentationState.label}</span>}
            </div>
            <p className="t-sub" style={{ marginTop: 7 }}>Find opportunities and prepare follow-ups for approval.</p>
          </div>
        </div>
      </div>

      {runtimeError && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{runtimeError}</div></section>}

      <OperatorWorkforceBriefing
        operatorKey="revenue"
        onStateChange={setPresentationState}
        runtime={{
          pendingApprovals,
          monitoringLabel: monitoring?.status === "monitoring_active" ? "Active" : "Scheduled",
          nextCheckLabel: dateTimeLabel(monitoring?.nextRunAt),
        }}
      />

      {(showRuntime || showControls) && (
        <div className="sec split">
          {showRuntime && <div className="stack">
            <div className="card">
              <div className="card-head">
                <div className="t-section">Current work</div>
                <div className="inline">{pendingApprovals > 0 ? <Link href="/app/approvals" className="btn btn-primary btn-sm">{pendingApprovals} awaiting review</Link> : null}<button className="btn btn-ghost btn-sm" type="button" onClick={submitRevenueScan} disabled={!canRunRevenue || scanSubmitting}>{scanSubmitting ? "Checking…" : "Run manual check"}</button></div>
              </div>
              {pendingApprovals > 0 ? (
                <div className="rows">
                  {monitoring?.recentPendingApprovals.map((approval) => (
                    <div className="row" key={approval.id}>
                      <span className="grow"><span className="ttl">{approval.subject || approval.title}</span><span className="sub">{approval.to || "Unknown recipient"}</span></span>
                      <span className="badge amber">APPROVAL NEEDED</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-pad t-meta">{revenueRuns.length ? `${revenueRuns.length} recent check${revenueRuns.length === 1 ? "" : "s"} recorded. Next scheduled check: ${dateTimeLabel(monitoring?.nextRunAt)}.` : `No issues need attention right now. Next scheduled check: ${dateTimeLabel(monitoring?.nextRunAt)}.`}</div>
              )}
              {gmailReconnectRequired && (
                <div className="card-pad" style={{ borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span className="t-compact" style={{ color: "var(--amber)" }}>Gmail needs to be reconnected before Revenue Operator can keep monitoring.</span>
                  <button className="btn btn-sm btn-amber" type="button" onClick={startGmailReconnect}>Reconnect Gmail</button>
                </div>
              )}
              {scanResult && (
                <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="t-object" style={{ fontSize: 13 }}>{scanNeedsReconnect ? "Reconnect Gmail required" : `Manual check ${scanResult.status ?? "completed"}`}</div>
                  {scanResult.message && <div className="t-compact" style={{ marginTop: 4 }}>{scanResult.message}</div>}
                  {!scanNeedsReconnect && <div className="t-meta" style={{ marginTop: 4 }}>{scanResult.scanned ?? 0} scanned · {scanResult.opportunitiesFound ?? 0} found · {scanResult.approvalsCreated ?? 0} approvals prepared{scanSkippedSummary ? ` · skipped: ${scanSkippedSummary}` : ""}</div>}
                </div>
              )}
            </div>

            <details className="card">
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-object">Connection and policy details</span><span className="t-meta">Show</span></summary>
              <div className="kv" style={{ padding: "16px 18px", borderTop: "1px solid var(--line)" }}>
                <dt>Gmail</dt><dd>{connectionLabel} · inbox monitoring {revenueStatus?.gmail?.permissions?.readonly ? "granted" : "not granted"}</dd>
                <dt>CRM</dt><dd>{revenueStatus?.hubspot?.connected ? "HubSpot connected" : "Optional, not connected"} · {revenueStatus?.hubspot?.accountEmail || "Email follow-ups remain approval-gated."}</dd>
                <dt>Control boundary</dt><dd>External sends require approval{revenueStatus?.v1Readiness?.checks.pipelineMapping ? ` · pipeline mapping: ${revenueStatus.v1Readiness.checks.pipelineMapping}` : ""}</dd>
              </div>
            </details>

            <details className="card" open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}>
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-object">Prepare a one-off follow-up</span><span className="t-meta">Advanced</span></summary>
              <form onSubmit={submitRevenueRun} style={{ borderTop: "1px solid var(--line)", padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input className="input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" required />
                <input className="input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Lead email" type="email" required />
                <textarea className="input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context for the follow-up" rows={3} required style={{ gridColumn: "1 / -1" }} />
                <button className="btn btn-primary btn-sm" type="submit" disabled={!canRunRevenue || runSubmitting} style={{ width: "fit-content" }}>{runSubmitting ? "Preparing…" : "Prepare for approval"}</button>
              </form>
            </details>
          </div>}

          <div className="stack">
            {showRuntime && <div className="card">
              <div className="card-head"><div className="t-section">Policy</div></div>
              <div className="rows">
                <div className="row"><span className="grow t-compact">Customer-facing messages</span><span className="badge amber">APPROVAL</span></div>
                <div className="row"><span className="grow t-compact">CRM updates</span><span className="badge amber">APPROVAL</span></div>
                <div className="row"><span className="grow t-compact">Human review</span><span className="badge">REQUIRED</span></div>
              </div>
            </div>}

            {showControls && (() => {
              const upgrades = (revenueStatus?.capabilityReadiness?.optionalUpsellConnectors ?? []).filter((c) => c.status === "available");
              const configured = Boolean(revenueReadiness?.canRunManual);
              const eligibility = revenueReadiness?.executionEligibility;
              return (
                <div className="card">
                  <div className="card-head"><div className="t-section">Context & controls</div><Link href="/app/connectors" className="btn btn-sm btn-ghost">Manage context</Link></div>
                  <div className="card-pad" style={{ display: "grid", gap: 14 }}>
                    {upgrades.length > 0 && (
                      <div>
                        <div className="t-eyebrow">Add more context</div>
                        <div className="t-compact" style={{ marginTop: 6 }}>{optionalContext.join(" · ")}</div>
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
                        canManage={state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin"}
                        runtimeControl
                      />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
