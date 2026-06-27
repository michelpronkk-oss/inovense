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
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : tone === "rose" ? "var(--rose)" : "var(--text-dim)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {help && <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--text-mute)" }}>{help}</div>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, flexShrink: 0 }}>{value}</span>
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
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Policy engine v1 - real enforcement</span>
          <h1>Policies</h1>
          <div className="os-page-sub">Inovense runs automatically where it is safe, and asks for approval where it matters. These settings are enforced live, including a re-check at execution time.</div>
        </div>
      </div>

      {error && <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(242,118,124,0.08)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.18)", color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}

      {stop && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(242,118,124,0.1)", boxShadow: "inset 0 0 0 1px rgba(242,118,124,0.28)", color: "#ffb4b4", fontSize: 12.8, fontWeight: 600 }}>
          Emergency stop is ON. Customer emails, CRM writes, project tool changes and operator Slack messages are blocked at execution. System notifications and health checks still run.
        </div>
      )}

      {/* Autonomy mode */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3><ShieldIcon size={13} /> Autonomy mode</h3><span className="p-meta">{loading ? "Loading..." : `Current: ${policy?.autonomyMode ?? "safe"}`}</span></div>
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          {MODES.map((mode) => {
            const active = policy?.autonomyMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                disabled={saving || loading || mode.locked}
                onClick={() => !mode.locked && patch({ autonomyMode: mode.key })}
                style={{
                  textAlign: "left",
                  padding: "14px 15px",
                  borderRadius: 14,
                  cursor: mode.locked ? "not-allowed" : "pointer",
                  background: active ? "rgba(77,232,225,0.07)" : "rgba(255,255,255,0.02)",
                  boxShadow: `inset 0 0 0 1px ${active ? "rgba(77,232,225,0.4)" : "var(--line)"}`,
                  opacity: mode.locked ? 0.55 : 1,
                  color: "inherit",
                  display: "grid",
                  gap: 6,
                }}
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
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Emergency stop</h3></div>
        <div style={{ padding: "8px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Block all risky execution</div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--text-mute)" }}>Conservative kill switch. Blocks customer emails, CRM, project tool changes and operator Slack messages. Re-checked live at execution.</div>
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
      </div>

      {/* Customer email */}
      <div className="p" style={{ gap: 0 }}>
        <div className="p-head"><h3>Customer email</h3><span className="p-meta">Enforced</span></div>
        <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
            {([
              { key: "approval_required", label: "Approval required", help: "Operators draft the reply; you approve before Gmail sends." },
              { key: "draft_only", label: "Draft only", help: "Operators prepare the reply but Gmail never sends it." },
            ] as const).map((opt) => {
              const active = policy?.customerEmailMode === opt.key;
              return (
                <button key={opt.key} type="button" disabled={saving || loading} onClick={() => patch({ customerEmailMode: opt.key })}
                  style={{ textAlign: "left", padding: "13px 14px", borderRadius: 12, cursor: "pointer", background: active ? "rgba(77,232,225,0.07)" : "rgba(255,255,255,0.02)", boxShadow: `inset 0 0 0 1px ${active ? "rgba(77,232,225,0.4)" : "var(--line)"}`, color: "inherit", display: "grid", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>{active && <span className="pill pill-cyan" style={{ fontSize: 10 }}>Active</span>}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{opt.help}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.015)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Auto-send low risk</div>
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>Customer emails never auto-send in v1.</div>
            </div>
            <span className="pill" style={{ fontSize: 10 }}>Not enabled in v1</span>
          </div>
        </div>
      </div>

      {/* Automatic-where-safe + approval-where-it-matters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Runs automatically</h3></div>
          <div style={{ padding: "6px 18px 14px" }}>
            <Row label="Connector health checks" value={policy?.connectorHealthChecksAllowed ? "Auto" : "Off"} tone={policy?.connectorHealthChecksAllowed ? "green" : "neutral"} help="System checks, internal only." />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Internal Slack notifications" value={policy?.internalSlackNotificationsAllowed ? "Auto (enabled)" : "Off"} tone={policy?.internalSlackNotificationsAllowed ? "green" : "neutral"} help="Controlled in Slack connector settings." />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Daily brief" value={stop ? "Blocked (stop)" : policy?.dailyBriefAllowed ? "Auto" : "Off"} tone={stop ? "rose" : policy?.dailyBriefAllowed ? "green" : "neutral"} help="Internal summary to the default Slack channel." />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Low-risk Trello comments" value={stop ? "Blocked (stop)" : assisted ? "Auto if confidence high" : "Approval required"} tone={stop ? "rose" : assisted ? "green" : "amber"} help="Only in Assisted autopilot, low risk and high confidence." />
          </div>
        </div>

        <div className="p" style={{ gap: 0 }}>
          <div className="p-head"><h3>Always needs approval</h3></div>
          <div style={{ padding: "6px 18px 14px" }}>
            <Row label="Customer emails" value={stop ? "Blocked (stop)" : policy?.customerEmailMode === "draft_only" ? "Draft only" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="CRM writes (HubSpot)" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Trello card create / move" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Operator Slack messages" value={stop ? "Blocked (stop)" : "Approval required"} tone={stop ? "rose" : "amber"} />
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <Row label="Destructive actions" value="Blocked" tone="rose" help="Never automatic, in any mode." />
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 12.5, color: "var(--text-mute)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-dim)" }}>How enforcement works:</strong> every operator action is evaluated against this policy when prepared, and <strong style={{ color: "var(--text-dim)" }}>re-evaluated against the live policy at execution time</strong>. Changing a setting affects pending approvals too, so a tightened policy can turn an approval into draft-only or blocked when it runs.
      </div>
    </div>
  );
}
