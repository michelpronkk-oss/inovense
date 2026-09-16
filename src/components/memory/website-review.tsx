"use client";

import { useEffect, useState } from "react";
import type { WebsiteObservationSummary, WebsiteSourceSummary } from "@/lib/connectors/website-types";

type WebsiteReviewProps = { workspaceId: string; canManage: boolean };

function statusTone(value: string): string {
  if (value === "verified" || value === "confirmed_owner" || value === "kept_observed") return "green";
  if (value === "conflict" || value === "stale" || value === "withdrawn") return "amber";
  return "cyan";
}

export function WebsiteMemoryReview({ workspaceId, canManage }: WebsiteReviewProps) {
  const [source, setSource] = useState<WebsiteSourceSummary | null>(null);
  const [observations, setObservations] = useState<WebsiteObservationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const query = `?workspaceId=${encodeURIComponent(workspaceId)}`;
      const [settingsResponse, observationsResponse] = await Promise.all([
        fetch(`/api/connectors/website/settings${query}`, { cache: "no-store" }),
        fetch(`/api/connectors/website/observations${query}`, { cache: "no-store" }),
      ]);
      const settings = await settingsResponse.json().catch(() => ({} as { error?: string; source?: WebsiteSourceSummary | null }));
      const review = await observationsResponse.json().catch(() => ({} as { error?: string; observations?: WebsiteObservationSummary[] }));
      if (!settingsResponse.ok) throw new Error(settings.error || "Website context status is unavailable.");
      if (!observationsResponse.ok) throw new Error(review.error || "Website review items are unavailable.");
      setSource(settings.source ?? null); setObservations(review.observations ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Website review is unavailable."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  // The loader is intentionally scoped to the workspace; its identity is not a fetch key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const act = async (observation: WebsiteObservationSummary, action: "confirm" | "keep_observed" | "edit_confirm" | "dismiss") => {
    let editedValue: string | undefined;
    if (action === "edit_confirm") {
      editedValue = window.prompt("Edit the value that should become owner-confirmed Memory", observation.observationValue) ?? undefined;
      if (!editedValue?.trim()) return;
    }
    setBusyId(observation.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/connectors/website/observations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, observationId: observation.id, action, editedValue }) });
      const json = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) throw new Error(json.error || "Website review action could not be saved.");
      setNotice(action === "confirm" || action === "edit_confirm" ? "Owner-confirmed context saved. It now outranks future website observations." : action === "keep_observed" ? "Observation kept as untrusted observed context." : "Observation dismissed from review.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Website review action could not be saved."); }
    finally { setBusyId(null); }
  };

  if (loading) return <section className="sec panel card-pad" aria-label="Website Memory review"><div className="card-head"><div><h3 className="t-section">Website observations</h3><p className="t-meta">Loading governed website context…</p></div></div></section>;
  if (!source && observations.length === 0) return null;

  const pending = observations.filter((item) => item.reviewStatus === "pending");
  return (
    <section className="sec panel card-pad" aria-label="Website Memory review">
      <div className="card-head" style={{ alignItems: "flex-start" }}>
        <div><h3 className="t-section">Website observations</h3><p className="t-meta">Public website evidence stays observed and untrusted until an owner confirms it.</p></div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}><span className={`badge ${source?.verificationStatus === "verified" ? "green" : "amber"}`}>{source?.verificationStatus ?? "not configured"}</span><span className="badge cyan">{pending.length} pending</span></div>
      </div>
      {source && <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, margin: "14px 0", color: "var(--text-mute)", fontSize: 11.5 }}><div>Source<strong style={{ display: "block", color: "var(--text-dim)", marginTop: 3 }}>{source.hostname}</strong></div><div>Pages checked<strong style={{ display: "block", color: "var(--text-dim)", marginTop: 3 }}>{source.pagesChecked} / {source.maxPages}</strong></div><div>Freshness<strong style={{ display: "block", color: "var(--text-dim)", marginTop: 3 }}>{source.lastSuccessfulSyncAt ? new Date(source.lastSuccessfulSyncAt).toLocaleString() : "Not synced"}</strong></div><div>Conflicts<strong style={{ display: "block", color: source.conflictsPending ? "var(--amber)" : "var(--text-dim)", marginTop: 3 }}>{source.conflictsPending}</strong></div></div>}
      <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(77,232,225,0.045)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.15)", color: "var(--text-mute)", fontSize: 11.5, lineHeight: 1.5, marginBottom: 12 }}>Governance: website text cannot execute, publish, change provider records, or replace owner-confirmed Memory. Evidence URL, excerpt, source hash, freshness, and review history remain attached.</div>
      {observations.length > 0 ? <div className="rows">{observations.slice(0, 30).map((observation) => <div className="row" key={observation.id} style={{ alignItems: "flex-start", gap: 12 }}><div className="grow" style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><span className="ttl">{observation.observationValue}</span><span className={`badge ${statusTone(observation.reviewStatus)}`}>{observation.reviewStatus.replace(/_/g, " ")}</span><span className={`badge ${statusTone(observation.freshnessStatus)}`}>{observation.freshnessStatus}</span>{observation.conflictStatus === "conflict" && <span className="badge amber">Conflict</span>}</div><div className="sub" style={{ marginTop: 5 }}>{observation.observationType.replace(/_/g, " ")} · <a href={observation.canonicalSourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>{observation.canonicalSourceUrl}</a></div><div style={{ marginTop: 7, color: "var(--text-mute)", fontSize: 11.5, lineHeight: 1.45 }}>“{observation.evidenceExcerpt}”</div></div>{canManage && observation.reviewStatus === "pending" && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}><button type="button" className="btn btn-primary btn-sm" disabled={busyId === observation.id} onClick={() => void act(observation, "confirm")}>Confirm</button><button type="button" className="btn btn-ghost btn-sm" disabled={busyId === observation.id} onClick={() => void act(observation, "edit_confirm")}>Edit + confirm</button><button type="button" className="btn btn-ghost btn-sm" disabled={busyId === observation.id} onClick={() => void act(observation, "keep_observed")}>Keep observed</button><button type="button" className="btn btn-ghost btn-sm" disabled={busyId === observation.id} onClick={() => void act(observation, "dismiss")}>Dismiss</button></div>}</div>)}</div> : <div className="row"><span className="grow t-meta">No website observations yet. Verify the source and run a sync from Connectors.</span></div>}
      {notice && <p className="memory-action-notice" role="status">{notice}</p>}
      {error && <p className="memory-attention-note" role="alert"><span className="dot" data-tone="amber" /> {error}</p>}
    </section>
  );
}
