"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebsiteSourceSummary, WebsiteVerificationMethod } from "@/lib/connectors/website-types";

type Challenge = {
  challengeId: string;
  method: WebsiteVerificationMethod;
  token: string;
  dnsRecord: string;
  htmlMeta: string;
  htmlFilePath: string;
  expiresAt: string;
};

type WebsiteSetupProps = {
  workspaceId: string;
  canManage: boolean;
  compact?: boolean;
  onStatus?: (message: string) => void;
};

function splitLines(value: string): string[] {
  return Array.from(new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Not yet";
}

export function WebsiteSetupPanel({ workspaceId, canManage, compact = false, onStatus }: WebsiteSetupProps) {
  const [source, setSource] = useState<WebsiteSourceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [allowedSubdomains, setAllowedSubdomains] = useState("");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");
  const [maxPages, setMaxPages] = useState("50");
  const [cadence, setCadence] = useState<"manual" | "daily" | "weekly" | "monthly">("weekly");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [method, setMethod] = useState<WebsiteVerificationMethod>("dns_txt");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [token, setToken] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/connectors/website/settings?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({} as { error?: string; source?: WebsiteSourceSummary | null }));
      if (!response.ok) throw new Error(json.error || "Website settings could not be loaded.");
      const next = json.source ?? null;
      setSource(next);
      if (next) {
        setOrigin(next.canonicalOrigin);
        setAllowedSubdomains(next.allowedSubdomains.join("\n"));
        setIncludePaths(next.includePaths.join("\n"));
        setExcludePaths(next.excludePaths.join("\n"));
        setMaxPages(String(next.maxPages));
        setCadence(next.cadence);
        setSyncEnabled(next.syncEnabled);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  // The loader is intentionally scoped to the workspace; its identity is not a fetch key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/connectors/website/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, action: "configure", origin, allowedSubdomains: splitLines(allowedSubdomains), includePaths: splitLines(includePaths), excludePaths: splitLines(excludePaths), maxPages: Number(maxPages), cadence, syncEnabled }),
      });
      const json = await response.json().catch(() => ({} as { error?: string; source?: WebsiteSourceSummary }));
      if (!response.ok || !json.source) throw new Error(json.error || "Website configuration could not be saved.");
      setSource(json.source);
      onStatus?.("Website configuration saved. Verify the domain before synchronizing it.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website configuration could not be saved.");
    } finally { setSaving(false); }
  };

  const issueChallenge = async () => {
    if (!source) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/connectors/website/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action: "challenge", sourceId: source.id, method }) });
      const json = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) throw new Error(json.error || "Verification challenge could not be created.");
      setChallenge(json as Challenge); setToken(json.token ?? "");
      onStatus?.("Verification instructions are ready. Add the token, then verify the domain.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Verification challenge could not be created."); }
    finally { setWorking(false); }
  };

  const verify = async () => {
    if (!source || !challenge) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/connectors/website/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action: "verify", sourceId: source.id, challengeId: challenge.challengeId, token }) });
      const json = await response.json().catch(() => ({} as { error?: string; source?: WebsiteSourceSummary }));
      if (!response.ok || !json.source) throw new Error(json.error || "Domain verification failed.");
      setSource(json.source); setChallenge(null); setToken("");
      onStatus?.("Website verified. Auterim can now run the bounded sync.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Domain verification failed."); }
    finally { setWorking(false); }
  };

  const sync = async () => {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/connectors/website/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action: "sync" }) });
      const json = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok && response.status !== 202) throw new Error(json.error || "Website sync could not be queued.");
      onStatus?.("Website sync queued. New observations will appear in Memory for review.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Website sync could not be queued."); }
    finally { setWorking(false); }
  };

  const disconnect = async () => {
    if (!source || !window.confirm("Disconnect Website Knowledge Sync? Existing owner-confirmed Memory stays; observed website context will be withdrawn.")) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/connectors/website/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, sourceId: source.id, retainObservations: true }) });
      const json = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) throw new Error(json.error || "Website source could not be disconnected.");
      setSource(null); setChallenge(null); onStatus?.("Website Knowledge Sync disconnected. Owner-confirmed Memory was retained.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Website source could not be disconnected."); }
    finally { setWorking(false); }
  };

  const verificationInstruction = useMemo(() => {
    if (!challenge) return null;
    if (challenge.method === "dns_txt") return <><strong>DNS TXT</strong><code>{challenge.dnsRecord}</code><span>Add this TXT value at the configured hostname, then press Verify.</span></>;
    if (challenge.method === "html_file") return <><strong>HTML file</strong><code>{challenge.htmlFilePath}</code><code>{challenge.token}</code><span>Serve the token as a plain-text file at the path above.</span></>;
    return <><strong>HTML meta tag</strong><code>{challenge.htmlMeta}</code><span>Place this tag in the public homepage head.</span></>;
  }, [challenge]);

  if (loading) return <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Loading website controls…</div>;
  if (!canManage) return <div style={{ padding: 12, borderRadius: 10, background: "rgba(245,194,107,0.08)", color: "var(--amber)", fontSize: 12 }}>Website setup and verification are limited to workspace owners and admins. Review-only website observations appear in Memory.</div>;

  return (
    <div style={{ display: "grid", gap: 14, marginTop: compact ? 12 : 0 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Governed public website context</div>
        <div style={{ color: "var(--text-mute)", fontSize: 11.5, lineHeight: 1.5 }}>One verified HTTPS company website. Auterim follows robots rules, starts from sitemaps, stays within the page budget, and writes only untrusted observed context until an owner reviews it.</div>
      </div>
      <div style={{ display: "grid", gap: 9 }}>
        <label className="lab" htmlFor="website-origin">Canonical website origin</label>
        <input id="website-origin" className="os-input" placeholder="https://example.com" value={origin} onChange={(event) => setOrigin(event.target.value)} disabled={saving || working} />
        <label className="lab" htmlFor="website-subdomains">Allowed subdomains <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>(optional, one per line)</span></label>
        <textarea id="website-subdomains" className="os-input" rows={2} placeholder="www.example.com" value={allowedSubdomains} onChange={(event) => setAllowedSubdomains(event.target.value)} disabled={saving || working} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label className="lab" htmlFor="website-include">Include paths</label><textarea id="website-include" className="os-input" rows={3} placeholder="/products\n/solutions" value={includePaths} onChange={(event) => setIncludePaths(event.target.value)} disabled={saving || working} /></div>
          <div><label className="lab" htmlFor="website-exclude">Exclude paths</label><textarea id="website-exclude" className="os-input" rows={3} placeholder="/blog\n/legal" value={excludePaths} onChange={(event) => setExcludePaths(event.target.value)} disabled={saving || working} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><label className="lab" htmlFor="website-max-pages">Max pages</label><input id="website-max-pages" className="os-input" type="number" min={1} max={100} value={maxPages} onChange={(event) => setMaxPages(event.target.value)} disabled={saving || working} /></div>
          <div><label className="lab" htmlFor="website-cadence">Cadence</label><select id="website-cadence" className="os-input" value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)} disabled={saving || working}><option value="manual">Manual only</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          <label style={{ display: "flex", alignItems: "end", gap: 7, fontSize: 12, color: "var(--text-dim)" }}><input type="checkbox" checked={syncEnabled} onChange={(event) => setSyncEnabled(event.target.checked)} disabled={saving || working} /> Enable sync</label>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={saving || working || !origin.trim()}>{saving ? "Saving…" : source ? "Save website settings" : "Save website"}</button>
      </div>

      {source && <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ fontSize: 12.5, fontWeight: 650 }}>Verification</div><div style={{ color: "var(--text-mute)", fontSize: 11.5 }}>{source.verificationStatus === "verified" ? `Verified ${formatDate(source.verifiedAt)} · expires ${formatDate(source.verificationExpiresAt)}` : "Verification is required before any page is fetched."}</div></div><span className={`badge ${source.verificationStatus === "verified" ? "green" : "amber"}`}>{source.verificationStatus}</span></div>
        {source.verificationStatus !== "verified" && <><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><select className="os-input" value={method} onChange={(event) => setMethod(event.target.value as WebsiteVerificationMethod)} disabled={working}><option value="dns_txt">DNS TXT</option><option value="html_meta">Homepage meta tag</option><option value="html_file">Well-known HTML file</option></select><button type="button" className="btn btn-ghost btn-sm" onClick={() => void issueChallenge()} disabled={working}>{working ? "Working…" : "Create challenge"}</button></div>{challenge && <div style={{ display: "grid", gap: 6, fontSize: 11.5, color: "var(--text-dim)" }}>{verificationInstruction}<input className="os-input" aria-label="Verification token" placeholder="Paste the token to verify" value={token} onChange={(event) => setToken(event.target.value)} disabled={working} /><button type="button" className="btn btn-primary btn-sm" onClick={() => void verify()} disabled={working || !token.trim()}>Verify domain</button><span style={{ color: "var(--text-mute)" }}>Challenge expires {formatDate(challenge.expiresAt)}. Tokens are stored hashed.</span></div>}</>}
        {source.verificationStatus === "verified" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn btn-primary btn-sm" onClick={() => void sync()} disabled={working || !source.syncEnabled}>{working ? "Queueing…" : "Sync website now"}</button><button type="button" className="btn btn-danger btn-sm" onClick={() => void disconnect()} disabled={working}>Disconnect</button></div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 11.5, color: "var(--text-mute)" }}><span>Pages checked<strong style={{ display: "block", color: "var(--text-dim)" }}>{source.pagesChecked}</strong></span><span>Changed<strong style={{ display: "block", color: "var(--text-dim)" }}>{source.pagesChanged}</strong></span><span>Pending review<strong style={{ display: "block", color: "var(--cyan)" }}>{source.observationsPending}</strong></span></div>
      </div>}
      {error && <div role="alert" style={{ color: "#ffaaaa", fontSize: 11.5 }}>{error}</div>}
    </div>
  );
}
