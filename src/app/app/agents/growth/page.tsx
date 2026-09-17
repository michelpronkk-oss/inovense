"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import { OperatorActivationToggle, type ActivationEligibility } from "@/components/operators/activation-toggle";
import { OperatorWorkforceBriefing, type OperatorBriefingState } from "@/components/operators/workforce-briefing";
import { OperatorRuntimeAvatar } from "@/components/operators/runtime-avatar";
import { dispatchStateLabel, isActiveDispatchState } from "@/lib/operators/run-state-labels";

type GrowthRun = { id: string; status: string; dispatch_status?: string; created_at: string; completed_at?: string | null; dispatch_error?: string | null; output?: { opportunitiesCreated?: number; opportunitiesRefreshed?: number } };
type GrowthOpportunity = { id: string; title: string; summary: string; trust_level: string; freshness_status: string; score: number; status: string; source_type: string };
type GrowthCampaign = { id: string; opportunity_id: string; objective: string; status: string };
type GrowthApproval = { id: string; title: string; status: string };
type GrowthOutcome = { id: string; campaign_id: string; channel: string; outcome_type: string; attribution_level: string };
type GrowthLearning = { id: string; statement: string; trust_level: string; approval_status: string };
type GrowthActivation = { activated: boolean; attentionRequired?: boolean; lastScanAt?: string | null; nextEligibleScanAt?: string | null; lastSuccessfulCompletion?: string | null; lastError?: string | null } | null;

type GrowthState = {
  runs: GrowthRun[];
  opportunities: GrowthOpportunity[];
  campaigns: GrowthCampaign[];
  approvals: GrowthApproval[];
  outcomes: GrowthOutcome[];
  learnings: GrowthLearning[];
  activation?: GrowthActivation;
};

type OperatorReadiness = {
  operatorKey: string;
  status: string;
  canRunManual: boolean;
  executionEligibility?: ActivationEligibility;
};

type WebsiteSourceSummary = {
  verificationStatus: "pending" | "verified" | "failed" | "expired";
  healthStatus: string;
  lastSuccessfulSyncAt: string | null;
  nextSyncAt: string | null;
  observationsPending: number;
} | null;

function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "Not yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortTimeAgo(iso: string | null | undefined): string {
  if (!iso) return "Not yet";
  const elapsed = Math.max(0, Date.now() - Date.parse(iso));
  if (!Number.isFinite(elapsed)) return "Not yet";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} days ago`;
}

function websiteKnowledgeLabel(source: WebsiteSourceSummary): string {
  if (!source) return "Not configured";
  if (source.verificationStatus !== "verified") return "Not verified";
  return `Verified · last synced ${shortTimeAgo(source.lastSuccessfulSyncAt)}`;
}

export default function GrowthOperatorPage() {
  const { state } = useOS();
  const [data, setData] = useState<GrowthState | null>(null);
  const [readiness, setReadiness] = useState<OperatorReadiness | null>(null);
  const [website, setWebsite] = useState<WebsiteSourceSummary>(null);
  const [product, setProduct] = useState<OperatorBriefingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const identity = useMemo(() => ({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const load = useCallback(async (background = false) => {
    if (!identity.workspaceId) return;
    if (!background) { setLoading(true); setError(""); }
    try {
      const statusQs = new URLSearchParams({ workspaceId: identity.workspaceId });
      const readinessQs = new URLSearchParams({ ...identity, operatorKey: "growth" });
      const websiteQs = new URLSearchParams({ workspaceId: identity.workspaceId });
      const [statusRes, readinessRes, websiteRes] = await Promise.all([
        fetch(`/api/operators/growth/status?${statusQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/operators/readiness?${readinessQs.toString()}`, { cache: "no-store" }),
        fetch(`/api/connectors/website/settings?${websiteQs.toString()}`, { cache: "no-store" }),
      ]);
      const statusJson = await statusRes.json().catch(() => ({})) as GrowthState & { error?: string };
      if (!statusRes.ok) throw new Error(statusJson.error || "Could not load Growth state.");
      const readinessJson = await readinessRes.json().catch(() => ({})) as { readiness?: OperatorReadiness; error?: string };
      const websiteJson = await websiteRes.json().catch(() => ({})) as { source?: WebsiteSourceSummary };
      setData(statusJson);
      if (readinessRes.ok) setReadiness(readinessJson.readiness ?? null);
      setWebsite(websiteJson.source ?? null);
    } catch (err) {
      if (!background) setError(err instanceof Error ? err.message : "Could not load Growth state.");
    } finally {
      if (!background) setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const latestRun = data?.runs[0];
  const hasActiveRun = Boolean(latestRun && isActiveDispatchState(latestRun.dispatch_status, latestRun.status));

  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(() => { void load(true); }, 5_000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, load]);

  const scan = async () => {
    if (busy || hasActiveRun) return;
    setBusy(true); setError(""); setMessage("Starting governed scan…");
    try {
      const response = await fetch("/api/operators/growth/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity) });
      const json = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(json.error || "Growth scan could not be queued.");
      setMessage(json.message || "Growth scan queued. Refreshing status shortly.");
      window.setTimeout(() => { void load(); }, 900);
    } catch (err) { setError(err instanceof Error ? err.message : "Growth scan could not be queued."); setMessage(""); }
    finally { setBusy(false); }
  };

  const prepare = async (opportunityId: string) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage("Preparing reviewable channel drafts…");
    try {
      const response = await fetch("/api/operators/growth/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...identity, opportunityId, objective: "Validate this observed opportunity with a small owner-reviewed campaign." }) });
      const json = await response.json().catch(() => ({})) as { error?: string; status?: string };
      if (!response.ok) throw new Error(json.error || "Campaign could not be prepared.");
      setMessage(json.status === "pending_approval" ? "Campaign prepared and waiting in Approvals. Nothing was published." : "Campaign already prepared.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Campaign could not be prepared."); setMessage(""); }
    finally { setBusy(false); }
  };

  const fresh = data?.opportunities.filter((item) => item.freshness_status === "fresh") ?? [];
  const pendingApprovals = data?.approvals.filter((item) => item.status === "pending") ?? [];
  const preparedCampaigns = data?.campaigns.filter((item) => item.status !== "cancelled") ?? [];
  const canManage = state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin";
  const active = product?.lifecycle === "active";
  const readyToActivate = product?.lifecycle === "ready_to_activate" || product?.lifecycle === "paused";
  const eligibility = readiness?.executionEligibility;
  const configured = Boolean(readiness?.canRunManual);

  return (
    <div className="os-page operator-detail-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div className="inline" style={{ gap: 16, alignItems: "flex-start" }}>
          <OperatorRuntimeAvatar operatorKey="growth" />
          <div>
            <div className="inline" style={{ gap: 11 }}>
              <h1 className="t-title" style={{ fontSize: 24 }}>Growth Operator</h1>
              {product && <span className="os-status" data-state={product.state}>{product.label}</span>}
            </div>
            <p className="t-sub" style={{ marginTop: 7 }}>Detects governed growth signals, prepares reviewable campaign drafts, and learns from attributed outcomes. External publishing is export-only.</p>
          </div>
        </div>
      </div>

      {error && <section className="attn crit"><div className="card-pad" style={{ padding: "10px 14px", fontSize: 12.5 }}>{error}</div></section>}

      <OperatorWorkforceBriefing
        operatorKey="growth"
        onStateChange={setProduct}
        runtime={{
          pendingApprovals: pendingApprovals.length,
          monitoringLabel: data?.activation?.activated ? "Active · shared 15-minute reconciliation" : "Inactive",
          nextCheckLabel: dateTimeLabel(data?.activation?.nextEligibleScanAt ?? website?.nextSyncAt),
        }}
      />

      {loading && !data && (
        <div className="sec"><div className="card card-pad t-meta">Loading Growth runtime…</div></div>
      )}

      {/* Inactive: the activation prompt is the primary surface. Growth must
          never render as if it is monitoring before the server confirms
          activation, and Run scan must not appear as the primary action here. */}
      {!loading && readyToActivate && (
        <div className="sec">
          <div className="card">
            <div className="card-pad" style={{ display: "grid", gap: 14 }}>
              <div>
                <div className="t-section">Activate Growth Operator</div>
                <p className="t-compact" style={{ marginTop: 6, maxWidth: 560 }}>Growth will monitor verified business evidence, detect opportunities and prepare approval-first campaign drafts.</p>
              </div>
              {eligibility && identity.workspaceId && (
                <OperatorActivationToggle
                  operatorKey="growth"
                  workspaceId={identity.workspaceId}
                  userId={identity.userId}
                  userEmail={identity.userEmail}
                  executionEligibility={eligibility}
                  configured={configured}
                  canManage={canManage}
                  runtimeControl
                />
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && active && (
        <>
          <div className="sec">
            <div className="grid4">
              <MetricCard label="Monitoring" value={data?.activation?.activated ? "Active" : "Inactive"} tone={data?.activation?.activated ? "normal" : "attention"} sub="Shared 15-minute reconciliation" />
              <MetricCard label="Website Knowledge" value={websiteKnowledgeLabel(website)} tone={website?.verificationStatus === "verified" ? "normal" : "attention"} />
              <MetricCard label="Last successful scan" value={shortTimeAgo(data?.activation?.lastSuccessfulCompletion)} sub={dateTimeLabel(data?.activation?.lastSuccessfulCompletion)} />
              <MetricCard label="Next reconciliation" value={dateTimeLabel(data?.activation?.nextEligibleScanAt ?? website?.nextSyncAt)} />
              <MetricCard label="Opportunities" value={String(fresh.length)} sub={`${pendingApprovals.length} approval${pendingApprovals.length === 1 ? "" : "s"} waiting`} tone={pendingApprovals.length > 0 ? "attention" : "normal"} />
            </div>
          </div>

          <div className="sec split">
            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <div className="t-section">Fresh opportunities</div>
                  <div className="inline">
                    {pendingApprovals.length > 0 && <Link href="/app/approvals" className="btn btn-primary btn-sm">{pendingApprovals.length} awaiting review</Link>}
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => void scan()} disabled={busy || hasActiveRun}>{hasActiveRun ? `${dispatchStateLabel(latestRun?.dispatch_status, latestRun?.status)}…` : busy ? "Working…" : "Run scan now"}</button>
                  </div>
                </div>
                {message && <div role="status" className="card-pad t-compact" style={{ borderBottom: "1px solid var(--line)", color: "#9ef5df" }}>{message}</div>}
                {fresh.length === 0 ? (
                  <div className="card-pad" style={{ display: "grid", gap: 6 }}>
                    <div className="t-object" style={{ fontSize: 13 }}>Monitoring for growth opportunities</div>
                    <p className="t-compact" style={{ margin: 0 }}>Growth is active. New verified Website Knowledge and approved business context will be evaluated automatically.</p>
                    <p className="t-meta" style={{ margin: "4px 0 0" }}>Website Knowledge: {websiteKnowledgeLabel(website)} · Last scan: {shortTimeAgo(data?.activation?.lastSuccessfulCompletion)} · Next reconciliation: {dateTimeLabel(data?.activation?.nextEligibleScanAt ?? website?.nextSyncAt)}</p>
                  </div>
                ) : (
                  <div className="rows">
                    {fresh.map((item) => (
                      <div className="row" key={item.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                        <span className="grow" style={{ minWidth: 220 }}>
                          <span className="t-meta">{item.source_type} · {item.trust_level} · score {item.score.toFixed(2)}</span>
                          <span className="ttl" style={{ display: "block", marginTop: 3 }}>{item.title}</span>
                          <span className="sub">{item.summary}</span>
                        </span>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => void prepare(item.id)} disabled={busy || preparedCampaigns.some((campaign) => campaign.opportunity_id === item.id)}>
                          {preparedCampaigns.some((campaign) => campaign.opportunity_id === item.id) ? "Campaign prepared" : "Prepare campaign"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head"><div className="t-section">Prepared campaigns</div><Link href="/app/approvals" className="btn btn-sm btn-ghost">Approval inbox</Link></div>
                {preparedCampaigns.length === 0 ? (
                  <div className="card-pad t-meta">No campaigns prepared yet. Preparing a fresh opportunity creates an approval-gated draft here.</div>
                ) : (
                  <div className="rows">
                    {preparedCampaigns.map((campaign) => (
                      <div className="row" key={campaign.id}>
                        <span className="grow"><span className="ttl">{campaign.objective}</span></span>
                        <span className={`badge ${campaign.status === "pending_approval" ? "amber" : campaign.status === "approved" ? "cyan" : ""}`}>{campaign.status.replace(/_/g, " ").toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head"><div className="t-section">Recent activity</div></div>
                {(data?.runs.length ?? 0) === 0 ? (
                  <div className="card-pad t-meta">No scans have run yet.</div>
                ) : (
                  <div className="rows">
                    {data!.runs.slice(0, 8).map((run) => (
                      <div className="row" key={run.id}>
                        <span className="grow">
                          <span className="ttl">{dispatchStateLabel(run.dispatch_status, run.status)}</span>
                          <span className="sub">{dateTimeLabel(run.created_at)}{run.output?.opportunitiesCreated ? ` · ${run.output.opportunitiesCreated} new opportunit${run.output.opportunitiesCreated === 1 ? "y" : "ies"}` : ""}</span>
                        </span>
                        {run.dispatch_error && <span className="badge amber">ATTENTION</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head"><div className="t-section">Control loop</div></div>
                <div className="card-pad t-compact" style={{ lineHeight: 1.6 }}>Detect → Research → Prepare → Approve → Export → Measure → Learn. Website text is observed evidence only; it cannot change policy, execute tools, or become trusted Memory automatically.</div>
              </div>

              <div className="card">
                <div className="card-head"><div className="t-section">Policy</div></div>
                <div className="rows">
                  <div className="row"><span className="grow t-compact">Campaign export / publish</span><span className="badge amber">APPROVAL</span></div>
                  <div className="row"><span className="grow t-compact">Website changes</span><span className="badge">BLOCKED</span></div>
                  <div className="row"><span className="grow t-compact">Human review</span><span className="badge">REQUIRED</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="t-section">Context & controls</div></div>
                <div className="card-pad">
                  {eligibility && identity.workspaceId && (
                    <OperatorActivationToggle
                      operatorKey="growth"
                      workspaceId={identity.workspaceId}
                      userId={identity.userId}
                      userEmail={identity.userEmail}
                      executionEligibility={eligibility}
                      configured={configured}
                      canManage={canManage}
                      runtimeControl
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {(data?.learnings.length ?? 0) > 0 && (
            <div className="sec">
              <div className="card">
                <div className="card-head"><div className="t-section">Learning ledger</div><span className="t-meta">Derived only</span></div>
                <div className="rows">
                  {data!.learnings.slice(0, 5).map((item) => (
                    <div className="row" key={item.id}>
                      <span className="grow t-compact">{item.statement}</span>
                      <span className="t-meta">{item.trust_level} · {item.approval_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, tone = "normal" }: { label: string; value: string; sub?: string; tone?: "normal" | "attention" }) {
  return (
    <div className="panel" style={{ padding: "12px 13px" }}>
      <div className="t-eyebrow">{label}</div>
      <div className="t-object" style={{ marginTop: 6, color: tone === "attention" ? "var(--amber)" : undefined }}>{value}</div>
      {sub && <div className="t-meta" style={{ marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
