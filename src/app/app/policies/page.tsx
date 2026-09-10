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
  connectorPolicies: Record<string, { customerEmailMode?: "approval_required" | "draft_only" }>;
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

  const patch = async (body: Partial<Pick<PolicySettings, "autonomyMode" | "emergencyStopEnabled" | "customerEmailMode" | "dailyBriefAllowed">> & { connectorPolicy?: { connectorKey: string; customerEmailMode: "approval_required" | "draft_only" } }) => {
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
  const connectorIsActive = (key: string) => policy?.connectorState.some((connector) => connector.connectorKey === key && ["connected", "healthy"].includes(connector.status) && connector.executable) ?? false;
  const activeActionRules = (policy?.actionRules ?? []).filter((rule) => !rule.connector || connectorIsActive(rule.connector));
  const activeWriteConnectors = (policy?.connectorState ?? []).filter((connector) => connector.executable && ["connected", "healthy"].includes(connector.status));
  const effectiveEmailMode = (connectorKey: string) => policy?.connectorPolicies?.[connectorKey]?.customerEmailMode ?? policy?.customerEmailMode ?? "approval_required";
  const hasEmailOverride = (connectorKey: string) => Boolean(policy?.connectorPolicies?.[connectorKey]?.customerEmailMode);

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

      {/* Connector-local controls. Only executable, connected systems appear here. */}
      {activeWriteConnectors.length > 0 && <section className="card sec">
        <div className="card-head">
          <div>
            <h3 className="t-section">Connected system controls</h3>
            <p className="t-meta" style={{ margin: "4px 0 0" }}>Live controls for systems that can act in this workspace.</p>
          </div>
          <span className="badge green"><i />{activeWriteConnectors.length} live</span>
        </div>
        <div className="rows">
          {activeWriteConnectors.map((connector) => {
            const isEmail = connector.connectorKey === "gmail" || connector.connectorKey === "microsoft";
            const emailMode = effectiveEmailMode(connector.connectorKey);
            if (isEmail) {
              return (
                <div className="row" key={connector.connectorKey}>
                  <span className="grow">
                    <span className="ttl">{connector.displayName} · customer email</span>
                    <span className="sub">{hasEmailOverride(connector.connectorKey) ? "Custom policy for this connector." : "Inherited from the workspace control model."}</span>
                  </span>
                  <span className="inline" style={{ flexShrink: 0 }}>
                    <button type="button" className={`btn btn-sm ${emailMode === "approval_required" ? "btn-primary" : "btn-ghost"}`} disabled={saving || loading} onClick={() => patch({ connectorPolicy: { connectorKey: connector.connectorKey, customerEmailMode: "approval_required" } })}>Approval first</button>
                    <button type="button" className={`btn btn-sm ${emailMode === "draft_only" ? "btn-primary" : "btn-ghost"}`} disabled={saving || loading} onClick={() => patch({ connectorPolicy: { connectorKey: connector.connectorKey, customerEmailMode: "draft_only" } })}>Draft only</button>
                  </span>
                </div>
              );
            }
            const guardrail = connector.connectorKey === "hubspot"
              ? "CRM writes require approval. Context thresholds can only strengthen this boundary."
              : connector.connectorKey === "trello"
                ? "Card creation and moves require approval; low-risk comments follow the workspace mode."
                : connector.connectorKey === "slack"
                  ? "Operator messages require approval. Internal notifications remain separately controlled."
                  : "Writes are approval-gated until a connector-specific automation policy is reviewed.";
            return (
              <div className="row" key={connector.connectorKey}>
                <span className="grow">
                  <span className="ttl">{connector.displayName}</span>
                  <span className="sub">{guardrail}</span>
                </span>
                <span className="rt"><span className="dot dot-amber" />Approval required</span>
              </div>
            );
          })}
        </div>
      </section>}

      {activeActionRules.length > 0 && <section className="card sec">
        <div className="card-head">
          <div>
            <h3 className="t-section">Business rules</h3>
            <p className="t-meta" style={{ margin: "4px 0 0" }}>Version {policy?.version ?? 2}. Contextual rules strengthen the safety baseline; they cannot enable unsupported connector automation.</p>
          </div>
          <span className="badge cyan">DETERMINISTIC</span>
        </div>
        <div className="rows">
            {activeActionRules.map((rule) => (
            <div className="row" key={rule.id}>
              <span className="grow">
                <span className="ttl">{rule.connector || "Platform"} · {(rule.action || "all actions").replace(/_/g, " ")}</span>
                <span className="sub">{rule.reason}</span>
              </span>
              <span className="rt"><span className="dot dot-amber" />{rule.decision === "approval_required" ? "Approval required" : rule.decision}</span>
            </div>
          ))}
        </div>
      </section>}

      {/* Automatic-where-safe */}
      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section">Allowed automatically</h3>
          <span className="t-meta">Safe internal operations</span>
        </div>
        <div className="rows">
          <Row label="Connector health checks" value={policy?.connectorHealthChecksAllowed ? "Auto" : "Off"} tone={policy?.connectorHealthChecksAllowed ? "green" : "neutral"} help="System checks, internal only." />
          {connectorIsActive("slack") && <Row label="Internal Slack notifications" value={policy?.internalSlackNotificationsAllowed ? "Auto (enabled)" : "Off"} tone={policy?.internalSlackNotificationsAllowed ? "green" : "neutral"} help="Controlled in Slack connector settings." />}
          {connectorIsActive("slack") && <Row label="Daily brief" value={stop ? "Blocked (stop)" : policy?.dailyBriefAllowed ? "Auto" : "Off"} tone={stop ? "rose" : policy?.dailyBriefAllowed ? "green" : "neutral"} help="Internal summary to the default Slack channel." />}
          {connectorIsActive("trello") && <Row label="Low-risk Trello comments" value={stop ? "Blocked (stop)" : autonomousComments ? "Auto within limits" : "Approval required"} tone={stop ? "rose" : autonomousComments ? "green" : "amber"} help="Requires high confidence, connector health and hourly/daily safety limits." />}
        </div>
      </section>

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
