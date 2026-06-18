"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { PlusIcon, ZapIcon, FilterIcon, LinkIcon } from "@/components/dashboard/icons";
import { UsageBanner } from "@/components/upgrade-prompt";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel, isRealConnectedConnector } from "@/lib/os/truth";
import type { Connector } from "@/lib/os/types";

type MissingReqs = { connectorIds: string[]; primaryName: string };
const CONNECTOR_NAME_MAP: Record<string, string> = {
  gmail: "Gmail", outlook: "Outlook", hubspot: "HubSpot",
  salesforce: "Salesforce", slack: "Slack", notion: "Notion",
};

function parseMissingRequirements(currentTask: string): MissingReqs | null {
  if (!currentTask.startsWith("Missing requirements:")) return null;
  const raw = currentTask.replace("Missing requirements:", "").trim();
  const connectorIds = raw.split(",").map((s) => s.trim().split("|")[0].trim()).filter(Boolean);
  const primaryName = CONNECTOR_NAME_MAP[connectorIds[0]] ?? connectorIds[0];
  return { connectorIds, primaryName };
}

// Filter out connector requirements already satisfied by a real connected account.
function filterMissingByConnectedState(parsed: MissingReqs | null, connectors: Connector[]): MissingReqs | null {
  if (!parsed) return null;
  const unsatisfied = parsed.connectorIds.filter(
    (id) => !connectors.some((c) => c.id === id && isRealConnectedConnector(c))
  );
  if (unsatisfied.length === 0) return null;
  return { connectorIds: unsatisfied, primaryName: CONNECTOR_NAME_MAP[unsatisfied[0]] ?? unsatisfied[0] };
}

const TABS = ["All", "Running", "Awaiting", "Paused"];

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

type RevenueRun = {
  id: string;
  operator_key: string;
  status: string;
  output: {
    title?: string;
    type?: string;
    draft?: {
      to?: string;
      subject?: string;
      body?: string;
    };
    approvalId?: string;
  } | null;
  approval_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type RevenueRunResult = {
  run?: {
    id: string;
    status: string;
    approvalId?: string;
  };
  output?: {
    draft?: {
      to: string;
      subject: string;
      body: string;
    };
    approvalId?: string;
  };
  approval?: {
    approvalId?: string;
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

function TagList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(items.length ? items : [empty]).map((item) => (
          <span key={item} className="appr-btn edit" style={{ cursor: "default" }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { state, runAgent, toggleAgentPause } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview" || !entitlements.canRunRealActions;
  const [tab, setTab] = useState("All");
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [revenueReadiness, setRevenueReadiness] = useState<OperatorReadiness | null>(null);
  const [revenueRuns, setRevenueRuns] = useState<RevenueRun[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [runtimeError, setRuntimeError] = useState("");
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RevenueRunResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [context, setContext] = useState("");

  const agents = state.agents;
  const activeOperators = agents.filter((a) => a.status !== "paused").length;
  const atLimit = entitlements.operatorsLimit !== Number.MAX_SAFE_INTEGER && activeOperators >= entitlements.operatorsLimit;

  const filtered = agents.filter((a) => {
    if (tab === "All") return true;
    return a.status === tab.toLowerCase();
  });

  const running = agents.filter((a) => a.status === "running").length;
  const awaiting = agents.filter((a) => a.status === "awaiting").length;
  const totalActions = agents.reduce((sum, a) => sum + a.stats.actionsThisWeek, 0);

  const handleRun = (agentId: string) => {
    setRunningAgentId(agentId);
    runAgent(agentId);
    setTimeout(() => setRunningAgentId(null), 1200);
  };

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

      const [readinessRes, runsRes] = await Promise.all([
        fetch(`/api/operators/readiness?${readinessQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/runs?${runsQs.toString()}`, { cache: "no-store" }),
      ]);
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness; error?: string };
      const runsJson = await runsRes.json().catch(() => ({})) as { runs?: RevenueRun[]; error?: string };
      if (!readinessRes.ok) throw new Error(readinessJson.error || "Could not load Revenue Operator readiness.");
      if (!runsRes.ok) throw new Error(runsJson.error || "Could not load Revenue Operator runs.");
      setRevenueReadiness(readinessJson.readiness ?? null);
      setRevenueRuns(Array.isArray(runsJson.runs) ? runsJson.runs : []);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Could not load Revenue Operator runtime.");
    } finally {
      setRuntimeLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => {
    void loadRevenueRuntime();
  }, [loadRevenueRuntime]);

  const submitRevenueRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRunSubmitting(true);
    setRuntimeError("");
    setRunResult(null);
    try {
      const res = await fetch("/api/operators/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          operatorKey: "revenue",
          input: {
            leadName,
            leadEmail,
            context,
            goal: "follow_up",
          },
        }),
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

  const revenueStatusMessage = (() => {
    if (!revenueReadiness) return "Loading Revenue Operator readiness.";
    if (revenueReadiness.status === "missing_connector") return "Connect Gmail to run Revenue Operator.";
    if (revenueReadiness.status === "draft_only") return "HubSpot missing, Gmail draft and approval mode available.";
    if (revenueReadiness.status === "upgrade_required") return "Upgrade your plan to run Revenue Operator.";
    return revenueReadiness.reason;
  })();

  const canRunRevenue = Boolean(revenueReadiness?.canRunManual && (revenueReadiness.status === "ready" || revenueReadiness.status === "draft_only"));

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Agent layer - {running} running{awaiting > 0 ? `, ${awaiting} awaiting` : ""}</span>
          <h1>Agents</h1>
          <div className="os-page-sub">{agents.length} operators deployed - Inovense OS manages execution.</div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview mode: operators run demo tasks. Real execution requires an active plan.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Advanced filters are coming soon"><FilterIcon size={12} /> Filter</button>
          {atLimit ? (
            <Link
              href="/pricing"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to deploy more
            </Link>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}
            >
              <PlusIcon size={12} /> Deploy agent
            </button>
          )}
        </div>
      </div>

      {entitlements.operatorsLimit !== Number.MAX_SAFE_INTEGER && (
        <UsageBanner used={activeOperators} max={entitlements.operatorsLimit} label="operators" planLabel={getPlanLabel(entitlements.planTier)} />
      )}

      <div className="p" style={{ gap: 0 }}>
        <div className="p-head">
          <div>
            <h3>Revenue Operator</h3>
            <div className="p-meta" style={{ marginTop: 4 }}>
              {runtimeLoading ? "Loading runtime state..." : revenueReadiness ? `${revenueReadiness.status} - ${revenueReadiness.readinessPercent}% ready` : "No readiness data"}
            </div>
          </div>
          <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>View approvals</Link>
        </div>
        <div style={{ padding: "14px 18px", display: "grid", gap: 14 }}>
          {runtimeError && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>
              {runtimeError}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Readiness</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: revenueReadiness?.status === "ready" || revenueReadiness?.status === "draft_only" ? "var(--green)" : "var(--amber)" }}>
                  {revenueReadiness?.status ?? "loading"}
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${revenueReadiness?.readinessPercent ?? 0}%`, background: "linear-gradient(90deg, #4DE8E1, #51D88A)" }} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{revenueStatusMessage}</div>
              <TagList title="Connected required connectors" items={revenueReadiness?.connectedRequiredConnectors ?? []} empty="None" />
              <TagList title="Missing required connectors" items={revenueReadiness?.missingRequiredConnectors ?? []} empty="None" />
              <TagList title="Available actions" items={revenueReadiness?.availableActions ?? []} empty="None" />
              <TagList title="Approval required actions" items={revenueReadiness?.approvalRequiredActions ?? []} empty="None" />
              <TagList title="Blocked actions" items={revenueReadiness?.blockedActions ?? []} empty="None" />
              {revenueReadiness?.nextSetupStep && (
                <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                  <strong style={{ color: "var(--text-dim)" }}>Next step:</strong> {revenueReadiness.nextSetupStep}
                </div>
              )}
            </div>

            <form onSubmit={submitRevenueRun} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Run Revenue Operator</div>
                <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-mute)" }}>Creates a follow-up draft and approval. It does not send email directly.</div>
              </div>
              <input className="os-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" required />
              <input className="os-input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Lead email" type="email" required />
              <textarea className="os-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context for the follow-up" rows={5} required />
              <input className="os-input" value="follow_up" disabled aria-disabled="true" />
              {!canRunRevenue && (
                <div style={{ fontSize: 12, color: "var(--amber)" }}>{revenueStatusMessage}</div>
              )}
              <button className="btn btn-primary btn-sm" type="submit" disabled={!canRunRevenue || runSubmitting} style={{ opacity: !canRunRevenue || runSubmitting ? 0.45 : 1 }}>
                {runSubmitting ? "Preparing..." : "Prepare follow-up approval"}
              </button>
            </form>
          </div>

          {runResult?.run && (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)", display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Run created</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Run: {runResult.run.id} - Status: {runResult.run.status}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>Approval: {runResult.output?.approvalId || runResult.approval?.approvalId || runResult.run.approvalId}</div>
              {runResult.output?.draft && (
                <div style={{ padding: "9px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}><strong style={{ color: "var(--text)" }}>To:</strong> {runResult.output.draft.to}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}><strong style={{ color: "var(--text)" }}>Subject:</strong> {runResult.output.draft.subject}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}><strong style={{ color: "var(--text)" }}>Body:</strong> {runResult.output.draft.body}</div>
                </div>
              )}
              <Link href="/app/approvals" className="btn btn-ghost btn-sm" style={{ width: "fit-content", textDecoration: "none" }}>View approval</Link>
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent Revenue runs</div>
            {revenueRuns.length === 0 ? (
              <div style={{ padding: "18px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--text-mute)", fontSize: 12.5 }}>
                No real Revenue Operator runs yet.
              </div>
            ) : revenueRuns.slice(0, 5).map((run) => (
              <div key={run.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 12.8, fontWeight: 500 }}>{run.output?.title || run.output?.type || "Revenue follow-up"}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--rose)" : "var(--amber)" }}>{run.status}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>
                  {relativeTime(run.created_at)} - Approval: {run.approval_id || "none"} - Run: {run.id}
                </div>
                {run.error && <div style={{ fontSize: 11.5, color: "var(--rose)" }}>{run.error}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total deployed", val: String(agents.length), sub: `${running} active` },
          { label: "Running", val: String(running), sub: "across all operators" },
          { label: "Actions this week", val: totalActions.toLocaleString(), sub: "combined output" },
          { label: "Awaiting approval", val: String(awaiting), sub: awaiting > 0 ? "requires review" : "all clear" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`appr-btn${tab === t ? " approve" : " edit"}`}
            style={{ fontSize: 11.5, padding: "5px 12px" }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {filtered.map((a) => (
          <div className="p" key={a.id} style={{ gap: 0 }}>
            <div className="p-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div
                  className="ops-card-avatar"
                  style={{ color: a.color, background: `linear-gradient(135deg, ${a.color}22, ${a.color}06)`, boxShadow: `inset 0 0 0 1px ${a.color}55`, flexShrink: 0 }}
                >{a.mark}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>
                    {a.config.tools.slice(0, 3).join(" - ")}
                  </div>
                </div>
              </div>
              {(() => {
                const missing = filterMissingByConnectedState(parseMissingRequirements(a.currentTask), state.connectors);
                if (missing) {
                  return (
                    <div className="ops-card-status">
                      <span className="dot" style={{ background: "var(--amber)" }} />
                      <span style={{ color: "var(--amber)" }}>Setup required</span>
                    </div>
                  );
                }
                return (
                  <div className="ops-card-status">
                    {a.status === "running" && <><span className="dot pulsing" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} /><span style={{ color: a.color }}>Running</span></>}
                    {a.status === "awaiting" && <><span className="dot dot-amber pulsing" /><span style={{ color: "var(--amber)" }}>Awaiting</span></>}
                    {a.status === "paused" && <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ color: "var(--text-mute)" }}>Paused</span></>}
                    {a.status === "idle" && <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ color: "var(--text-mute)" }}>Idle</span></>}
                  </div>
                );
              })()}
            </div>
            {(() => {
              const missing = filterMissingByConnectedState(parseMissingRequirements(a.currentTask), state.connectors);
              if (missing) {
                return (
                  <div style={{ padding: "12px 14px", display: "grid", gap: 12 }}>
                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,194,107,0.06)", boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.2)" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                        Setup required: Connect {missing.primaryName} to run this operator.
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                        {missing.connectorIds.length > 1
                          ? `Also requires: ${missing.connectorIds.slice(1).join(", ")}`
                          : "Connect a real account to enable live operator execution."}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Actions/wk", val: "0" },
                        { label: "Total runs", val: "0" },
                        { label: "Deployed", val: relativeTime(a.deployedAt) },
                      ].map((s) => (
                        <div key={s.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link href="/app/connectors" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                        <LinkIcon size={12} /> Connect {missing.primaryName}
                      </Link>
                      <Link href="/app/connectors" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                        View requirements
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
                <div style={{ padding: "12px 14px" }}>
                  <div className="ops-task" style={{ marginBottom: 12 }}>
                    <ZapIcon size={12} style={{ color: a.color, flexShrink: 0 }} />
                    <span>{a.currentTask}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "This week", val: `${a.stats.metricValue} ${a.stats.metricLabel}` },
                      { label: "Total runs", val: a.stats.totalRuns.toLocaleString() },
                      { label: "Deployed", val: relativeTime(a.deployedAt) },
                    ].map((s) => (
                      <div key={s.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      className="appr-btn edit"
                      onClick={() => toggleAgentPause(a.id)}
                      disabled={a.status === "awaiting"}
                      style={{ opacity: a.status === "awaiting" ? 0.4 : 1 }}
                    >
                      {a.status === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="appr-btn edit"
                      onClick={() => handleRun(a.id)}
                      disabled={runningAgentId === a.id || a.status === "paused"}
                      style={{ opacity: (runningAgentId === a.id || a.status === "paused") ? 0.4 : 1 }}
                    >
                      {runningAgentId === a.id ? "Running..." : isPreview ? "Run demo" : "Run live"}
                    </button>
                    <button
                      className="appr-btn approve"
                      onClick={() => {
                        const run = state.agentRuns.find((r) => r.agentId === a.id);
                        if (run) setSelectedRunId(run.id);
                      }}
                    >
                      View output
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-mute)", fontSize: 13 }}>
          No {tab.toLowerCase()} operators.
        </div>
      )}

      {selectedRunId && (() => {
        const run = state.agentRuns.find((r) => r.id === selectedRunId);
        if (!run) return null;
        const runLogs = state.logs.filter((l) => l.runId === run.id).slice(0, 20);
        return (
          <div className="os-modal-backdrop" onClick={() => setSelectedRunId(null)}>
            <div className="os-modal" style={{ width: "min(900px, 94vw)", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
              <div className="os-modal-head">
                <h3>{run.agentName} run - {run.id.slice(-6)}</h3>
                <button className="appr-btn deny" onClick={() => setSelectedRunId(null)}>Close</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Plan steps</div>
                  {run.steps.map((s, idx) => (
                    <div key={`${s.id ?? idx}-${s.name}`} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 12.8, fontWeight: 500 }}>{idx + 1}. {s.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: s.state === "done" ? "var(--green)" : s.state === "failed" ? "var(--rose)" : s.state === "active" ? "var(--cyan)" : "var(--text-mute)" }}>{s.state}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 3 }}>{s.sub}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                        {s.tool && <span style={{ color: "var(--text-faint)" }}>{s.tool}</span>}
                        {s.riskLevel && <span style={{ color: "var(--text-faint)" }}>risk: {s.riskLevel}</span>}
                      </div>
                      {s.output && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--text-dim)" }}>{s.output}</div>}
                      {s.blockedReason && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--rose)" }}>{s.blockedReason}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Execution logs</div>
                  {runLogs.map((l) => (
                    <div key={l.id} style={{ padding: "9px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)" }}>{l.ts} - {l.event}</div>
                      <div style={{ fontSize: 11.8, color: "var(--text-dim)", marginTop: 3 }}>{l.message}</div>
                    </div>
                  ))}
                  {run.output && (
                    <div style={{ marginTop: 6, padding: "10px 12px", borderRadius: 8, background: "rgba(77,232,225,0.07)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: "var(--text)" }}>{run.output.title}</div>
                      <div style={{ fontSize: 11.8, color: "var(--text-dim)", marginTop: 3 }}>{run.output.summary}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
