"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { GLYPHS, OPERATORS } from "@/data/operators";

export type OperatorDetailKey = "revenue" | "client_flow" | "operations";

const META: Record<OperatorDetailKey, { index: number; statusRoute: string; scanRoute: string }> = {
  revenue: { index: 0, statusRoute: "/api/operators/revenue/status", scanRoute: "/api/operators/revenue/scan" },
  client_flow: { index: 1, statusRoute: "/api/operators/client-flow/status", scanRoute: "/api/operators/client-flow/scan" },
  operations: { index: 2, statusRoute: "/api/operators/operations/status", scanRoute: "/api/operators/operations/scan" },
};

const CONNECTOR_META: Record<string, { logo: string; color: string }> = {
  gmail: { logo: "G", color: "#EA4335" },
  hubspot: { logo: "Hs", color: "#FF7A59" },
  slack: { logo: "Sl", color: "#A77FBC" },
  trello: { logo: "Tr", color: "#4BA3E8" },
  google_drive: { logo: "Dr", color: "#4285F4" },
  notion: { logo: "No", color: "#ECEFF3" },
  calendar: { logo: "Ca", color: "#4285F4" },
};

type OperatorReadiness = {
  operatorKey: string;
  status: "ready" | "draft_only" | "missing_connector" | "upgrade_required" | "coming_next" | "preview";
  readinessPercent: number;
  missingRequiredConnectors: string[];
  connectedRequiredConnectors: string[];
  availableActions: string[];
  approvalRequiredActions: string[];
  blockedActions: string[];
  nextSetupStep: string;
  canRunManual: boolean;
  canExecuteRealActions: boolean;
  reason: string;
};

type MonitoringBlock = {
  status?: string;
  message?: string;
  cadence?: string;
  lastRunAt?: string | null;
  lastScanTime?: string | null;
  nextRunAt?: string | null;
  nextScanLabel?: string;
  emailsChecked?: number;
  lastScannedCount?: number;
  cardsChecked?: number;
  signalsFound?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  recentPendingApprovals?: { id: string; title: string; created_at: string | null; cardName?: string | null; subject?: string | null; to?: string | null }[];
};

type StatusResponse = { monitoring?: MonitoringBlock; error?: string };

type RunRow = { id: string; status: string; output: { title?: string; type?: string } | null; approval_id: string | null; created_at: string };

function num(...vals: Array<number | undefined>): number {
  for (const v of vals) if (typeof v === "number") return v;
  return 0;
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "not yet";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

function connectorChip(name: string) {
  const meta = CONNECTOR_META[name] ?? { logo: name.slice(0, 2), color: "#4DE8E1" };
  return (
    <span className="od-conn" key={name}>
      <span className="logo" style={{ color: meta.color, background: `${meta.color}1c`, boxShadow: `inset 0 0 0 1px ${meta.color}45` }}>{meta.logo}</span>
      {titleCase(name)}
    </span>
  );
}

export function OperatorDetail({ operatorKey }: { operatorKey: OperatorDetailKey }) {
  const { state } = useOS();
  const meta = META[operatorKey];
  const op = OPERATORS[meta.index];

  const [readiness, setReadiness] = useState<OperatorReadiness | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const load = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", operatorKey);
      const [readinessRes, statusRes, runsRes] = await Promise.all([
        fetch(`/api/operators/readiness?${identityParams.toString()}`, { cache: "no-store" }),
        fetch(`${meta.statusRoute}?${identityParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as StatusResponse;
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: RunRow[] };
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load operator readiness.");
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load operator status.");
      setReadiness((readinessJson.readiness ?? []).find((r) => r.operatorKey === operatorKey) ?? null);
      setStatus(statusJson);
      setRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operator.");
    }
  }, [identityParams, meta.statusRoute, operatorKey, state.workspace.id]);

  useEffect(() => { void load(); }, [load]);

  const runManualCheck = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(meta.scanRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, maxResults: 10 }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.message || json.error || "Manual check could not run.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual check could not run.");
    } finally {
      setBusy(false);
    }
  };

  const m = status?.monitoring ?? {};
  const monitoringActive = m.status === "monitoring_active";
  const canRun = Boolean(readiness?.canRunManual);
  const lastRunAt = m.lastRunAt ?? m.lastScanTime ?? null;
  const checked = num(m.emailsChecked, m.lastScannedCount, m.cardsChecked);
  const signals = num(m.signalsFound, m.opportunitiesFound);
  const approvalsCreated = num(m.approvalsCreated);
  const pending = m.recentPendingApprovals ?? [];

  const readinessPct = readiness?.readinessPercent ?? 0;
  const isReady = readiness?.status === "ready" || readiness?.status === "draft_only";
  const verTitle = readiness?.status === "ready"
    ? `${op.name} is ready`
    : readiness?.status === "draft_only"
      ? `${op.name} ready in draft mode`
      : readiness?.status === "missing_connector"
        ? "Finish setup to activate"
        : op.name;
  const statusChip = isReady ? "Healthy" : readiness ? titleCase(readiness.status) : "Loading";

  return (
    <div className="os-page od-page" style={{ "--c": op.color } as CSSProperties}>
      <Link href="/app/agents" className="od-back">
        <span className="dot" /> Operators <span className="sep">/</span> {op.tag.split(" ")[0]}
      </Link>

      {error && <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      {/* Hero */}
      <div className="od-hero">
        <div className="od-hero-av" style={{ background: `linear-gradient(135deg, ${op.color}26, ${op.color}08)`, boxShadow: `inset 0 0 0 1px ${op.color}55`, color: op.color }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="ag-person"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z" /></svg>
          <span className="ag-badge" style={{ color: op.color, boxShadow: `0 0 0 2px var(--bg), inset 0 0 0 1px ${op.color}55` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GLYPHS[op.glyph] ?? "" }} />
          </span>
        </div>
        <div className="od-hero-id">
          <div className="od-hero-name-row">
            <span className="od-hero-name">{op.name}</span>
            <span className={`od-live ${monitoringActive ? "" : "warn"}`}><span className="d" /> {monitoringActive ? "Monitoring active" : "Setup needed"}</span>
          </div>
          <div className="od-hero-tag">{op.tag}</div>
          <div className="od-hero-mission">{op.mission}</div>
        </div>
        <div className="od-hero-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={runManualCheck} disabled={!canRun || busy} style={{ opacity: !canRun || busy ? 0.45 : 1 }}>{busy ? "Checking..." : "Run manual check"}</button>
          <Link className="btn btn-primary btn-sm" href="/app/approvals" style={{ textDecoration: "none" }}>View approvals</Link>
        </div>
      </div>

      <div className="od-stack">
        {/* Monitoring */}
        <div className="p">
          <div className="p-head">
            <h3>Monitoring</h3>
            <div className="p-meta">
              <span className={`p-chip ${monitoringActive ? "ok" : "amber"}`}>{monitoringActive ? "Active" : "Idle"}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{m.nextScanLabel ?? "Daily scan"} Â· {m.cadence ?? "daily"}</span>
            </div>
          </div>
          <div className="p-body">
            <div className="od-ver">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="od-ver-title">{verTitle}</div>
                <div className="od-ver-detail">{readiness?.reason ?? "Reading operator readiness."}</div>
                {!isReady && readiness?.nextSetupStep && <div className="od-ver-warn">{readiness.nextSetupStep}</div>}
              </div>
              <span className="p-chip cyan">{statusChip}</span>
            </div>

            <div className="od-stats">
              <div className="od-stat nb"><div className="l">Last check</div><div className="v">{lastRunAt ? timeAgo(lastRunAt) : "Not yet"}</div></div>
              <div className="od-stat"><div className="l">Cadence</div><div className="v mono">{m.cadence ?? "daily"}</div></div>
              <div className="od-stat"><div className="l">Checked</div><div className="v">{checked}</div></div>
              <div className="od-stat"><div className="l">Signals</div><div className="v">{signals}</div></div>
              <div className="od-stat"><div className="l">Approvals</div><div className="v">{approvalsCreated}</div></div>
            </div>

            {m.message && <div className="od-note">{m.message}</div>}
          </div>
        </div>

        {/* Readiness | Connected access */}
        <div className="od-row">
          <div className="p">
            <div className="p-head">
              <h3>Readiness</h3>
              <span className={`p-chip ${isReady ? "ok" : "amber"}`}>{isReady ? "Healthy" : "Setup"}</span>
            </div>
            <div className="p-body">
              <div className="od-bar"><i style={{ width: `${readinessPct}%` }} /></div>
              <div className="od-sub">{readiness?.reason ?? "Reading readiness."}</div>
              <div className="od-field">
                <div className="od-field-lab">Connected connectors</div>
                <div className="od-conn-row">
                  {(readiness?.connectedRequiredConnectors ?? []).length === 0
                    ? <span className="od-conn none">None yet</span>
                    : readiness!.connectedRequiredConnectors.map(connectorChip)}
                </div>
              </div>
              <div className="od-field">
                <div className="od-field-lab">Missing connectors</div>
                <div className="od-conn-row">
                  {(readiness?.missingRequiredConnectors ?? []).length === 0
                    ? <span className="od-conn none">None</span>
                    : readiness!.missingRequiredConnectors.map(connectorChip)}
                </div>
              </div>
            </div>
          </div>

          <div className="p">
            <div className="p-head">
              <h3>Access &amp; execution</h3>
              <span className={`p-chip ${readiness?.canExecuteRealActions ? "ok" : "amber"}`}>{readiness?.canExecuteRealActions ? "Live" : "Gated"}</span>
            </div>
            <div className="p-body">
              <div className="od-acct">{state.currentUser.email || "Workspace account"}</div>
              <div className="od-field">
                <div className="od-field-lab">Granted</div>
                <div className="od-perms">
                  {(readiness?.connectedRequiredConnectors ?? []).length === 0
                    ? <span className="od-conn none">No connectors yet</span>
                    : readiness!.connectedRequiredConnectors.map((c) => <span className="od-perm" key={c}>{titleCase(c)}</span>)}
                </div>
              </div>
              <div className="od-field">
                <div className="od-field-lab">Controls</div>
                <div className="od-perms">
                  <span className="od-perm" style={{ color: canRun ? "var(--green)" : "var(--text-mute)", background: canRun ? undefined : "rgba(255,255,255,0.03)", boxShadow: canRun ? undefined : "inset 0 0 0 1px var(--line)" }}>Manual checks {canRun ? "on" : "off"}</span>
                  <span className="od-perm" style={{ color: readiness?.canExecuteRealActions ? "var(--green)" : "var(--text-mute)", background: readiness?.canExecuteRealActions ? undefined : "rgba(255,255,255,0.03)", boxShadow: readiness?.canExecuteRealActions ? undefined : "inset 0 0 0 1px var(--line)" }}>Real execution {readiness?.canExecuteRealActions ? "on" : "gated"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action policy */}
        <div className="p">
          <div className="p-head">
            <h3>Action policy</h3>
            <div className="p-meta">what runs freely, what needs sign-off, what is blocked</div>
          </div>
          <div className="p-body">
            <div className="od-cap">
              <div className="od-cap-group ok">
                <div className="gl">Available actions <span className="gc">Â· run automatically</span></div>
                <div className="od-chiprow">
                  {(readiness?.availableActions ?? []).map((a) => <span className="od-chip ok" key={a}><span className="cd" />{a}</span>)}
                </div>
              </div>
              <div className="od-cap-group gate">
                <div className="gl">Approval required <span className="gc">Â· human gate</span></div>
                <div className="od-chiprow">
                  {(readiness?.approvalRequiredActions ?? []).map((a) => <span className="od-chip gate" key={a}><span className="cd" />{a}</span>)}
                </div>
              </div>
              <div className="od-cap-group block">
                <div className="gl">Blocked <span className="gc">Â· never permitted</span></div>
                <div className="od-chiprow">
                  {(readiness?.blockedActions ?? []).map((a) => <span className="od-chip block" key={a}><span className="cd" />{a}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent runs | Pending approvals */}
        <div className="od-row lead">
          <div className="p">
            <div className="p-head">
              <h3>Recent runs</h3>
              <div className="p-meta">latest activity</div>
            </div>
            <div className="p-body" style={{ paddingTop: 6, paddingBottom: 8 }}>
              {runs.length === 0
                ? <div className="od-empty">No runs yet. Run a manual check to see activity here.</div>
                : runs.slice(0, 6).map((r) => (
                  <div className="od-run" key={r.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="od-run-nm">{r.output?.title || titleCase(r.output?.type) || "Operator run"}</div>
                      <div className="od-run-meta">{timeAgo(r.created_at)} Â· approval: <span className={r.approval_id ? "ref" : ""}>{r.approval_id || "none"}</span></div>
                    </div>
                    <span className={`od-run-status ${r.status === "failed" ? "failed" : r.status === "waiting_for_approval" ? "pending" : ""}`}>{titleCase(r.status)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="p">
            <div className="p-head">
              <h3>Pending approvals</h3>
              <Link className="btn btn-ghost btn-sm" href="/app/approvals" style={{ textDecoration: "none" }}>Approval inbox</Link>
            </div>
            <div className="p-body">
              {pending.length === 0
                ? <div className="od-empty">No pending approvals. Auterim will surface one here the moment an action needs sign-off.</div>
                : pending.map((a) => (
                  <div className="od-run" key={a.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="od-run-nm">{a.title || a.cardName || a.subject || "Approval"}</div>
                      <div className="od-run-meta">{a.to || a.cardName || "Awaiting review"} Â· {timeAgo(a.created_at)}</div>
                    </div>
                    <Link className="appr-btn approve" href="/app/approvals" style={{ textDecoration: "none" }}>Review</Link>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="p">
          <div className="p-body od-adv">
            <div className="od-adv-txt">
              <div className="t">Advanced</div>
              <div className="s">Run a manual check now, outside the scheduled monitoring loop.</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={runManualCheck} disabled={!canRun || busy} style={{ opacity: !canRun || busy ? 0.45 : 1 }}>{busy ? "Checking..." : "Run manual check"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
