"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";

type AutonomyMode = "safe" | "assisted" | "managed";

type PolicySettings = {
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
};

const MODES: { key: AutonomyMode; label: string; help: string; locked?: boolean }[] = [
  { key: "safe", label: "Safe mode", help: "Approval-first. Only system notifications, daily brief and health checks run automatically." },
  { key: "assisted", label: "Assisted autopilot", help: "Adds auto-apply for low-risk Trello comments with high confidence. Email, CRM, card create/move still require approval." },
  { key: "managed", label: "Managed custom", help: "Custom rules. Coming soon.", locked: true },
];

function Row({ label, value, tone, help }: { label: string; value: string; tone: "green" | "amber" | "rose" | "neutral"; help?: string }) {
  return (
    <div className="policy-rule-row">
      <div>
        <div>{label}</div>
        {help && <small>{help}</small>}
      </div>
      <span className={`policy-rule-state ${tone}`}>{value}</span>
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
      const json = await res.json().catch(() => ({})) as { policy?: PolicySettings; error?: string };
      if (!res.ok || !json.policy) throw new Error(json.error || "Could not load policy settings.");
      setPolicy(json.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load policy settings.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, state.workspace.id]);

  useEffect(() => { void load(); }, [load]);

  const patch = async (body: Partial<Pick<PolicySettings, "autonomyMode" | "emergencyStopEnabled" | "customerEmailMode" | "dailyBriefAllowed">>) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, ...body }),
      });
      const json = await res.json().catch(() => ({})) as { policy?: PolicySettings; error?: string };
      if (!res.ok || !json.policy) throw new Error(json.error || "Could not save policy settings.");
      setPolicy(json.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save policy settings.");
    } finally {
      setSaving(false);
    }
  };

  const assisted = policy?.autonomyMode === "assisted";
  const stop = Boolean(policy?.emergencyStopEnabled);

  return (
    <div className="os-page policy-page">
      <div className="os-page-head policy-page-head">
        <div>
          <span className="os-greet">Control center</span>
          <h1>Execution policy</h1>
          <div className="os-page-sub">Choose how work is reviewed. Rules are checked before every action.</div>
        </div>
        <div className={`policy-live-state ${stop ? "stopped" : ""}`}><i />{stop ? "Execution paused" : "Live enforcement on"}</div>
      </div>

      {error && <div role="alert" className="policy-alert rose"><i />{error}</div>}

      {stop && (
        <div className="policy-alert rose strong">
          <i />
          Emergency stop is ON. Customer emails, CRM writes, project tool changes and operator Slack messages are blocked at execution. System notifications and health checks still run.
        </div>
      )}

      {/* Autonomy mode */}
      <div className="p policy-mode-card" style={{ gap: 0 }}>
        <div className="p-head"><h3><ShieldIcon size={13} /> Operating posture</h3><span className="p-meta">{loading ? "Loading" : `Now: ${policy?.autonomyMode ?? "safe"}`}</span></div>
        <div className="policy-mode-grid">
          {MODES.map((mode) => {
            const active = policy?.autonomyMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                disabled={saving || loading || mode.locked}
                onClick={() => !mode.locked && patch({ autonomyMode: mode.key })}
                aria-pressed={active} className={`policy-choice ${active ? "active" : ""} ${mode.locked ? "locked" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{mode.label}</span>
                  {mode.locked ? <span className="pill" style={{ fontSize: 10 }}>Coming soon</span> : active ? <span className="pill pill-cyan" style={{ fontSize: 10 }}>Active</span> : null}
                </div>
                <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>{mode.help}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency stop */}
      <div className={`p policy-stop-card ${stop ? "is-on" : ""}`} style={{ gap: 0 }}>
        <div className="p-head"><h3>Emergency stop</h3></div>
        <div className="policy-stop-body">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Block all risky execution</div>
            <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--text-mute)" }}>Stops customer emails, CRM updates, project changes and operator Slack messages. Checked before every action.</div>
          </div>
          <button
            type="button"
            className={`appr-btn ${stop ? "deny" : "edit"}`}
            disabled={saving || loading}
            onClick={() => patch({ emergencyStopEnabled: !stop })}
          >
            {stop ? "Emergency stop ON" : "Emergency stop OFF"}
          </button>
        </div>
      </div>

      {/* Customer email */}
      <div className="p policy-email-card" style={{ gap: 0 }}>
        <div className="p-head"><h3>Customer email</h3><span className="p-meta">Enforced</span></div>
        <div className="policy-email-body">
          <div className="policy-email-options">
            {([
              { key: "approval_required", label: "Approval required", help: "Operators draft replies. You approve before sending." },
              { key: "draft_only", label: "Draft only", help: "Operators prepare the reply but Gmail never sends it." },
            ] as const).map((opt) => {
              const active = policy?.customerEmailMode === opt.key;
              return (
                <button key={opt.key} type="button" disabled={saving || loading} onClick={() => patch({ customerEmailMode: opt.key })} aria-pressed={active} className={`policy-choice ${active ? "active" : ""}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>{active && <span className="pill pill-cyan" style={{ fontSize: 10 }}>Active</span>}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{opt.help}</div>
                </button>
              );
            })}
          </div>
          <div className="policy-not-available">
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Auto-send low risk</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Customer emails require your review.</div>
            </div>
            <span className="pill" style={{ fontSize: 10 }}>Not available</span>
          </div>
        </div>
      </div>

      {/* Automatic-where-safe + approval-where-it-matters */}
      <div className="policy-enforcement-grid">
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3><span className="policy-panel-dot green" /> Runs automatically</h3></div>
          <div className="policy-rule-list">
            <Row label="Connector health checks" value={policy?.connectorHealthChecksAllowed ? "Auto" : "Off"} tone={policy?.connectorHealthChecksAllowed ? "green" : "neutral"} help="System checks, internal only." />
            <Row label="Internal Slack notifications" value={policy?.internalSlackNotificationsAllowed ? "Auto (enabled)" : "Off"} tone={policy?.internalSlackNotificationsAllowed ? "green" : "neutral"} help="Controlled in Slack connector settings." />
            <Row label="Daily brief" value={stop ? "Blocked (stop)" : policy?.dailyBriefAllowed ? "Auto" : "Off"} tone={stop ? "rose" : policy?.dailyBriefAllowed ? "green" : "neutral"} help="Internal summary to the default Slack channel." />
            <Row label="Low-risk Trello comments" value={stop ? "Blocked (stop)" : assisted ? "Auto if confidence high" : "Approval required"} tone={stop ? "rose" : assisted ? "green" : "amber"} help="Only in Assisted autopilot, low risk and high confidence." />
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3><span className="policy-panel-dot amber" /> Always needs approval</h3></div>
          <div className="policy-rule-list">
            <Row label="Customer emails" value={stop ? "Blocked (stop)" : policy?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <Row label="CRM writes (HubSpot)" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <Row label="Trello card create / move" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <Row label="Operator Slack messages" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <Row label="Destructive actions" value="Blocked" tone="rose" help="Never automatic, in any mode." />
          </div>
        </div>
      </div>

      <div className="policy-proof">
        <strong style={{ color: "var(--text-dim)" }}>How enforcement works:</strong> every operator action is evaluated against this policy when prepared, and <strong style={{ color: "var(--text-dim)" }}>re-evaluated against the live policy at execution time</strong>. Changing a setting affects pending approvals too, so a tightened policy can turn an approval into draft-only or blocked when it runs.
      </div>
    </div>
  );
}
