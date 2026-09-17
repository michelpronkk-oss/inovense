"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/product-ui/page-primitives";
import { useOS } from "@/lib/os/app-provider";

type GrowthState = {
  runs: Array<{ id: string; status: string; dispatch_status?: string; created_at: string; completed_at?: string | null; dispatch_error?: string | null; output?: { opportunitiesCreated?: number } }>;
  opportunities: Array<{ id: string; title: string; summary: string; trust_level: string; freshness_status: string; score: number; status: string; source_type: string }>;
  campaigns: Array<{ id: string; opportunity_id: string; objective: string; status: string }>;
  approvals: Array<{ id: string; title: string; status: string }>;
  outcomes: Array<{ id: string; campaign_id: string; channel: string; outcome_type: string; attribution_level: string }>;
  learnings: Array<{ id: string; statement: string; trust_level: string; approval_status: string }>;
  activation?: { activated: boolean; attentionRequired?: boolean; lastScanAt?: string | null; nextEligibleScanAt?: string | null; lastSuccessfulCompletion?: string | null; lastError?: string | null } | null;
};

export default function GrowthOperatorPage() {
  const { state } = useOS();
  const [data, setData] = useState<GrowthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const identity = useMemo(() => ({ workspaceId: state.workspace.id }), [state.workspace.id]);

  const load = useCallback(async () => {
    if (!identity.workspaceId) return;
    const qs = new URLSearchParams(identity);
    const response = await fetch(`/api/operators/growth/status?${qs.toString()}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({})) as GrowthState & { error?: string };
    if (!response.ok) throw new Error(json.error || "Could not load Growth state.");
    setData(json);
  }, [identity]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load Growth state.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const latest = data?.runs[0];
    const active = latest && ["pending", "running"].includes(latest.status) && !["completed", "failed", "cancelled", "superseded"].includes(latest.dispatch_status ?? "");
    if (!active) return;
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 5_000);
    return () => window.clearInterval(timer);
  }, [data?.runs, load]);

  const scan = async () => {
    if (busy) return;
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

  const latestRun = data?.runs[0];
  const fresh = data?.opportunities.filter((item) => item.freshness_status === "fresh") ?? [];
  return (
    <div className="os-page">
      <PageHeader eyebrow="Growth Operator" title="Signals into governed campaigns" description="Detect fresh business evidence, prepare reviewable drafts, and learn from attributed outcomes. External publishing is intentionally export-only." actions={<button className="btn btn-primary btn-sm" type="button" onClick={() => void scan()} disabled={busy}>{busy ? "Working…" : "Run scan"}</button>} />
      {message && <div role="status" style={{ marginBottom: 14, color: "#9ef5df" }}>{message}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, color: "#ffaaaa" }}>{error}</div>}
      <section className="os-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="t-eyebrow">Control loop</div>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>Detect → Research → Prepare → Approve → Export → Measure → Learn. Website text is observed evidence only; it cannot change policy, execute tools, or become trusted Memory automatically.</p>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>Monitoring: {data?.activation?.activated ? "active" : "inactive"}{data?.activation?.attentionRequired ? " · attention required" : ""} · Latest run: {latestRun ? `${latestRun.status} / ${latestRun.dispatch_status ?? "requested"} · ${new Date(latestRun.created_at).toLocaleString()}` : "No scan yet"} · Pending approvals: {data?.approvals.filter((item) => item.status === "pending").length ?? 0}</p>
        {data?.activation?.lastError && <p role="status" style={{ margin: "8px 0 0", color: "#ffcf9a", fontSize: 12 }}>Last run needs attention: {data.activation.lastError}</p>}
      </section>
      <section>
        <div className="ag-sec-head"><h2>Fresh opportunities</h2><span className="count">{fresh.length}</span><span className="rule" /></div>
        {fresh.length === 0 ? <div className="os-card" style={{ padding: 20, color: "var(--muted)" }}>Run a scan after Website Knowledge has produced fresh observations.</div> : <div style={{ display: "grid", gap: 12 }}>{fresh.map((item) => <article className="os-card" key={item.id} style={{ padding: 18 }}><div className="t-eyebrow">{item.source_type} · {item.trust_level} · score {item.score.toFixed(2)}</div><h3 style={{ margin: "8px 0" }}>{item.title}</h3><p style={{ color: "var(--muted)", lineHeight: 1.5 }}>{item.summary}</p><button className="btn btn-ghost btn-sm" type="button" onClick={() => void prepare(item.id)} disabled={busy || data?.campaigns.some((campaign) => campaign.opportunity_id === item.id && campaign.status !== "cancelled")}>Prepare campaign</button></article>)}</div>}
      </section>
      <section style={{ marginTop: 24 }}><div className="ag-sec-head"><h2>Learning ledger</h2><span className="count">Derived only</span><span className="rule" /></div><div className="os-card" style={{ padding: 18, color: "var(--muted)" }}>{data?.learnings.length ? data.learnings.slice(0, 5).map((item) => <p key={item.id} style={{ margin: "0 0 8px" }}>{item.statement} <small>({item.trust_level}, {item.approval_status})</small></p>) : "No outcome-derived learning has been recorded."}</div></section>
    </div>
  );
}
