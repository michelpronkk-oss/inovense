"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";

type OperationsRun = {
  id: string;
  operator_key: string;
  status: string;
  output: { title?: string; type?: string } | null;
  approval_id: string | null;
  created_at: string;
};

type OperationsScanResult = {
  status?: string;
  message?: string;
  setupComplete?: boolean;
  cardsChecked?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  signals?: { signalType: string; severity: string; cardName?: string; listName?: string; approvalId: string }[];
  suggestions?: string[];
  error?: string;
};

type OperationsSetup = {
  state?: "ready" | "setup_incomplete" | "needs_setup";
  readinessPercent?: number;
  coreReady?: boolean;
  trelloConnected?: boolean;
  trelloDestinationSet?: boolean;
  slackConnected?: boolean;
  slackChannelSelected?: boolean;
  slackAlertsReady?: boolean;
  slackRecommendedMissing?: boolean;
  approvalFlowActive?: boolean;
  canRunManual?: boolean;
};

type OperationsStatus = {
  trello?: { status?: string; connected?: boolean; defaultBoardName?: string | null; defaultListName?: string | null } | null;
  slack?: { status?: string; connected?: boolean; channelSelected?: boolean; defaultChannelName?: string | null } | null;
  setup?: OperationsSetup;
  monitoring?: {
    status: string;
    cadence?: string;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastScanTime: string | null;
    cardsChecked: number;
    signalsFound: number;
    approvalsCreated: number;
    staleOverdueCount: number;
    nextScanLabel: string;
    recentPendingApprovals: { id: string; title: string; created_at: string | null; signalType: string | null; severity: string | null; cardName: string | null; listName: string | null }[];
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

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, flexShrink: 0, color: ok ? "var(--green)" : "var(--amber)", background: ok ? "rgba(81,216,138,0.12)" : "rgba(245,194,107,0.12)", boxShadow: `inset 0 0 0 1px ${ok ? "rgba(81,216,138,0.4)" : "rgba(245,194,107,0.4)"}`, fontSize: 12 }}>{ok ? "✓" : "!"}</span>
  );
}

type ChecklistItem = { label: string; ok: boolean; detail: string; recommended?: boolean; action?: { label: string; href: string } };

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const showAction = item.action && (!item.ok || item.recommended);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
      <CheckIcon ok={item.ok} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
          {item.recommended && !item.ok && <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--blue)", background: "rgba(91,141,239,0.12)", padding: "2px 7px", borderRadius: 999 }}>Recommended</span>}
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--text-mute)" }}>{item.detail}</div>
      </div>
      {showAction && item.action ? (
        <Link href={item.action.href} className="btn btn-ghost btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>{item.action.label}</Link>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? "var(--green)" : "var(--amber)", flexShrink: 0 }}>{item.ok ? "Ready" : "Needs setup"}</span>
      )}
    </div>
  );
}

function ToolCard({ name, tone, ready, headline, note }: { name: string; tone: string; ready: boolean; headline: string; note?: string }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: ready ? "var(--green)" : "var(--amber)", boxShadow: `0 0 8px ${ready ? "rgba(81,216,138,0.6)" : "rgba(245,194,107,0.5)"}` }} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{tone}</span>
      </div>
      <div style={{ fontSize: 12.8, color: "var(--text-dim)" }}>{headline}</div>
      {note && <div style={{ fontSize: 12, color: "var(--amber)" }}>{note}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-mute)" }}>{label}</div>
    </div>
  );
}

export default function OperationsOperatorPage() {
  const { state } = useOS();
  const [status, setStatus] = useState<OperationsStatus | null>(null);
  const [runs, setRuns] = useState<OperationsRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<OperationsScanResult | null>(null);

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadRuntime = useCallback(async () => {
    if (!state.workspace.id) return;
    setLoading(true);
    setError("");
    try {
      const runsQs = new URLSearchParams(identityParams);
      runsQs.set("operatorKey", "operations");
      const statusQs = new URLSearchParams(identityParams);
      const [runsRes, statusRes] = await Promise.all([
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/operations/status?${statusQs.toString()}`, { cache: "no-store" }),
      ]);
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: OperationsRun[]; error?: string };
      const statusJson = await statusRes.json().catch(() => ({})) as OperationsStatus;
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Operations status.");
      setStatus(statusJson);
      setRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Operations runtime.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void loadRuntime(); }, [loadRuntime]);

  const submitScan = async () => {
    setScanSubmitting(true);
    setError("");
    setScanResult(null);
    try {
      const res = await fetch("/api/operators/operations/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }),
      });
      const json = await res.json().catch(() => ({})) as OperationsScanResult;
      setScanResult(json);
      if (!res.ok) throw new Error(json.message || json.error || "Operations check failed.");
      await loadRuntime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operations check failed.");
    } finally {
      setScanSubmitting(false);
    }
  };

  const setup = status?.setup;
  const monitoring = status?.monitoring;
  const canRun = Boolean(setup?.canRunManual);
  const setupState = setup?.state ?? "needs_setup";
  const readinessPercent = setup?.readinessPercent ?? 0;
  const lastCheckAt = monitoring?.lastRunAt ?? monitoring?.lastScanTime ?? null;
  const hasRunScan = Boolean(lastCheckAt);

  const pill = (() => {
    if (setupState === "needs_setup") return { label: "Needs setup", color: "var(--rose)", bg: "rgba(242,118,124,0.1)" };
    if (setupState === "setup_incomplete") return { label: "Setup incomplete", color: "var(--amber)", bg: "rgba(245,194,107,0.1)" };
    if (monitoring?.status === "monitoring_active") return { label: "Monitoring active", color: "var(--green)", bg: "rgba(81,216,138,0.1)" };
    return { label: "Ready", color: "var(--green)", bg: "rgba(81,216,138,0.1)" };
  })();

  const heroTitle = setupState === "needs_setup"
    ? "Connect Trello to start Operations"
    : setupState === "setup_incomplete"
      ? "Operations is almost ready"
      : "Operations is monitoring your boards";
  const heroSub = (() => {
    if (setupState === "needs_setup") return "Operations reads your Trello boards and prepares approved internal updates. Connect Trello to begin.";
    if (setupState === "setup_incomplete") return "Select a default Trello board and list so Operations can turn stalled work into approved actions.";
    return "Watching project boards in the background. Approvals appear only when work needs attention.";
  })();

  const checklist: ChecklistItem[] = [
    {
      label: "Trello connected",
      ok: Boolean(setup?.trelloConnected),
      detail: setup?.trelloConnected ? "Reading project boards and cards." : "Connect Trello to read project boards and cards.",
      action: { label: "Open Trello settings", href: "/app/connectors" },
    },
    {
      label: "Trello default board and list selected",
      ok: Boolean(setup?.trelloDestinationSet),
      detail: setup?.trelloDestinationSet
        ? `Default board: ${status?.trello?.defaultBoardName || "set"} · list: ${status?.trello?.defaultListName || "set"}.`
        : "Select a default board and list so Operations knows where to look and act.",
      action: { label: "Select board/list", href: "/app/connectors" },
    },
    {
      label: "Approval flow active",
      ok: Boolean(setup?.approvalFlowActive ?? true),
      detail: "Every Slack update and Trello change waits for human approval before it runs.",
      action: { label: "View approvals", href: "/app/approvals" },
    },
    {
      label: "Slack alert channel selected",
      ok: Boolean(setup?.slackAlertsReady),
      recommended: true,
      detail: setup?.slackConnected
        ? setup?.slackChannelSelected
          ? `Internal updates can post to ${status?.slack?.defaultChannelName ? `#${status.slack.defaultChannelName}` : "the selected channel"}.`
          : "Connected, but no channel selected. Select one for internal updates."
        : "Connect Slack to prepare internal operations updates.",
      action: { label: "Open Slack settings", href: "/app/connectors" },
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet"><Link href="/app/agents" style={{ color: "inherit", textDecoration: "none" }}>Operators</Link> / Operations</span>
          <h1>Operations Operator</h1>
          <div className="os-page-sub">Monitors internal work, finds stalled tasks, and prepares approved operational updates.</div>
        </div>
        <div className="os-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: pill.color, background: pill.bg, padding: "6px 12px", borderRadius: 999 }}>{pill.label}</span>
          <Link href="/app/approvals" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
          <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>
            {scanSubmitting ? "Checking..." : "Run manual check"}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      <div className="p" style={{ gap: 0, overflow: "hidden" }}>
        <div style={{ padding: "24px 26px", display: "grid", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ minWidth: 240, flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{loading ? "Loading operator state..." : heroTitle}</h2>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--text-dim)", maxWidth: 560 }}>{heroSub}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 120 }}>
              <div style={{ fontSize: 30, fontWeight: 600, color: readinessPercent >= 100 ? "var(--green)" : "var(--text)" }}>{readinessPercent}%</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>setup complete</div>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${readinessPercent}%`, background: "linear-gradient(90deg, #66D0E0, #4DE8E1)", transition: "width 0.4s ease" }} />
          </div>
          {setup?.slackRecommendedMissing && setupState === "ready" && (
            <div style={{ fontSize: 12.5, color: "var(--blue)" }}>Recommended setup missing: select a Slack channel to post internal operations updates.</div>
          )}
          <div style={{ display: "grid", gap: 0 }}>
            {checklist.map((item, index) => (
              <div key={item.label} style={{ borderTop: index === 0 ? "none" : "1px solid var(--line)" }}>
                <ChecklistRow item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Connected tools</h3></div>
        <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <ToolCard name="Trello" tone="Project / task source" ready={Boolean(setup?.trelloDestinationSet)} headline="Reads project boards and prepares approved task updates." note={setup?.trelloConnected && !setup?.trelloDestinationSet ? "Connected, but no default board/list selected." : undefined} />
          <ToolCard name="Slack" tone="Internal updates" ready={Boolean(setup?.slackAlertsReady)} headline="Posts internal operations updates after approval." note={setup?.slackConnected && !setup?.slackAlertsReady ? "Connected, but no channel selected." : undefined} />
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Monitoring</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>{loading ? "Loading..." : monitoring?.nextScanLabel ?? "Daily scan ready"}{lastCheckAt ? ` · Last check ${relativeTime(lastCheckAt)}` : ""}</div>
          </div>
        </div>
        <div style={{ padding: "18px 20px" }}>
          {!hasRunScan ? (
            <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No operations check has run yet. Run a manual check to test the operator.</div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={submitScan} disabled={!canRun || scanSubmitting} style={{ opacity: !canRun || scanSubmitting ? 0.45 : 1 }}>{scanSubmitting ? "Checking..." : "Run manual check"}</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
              <Stat label="Cards checked" value={String(monitoring?.cardsChecked ?? 0)} />
              <Stat label="Signals found" value={String(monitoring?.signalsFound ?? 0)} />
              <Stat label="Approvals created" value={String(monitoring?.approvalsCreated ?? 0)} />
              <Stat label="Stale / overdue" value={String(monitoring?.staleOverdueCount ?? 0)} />
              <Stat label="Last check" value={lastCheckAt ? relativeTime(lastCheckAt) : "-"} />
            </div>
          )}
          {scanResult && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: scanResult.status === "setup_incomplete" ? "rgba(245,194,107,0.06)" : "rgba(102,208,224,0.06)", boxShadow: scanResult.status === "setup_incomplete" ? "inset 0 0 0 1px rgba(245,194,107,0.2)" : "inset 0 0 0 1px rgba(102,208,224,0.18)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12.8, fontWeight: 600 }}>{scanResult.status === "setup_incomplete" ? "Setup incomplete" : `Manual check ${scanResult.status ?? "completed"}`}</div>
              {scanResult.message && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{scanResult.message}</div>}
              {scanResult.status === "completed" && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{scanResult.cardsChecked ?? 0} cards checked · {scanResult.signalsFound ?? 0} signals · {scanResult.approvalsCreated ?? 0} approvals.</div>}
              {scanResult.suggestions && scanResult.suggestions.length > 0 && (
                <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                  No signals yet. To see it work: {scanResult.suggestions.join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <h3>Latest signals and pending approvals</h3>
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Approval inbox</Link>
        </div>
        <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Pending approvals</div>
            {(monitoring?.recentPendingApprovals?.length ?? 0) === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No pending Operations approvals.</div> : monitoring?.recentPendingApprovals.map((approval) => (
              <div key={approval.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{approval.cardName || approval.title}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--text-mute)" }}>{(approval.signalType || "signal").replace(/_/g, " ")}{approval.severity ? ` · ${approval.severity}` : ""}{approval.listName ? ` · ${approval.listName}` : ""} · {approval.created_at ? relativeTime(approval.created_at) : "unknown time"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>Recent runs</div>
            {runs.length === 0 ? <div style={{ color: "var(--text-mute)", fontSize: 12.5 }}>No Operations checks have run yet.</div> : runs.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Operations run"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div></div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{relativeTime(run.created_at)} · Approval: {run.approval_id || "none"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
