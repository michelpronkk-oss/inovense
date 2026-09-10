"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import { PageHeader } from "@/components/product-ui/page-primitives";

type AutonomyMode = "manual" | "approval_first" | "guarded" | "autonomous";

type PolicySettings = {
  version: number;
  autonomyMode: AutonomyMode;
  emergencyStopEnabled: boolean;
  customerEmailMode: "approval_required" | "draft_only" | "auto_send_low_risk";
  internalSlackNotificationsAllowed: boolean;
  dailyBriefAllowed: boolean;
  connectorHealthChecksAllowed: boolean;
  lowRiskProjectToolCommentsAllowed: boolean;
  crmWritesRequireApproval: boolean;
  projectToolWritesRequireApproval: boolean;
  customerFacingActionsRequireApproval: boolean;
  actionRules: Array<{
    id: string;
    enabled: boolean;
    connector?: string | null;
    action?: string | null;
    subjectType?: string | null;
    conditions: Array<{ field: string; operator: string; value?: string | number | boolean }>;
    decision: string;
    approverRoles?: string[];
    expiresAfterMinutes?: number | null;
    priority: number;
    reason: string;
  }>;
  connectorState: Array<{ connectorKey: string; displayName: string; status: string; executable: boolean }>;
};

const MODES: { key: AutonomyMode; label: string; help: string; locked?: boolean }[] = [
  { key: "manual", label: "Manual", help: "Operators prepare recommendations and drafts. No business writes execute." },
  { key: "approval_first", label: "Approval first", help: "Every business write waits for a human decision." },
  { key: "guarded", label: "Guarded", help: "High-confidence, low-risk Trello comments may run inside enforced limits. Everything else is reviewed." },
  { key: "autonomous", label: "Autonomous", help: "Uses the same hard safety rules and volume limits. External messages, CRM writes and task moves still need approval." },
];

function Row({ label, value, tone, help }: { label: string; value: string; tone: "green" | "amber" | "rose" | "neutral"; help?: string }) {
  const dotClass = tone === "green" ? "dot dot-green" : tone === "amber" ? "dot dot-amber" : "dot";
  const dotStyle = tone === "rose" ? { background: "var(--red, #F2767C)", boxShadow: "0 0 6px var(--red, #F2767C)" } : tone === "neutral" ? { background: "var(--text-faint)" } : undefined;
  return (
    <div className="row">
      <span className="grow">
        <span className="ttl">{label}</span>
        {help && <span className="sub">{help}</span>}
      </span>
      <span className="rt"><span className={dotClass} style={dotStyle} />{value}</span>
    </div>
  );
}

export default function PoliciesPage() {
  const { state } = useOS();
  const [policy, setPolicy] = useState<PolicySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const load = useCallback(async () => {
    if (!state.workspace.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/policies?${identityParams.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { policy?: PolicySettings; connectorState?: PolicySettings["connectorState"]; error?: string };
      if (!res.ok || !json.policy) throw new Error(json.error || "Could not load policy settings.");
      setPolicy({ ...json.policy, connectorState: json.connectorState ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load policy settings.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const patch = async (body: Partial<Pick<PolicySettings, "autonomyMode" | "emergencyStopEnabled" | "customerEmailMode" | "dailyBriefAllowed">>) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, ...body }),
      });
      const json = await res.json().catch(() => ({})) as { policy?: PolicySettings; connectorState?: PolicySettings["connectorState"]; error?: string };
      if (!res.ok || !json.policy) throw new Error(json.error || "Could not save policy settings.");
      setPolicy({ ...json.policy, connectorState: json.connectorState ?? policy?.connectorState ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save policy settings.");
    } finally {
      setSaving(false);
    }
  };

  const autonomousComments = policy?.autonomyMode === "guarded" || policy?.autonomyMode === "autonomous";
  const stop = Boolean(policy?.emergencyStopEnabled);
  const currentModeLabel = MODES.find((mode) => mode.key === policy?.autonomyMode)?.label ?? "Approval first";
  const connectorIsActive = (key: string) => policy?.connectorState.some((connector) => connector.connectorKey === key && ["connected", "healthy"].includes(connector.status)) ?? false;
  const connectedEmailConnectors = ["gmail", "microsoft"].filter(connectorIsActive);
  const connectorLabel = (key: string) => policy?.connectorState.find((connector) => connector.connectorKey === key)?.displayName ?? key;

  return (
    <div className="os-page policy-page">
      <PageHeader
        eyebrow="Control center"
        title="Policies"
        description="Choose how work is reviewed. Rules are checked before every action."
        actions={<span className={`badge ${stop ? "red" : "cyan"}`}><i />{stop ? "Execution paused" : "Live enforcement on"}</span>}
      />

      {error && <div role="alert" className="attn crit sec" style={{ padding: "12px 14px" }}>{error}</div>}

      {stop && (
        <div className="attn crit sec" style={{ padding: "14px 16px" }}>
          <div className="t-object">Emergency stop is ON</div>
          <p className="t-meta" style={{ margin: "4px 0 0" }}>Customer emails, CRM writes, project tool changes and operator Slack messages are blocked at execution. System notifications and health checks still run.</p>
        </div>
      )}

      {/* Control model */}
      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section"><ShieldIcon size={13} /> Control model</h3>
          <span className="t-meta">{loading ? "Loading" : `Now: ${currentModeLabel}`}</span>
        </div>
        <div className="card-pad stack">
          {MODES.map((mode) => {
            const active = policy?.autonomyMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                disabled={saving || loading || mode.locked}
                onClick={() => !mode.locked && patch({ autonomyMode: mode.key })}
                aria-pressed={active}
                className={`radio-card${active ? " on" : ""}`}
                style={mode.locked ? { opacity: .5, pointerEvents: "none" } : undefined}
              >
                <span className={`rdo${active ? " on" : ""}`} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{mode.label}</b>
                  <span>{mode.help}</span>
                </span>
                {mode.locked ? <span className="badge muted" style={{ flex: "none", alignSelf: "flex-start" }}>NOT AVAILABLE</span> : active ? <span className="badge cyan" style={{ flex: "none", alignSelf: "flex-start" }}>ACTIVE</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Customer email */}
      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section">Customer email</h3>
          <span className="t-meta">Enforced</span>
        </div>
        <div className="card-pad stack">
          <div className="grid2">
            {([
              { key: "approval_required", label: "Approval required", help: "Operators draft replies. You approve before sending." },
              { key: "draft_only", label: "Draft only", help: "Operators prepare the reply but Gmail never sends it." },
            ] as const).map((opt) => {
              const active = policy?.customerEmailMode === opt.key;
              return (
                <button key={opt.key} type="button" disabled={saving || loading} onClick={() => patch({ customerEmailMode: opt.key })} aria-pressed={active} className={`radio-card${active ? " on" : ""}`}>
                  <span className={`rdo${active ? " on" : ""}`} aria-hidden="true" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{opt.label}</b>
                    <span>{opt.help}</span>
                  </span>
                  {active && <span className="badge cyan" style={{ flex: "none", alignSelf: "flex-start" }}>ACTIVE</span>}
                </button>
              );
            })}
          </div>
          <div className="rows">
            <div className="row">
              <span className="grow">
                <span className="ttl">Auto-send low risk</span>
                <span className="sub">Customer emails require your review.</span>
              </span>
              <span className="rt"><span className="badge muted">NOT AVAILABLE</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="card sec">
        <div className="card-head">
          <div>
            <h3 className="t-section">Business rules</h3>
            <p className="t-meta" style={{ margin: "4px 0 0" }}>Version {policy?.version ?? 2}. Contextual rules strengthen the safety baseline; they cannot enable unsupported connector automation.</p>
          </div>
          <span className="badge cyan">DETERMINISTIC</span>
        </div>
        <div className="rows">
          {(policy?.actionRules ?? []).map((rule) => (
            <div className="row" key={rule.id}>
              <span className="grow">
                <span className="ttl">{rule.connector || "Platform"} · {(rule.action || "all actions").replace(/_/g, " ")}</span>
                <span className="sub">{rule.reason}</span>
              </span>
              <span className="rt"><span className={`dot ${connectorIsActive(rule.connector || "") ? "dot-amber" : "dot"}`} />{rule.connector && !connectorIsActive(rule.connector) ? "Inactive · connect first" : rule.decision === "approval_required" ? "Approval required" : rule.decision}</span>
            </div>
          ))}
          {!loading && (policy?.actionRules ?? []).length === 0 && <div className="card-pad"><p className="t-meta" style={{ margin: 0 }}>No contextual rules configured. The platform baseline remains active.</p></div>}
        </div>
      </section>

      {/* Automatic-where-safe + approval-where-it-matters */}
      <div className="sec grid2">
        <section className="card">
          <div className="card-head"><h3 className="t-section">Allowed automatically</h3></div>
          <div className="rows">
            <Row label="Connector health checks" value={policy?.connectorHealthChecksAllowed ? "Auto" : "Off"} tone={policy?.connectorHealthChecksAllowed ? "green" : "neutral"} help="System checks, internal only." />
            <Row label="Internal Slack notifications" value={!connectorIsActive("slack") ? "Unavailable" : policy?.internalSlackNotificationsAllowed ? "Auto (enabled)" : "Off"} tone={!connectorIsActive("slack") ? "neutral" : policy?.internalSlackNotificationsAllowed ? "green" : "neutral"} help={!connectorIsActive("slack") ? "Connect Slack to enable this capability." : "Controlled in Slack connector settings."} />
            <Row label="Daily brief" value={!connectorIsActive("slack") ? "Unavailable" : stop ? "Blocked (stop)" : policy?.dailyBriefAllowed ? "Auto" : "Off"} tone={!connectorIsActive("slack") ? "neutral" : stop ? "rose" : policy?.dailyBriefAllowed ? "green" : "neutral"} help={!connectorIsActive("slack") ? "Connect Slack to deliver the brief." : "Internal summary to the default Slack channel."} />
            <Row label="Low-risk Trello comments" value={!connectorIsActive("trello") ? "Unavailable" : stop ? "Blocked (stop)" : autonomousComments ? "Auto within limits" : "Approval required"} tone={!connectorIsActive("trello") ? "neutral" : stop ? "rose" : autonomousComments ? "green" : "amber"} help={!connectorIsActive("trello") ? "Connect Trello to enable project comments." : "Requires high confidence, connector health and hourly/daily safety limits."} />
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3 className="t-section">Requires approval</h3></div>
          <div className="rows">
            {connectedEmailConnectors.length > 0 && <Row label={`Customer emails · ${connectedEmailConnectors.map(connectorLabel).join(" / ")}`} value={stop ? "Blocked (stop)" : policy?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required"} tone={stop ? "rose" : "amber"} />}
            {connectorIsActive("hubspot") && <Row label="CRM writes · HubSpot" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />}
            {connectorIsActive("trello") && <Row label="Trello card create / move" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />}
            {connectorIsActive("slack") && <Row label="Operator Slack messages" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />}
            {connectedEmailConnectors.length === 0 && !connectorIsActive("hubspot") && !connectorIsActive("trello") && !connectorIsActive("slack") && <div className="card-pad"><p className="t-meta" style={{ margin: 0 }}>No connected write-capable systems currently require approval.</p></div>}
          </div>
        </section>
      </div>

      {/* Never allowed + emergency stop */}
      <div className="sec grid2">
        <section className="card">
          <div className="card-head"><h3 className="t-section">Never allowed</h3></div>
          <div className="rows">
            <Row label="Destructive actions" value="Blocked" tone="rose" help="Never automatic, in any mode." />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3 className="t-section">Emergency stop</h3>
            <span className={`badge ${stop ? "red" : "green"}`}><i />{stop ? "ON" : "OFF"}</span>
          </div>
          <div className="card-pad stack">
            <div>
              <div className="t-object">Block all risky execution</div>
              <p className="t-meta" style={{ marginTop: 4 }}>Stops customer emails, CRM updates, project changes and operator Slack messages. Checked before every action.</p>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${stop ? "btn-secondary" : "btn-danger"}`}
              disabled={saving || loading}
              onClick={() => patch({ emergencyStopEnabled: !stop })}
            >
              {stop ? "Emergency stop ON" : "Emergency stop OFF"}
            </button>
          </div>
        </section>
      </div>

      <p className="t-meta sec" style={{ maxWidth: "78ch" }}>
        <strong className="ink">How enforcement works:</strong> every operator action is evaluated against this policy when prepared, and <strong className="ink">re-evaluated against the live policy at execution time</strong>. Changing a setting affects pending approvals too, so a tightened policy can turn an approval into draft-only or blocked when it runs.
      </p>
    </div>
  );
}
