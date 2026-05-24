"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LinkIcon, SettingsIcon } from "@/components/dashboard/icons";
import type { ConnectedAccount } from "@/app/api/connectors/accounts/route";
import { useOS } from "@/lib/os/app-provider";
import type { OSSettings } from "@/lib/os/types";
import { saveWorkspaceSettings } from "./actions";
import { getEntitlements } from "@/lib/os/entitlements";

type SectionKey = keyof OSSettings;
type ApprovalMode = "Always require approval" | "Auto-approve within policy" | "Auto-approve" | "Blocked";
type NotifyChannel = "Email" | "Slack" | "Slack + email" | "Off";

type NotificationDraftRow = {
  channel: NotifyChannel;
  target: string;
};

const APPROVAL_OPTIONS: ApprovalMode[] = [
  "Always require approval",
  "Auto-approve within policy",
  "Auto-approve",
  "Blocked",
];

const ENV_OPTIONS = ["production", "staging", "development"];
const REGION_OPTIONS = ["eu-west-1", "us-east-1", "us-west-2"];
const PLAN_OPTIONS = ["starter", "growth", "operator", "enterprise"];

const NOTIFICATION_LABELS: Record<keyof OSSettings["notifications"], string> = {
  approvalInbox: "Approval inbox",
  weeklyDigest: "Weekly digest",
  errorAlerts: "Error alerts",
  newAgentDeployed: "New agent deployed",
};

const APPROVAL_LABELS: Record<keyof OSSettings["approvalPolicy"], string> = {
  outboundComms: "Outbound comms",
  proposals: "Proposals",
  internalReports: "Internal reports",
  crmWrites: "CRM writes",
};

const ROW_LABELS: Record<string, string> = {
  name: "Name",
  environment: "Environment",
  region: "Region",
  plan: "Plan",
  outboundComms: "Outbound Comms",
  proposals: "Proposals",
  internalReports: "Internal Reports",
  crmWrites: "CRM Writes",
  approvalInbox: "Approval Inbox",
  weeklyDigest: "Weekly Digest",
  errorAlerts: "Error Alerts",
  newAgentDeployed: "New Agent Deployed",
};

function formatRowLabel(key: string): string {
  if (ROW_LABELS[key]) return ROW_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function parseNotificationValue(value: string): NotificationDraftRow {
  if (value.toLowerCase() === "off") return { channel: "Off", target: "" };
  if (value.toLowerCase().includes("slack") && value.toLowerCase().includes("email")) {
    const parts = value.split(" - ");
    return { channel: "Slack + email", target: parts[1] ?? "" };
  }
  if (value.toLowerCase().includes("slack")) {
    const parts = value.split(" - ");
    return { channel: "Slack", target: parts[1] ?? "" };
  }
  const parts = value.split(" - ");
  return { channel: "Email", target: parts[1] ?? value };
}

function serializeNotificationValue(row: NotificationDraftRow): string {
  if (row.channel === "Off") return "Off";
  if (row.channel === "Slack + email") return `Slack + email - ${row.target || "default channels"}`;
  if (row.channel === "Slack") return `Slack - ${row.target || "#ops-alerts"}`;
  return `Email - ${row.target || "all admins"}`;
}

export default function SettingsPage() {
  const { state, updateSettingsSection, updateWorkspace } = useOS();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const entitlements = getEntitlements(state.workspace);
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";

  const [workspaceDraft, setWorkspaceDraft] = useState(state.settings.workspace);
  const [approvalDraft, setApprovalDraft] = useState(state.settings.approvalPolicy);
  const [notificationDraft, setNotificationDraft] = useState<Record<keyof OSSettings["notifications"], NotificationDraftRow>>({
    approvalInbox: parseNotificationValue(state.settings.notifications.approvalInbox),
    weeklyDigest: parseNotificationValue(state.settings.notifications.weeklyDigest),
    errorAlerts: parseNotificationValue(state.settings.notifications.errorAlerts),
    newAgentDeployed: parseNotificationValue(state.settings.notifications.newAgentDeployed),
  });

  useEffect(() => {
    if (!editing) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [editing]);

  useEffect(() => {
    if (!state.workspace.id) return;
    setAccountsLoading(true);
    fetch(`/api/connectors/accounts?workspaceId=${encodeURIComponent(state.workspace.id)}`)
      .then((r) => r.ok ? r.json() as Promise<ConnectedAccount[]> : Promise.resolve([]))
      .then((data) => setConnectedAccounts(Array.isArray(data) ? data : []))
      .catch(() => setConnectedAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, [state.workspace.id]);

  const sections: Array<{ key: SectionKey; title: string; fields: Record<string, string> }> = useMemo(() => ([
    { key: "workspace", title: "Workspace", fields: state.settings.workspace },
    { key: "approvalPolicy", title: "Approval policy", fields: state.settings.approvalPolicy },
    { key: "notifications", title: "Notifications", fields: state.settings.notifications },
  ]), [state.settings]);

  const startEdit = (key: SectionKey) => {
    setEditing(key);
    setError("");
    setFeedback("");
    setWorkspaceDraft(state.settings.workspace);
    setApprovalDraft(state.settings.approvalPolicy);
    setNotificationDraft({
      approvalInbox: parseNotificationValue(state.settings.notifications.approvalInbox),
      weeklyDigest: parseNotificationValue(state.settings.notifications.weeklyDigest),
      errorAlerts: parseNotificationValue(state.settings.notifications.errorAlerts),
      newAgentDeployed: parseNotificationValue(state.settings.notifications.newAgentDeployed),
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    setFeedback("");

    if (editing === "workspace" && !workspaceDraft.name.trim()) {
      setError("Workspace name is required.");
      setSaving(false);
      return;
    }

    if (editing === "workspace") {
      updateWorkspace(workspaceDraft);
      updateSettingsSection("workspace", workspaceDraft);
    }

    if (editing === "approvalPolicy") {
      updateSettingsSection("approvalPolicy", approvalDraft);
    }

    if (editing === "notifications") {
      const nextNotifications: OSSettings["notifications"] = {
        approvalInbox: serializeNotificationValue(notificationDraft.approvalInbox),
        weeklyDigest: serializeNotificationValue(notificationDraft.weeklyDigest),
        errorAlerts: serializeNotificationValue(notificationDraft.errorAlerts),
        newAgentDeployed: serializeNotificationValue(notificationDraft.newAgentDeployed),
      };
      updateSettingsSection("notifications", nextNotifications);
    }

    const nextSettings: OSSettings = {
      workspace: editing === "workspace" ? workspaceDraft : state.settings.workspace,
      approvalPolicy: editing === "approvalPolicy" ? approvalDraft : state.settings.approvalPolicy,
      notifications: editing === "notifications"
        ? {
            approvalInbox: serializeNotificationValue(notificationDraft.approvalInbox),
            weeklyDigest: serializeNotificationValue(notificationDraft.weeklyDigest),
            errorAlerts: serializeNotificationValue(notificationDraft.errorAlerts),
            newAgentDeployed: serializeNotificationValue(notificationDraft.newAgentDeployed),
          }
        : state.settings.notifications,
    };

    const saveResult = await saveWorkspaceSettings({
      workspace: editing === "workspace" ? { ...state.workspace, ...workspaceDraft } : state.workspace,
      settings: nextSettings,
    });

    if (!saveResult.success) {
      setError(saveResult.error ?? "Could not persist settings.");
      setSaving(false);
      return;
    }

    setEditing(null);
    setSaving(false);
    setFeedback("Settings saved.");
  };

  const reconnectAccount = (connectorKey: string) => {
    if (connectorKey === "gmail") {
      const qs = new URLSearchParams({
        workspaceId: state.workspace.id,
        userEmail: state.currentUser.email,
        userId: state.currentUser.id,
      });
      window.location.href = `/api/connectors/gmail/auth?${qs.toString()}`;
      return;
    }
    window.location.href = "/app/connectors";
  };

  const openBillingPortal = async () => {
    setBillingBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/dodo/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { portalUrl?: string; error?: string };
      if (!res.ok || !json.portalUrl) {
        setError(json.error || "No active billing profile found. Activate a plan first.");
        setBillingBusy(false);
        return;
      }
      window.location.href = json.portalUrl;
    } catch {
      setError("Could not open billing portal.");
      setBillingBusy(false);
    }
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Workspace - {state.workspace.name}</span>
          <h1>Settings</h1>
          <div className="os-page-sub">Workspace configuration, approval policies, notification preferences and billing.</div>
        </div>
      </div>

      {searchParams.get("billing") === "returned" && (
        <div style={{ color: "#64ffd7", fontSize: 12 }}>Billing settings updated.</div>
      )}

      <div className="p">
        <div className="p-head">
          <h3><SettingsIcon size={13} /> Billing</h3>
          {showManageBilling ? (
            <button className="btn btn-ghost btn-sm" onClick={openBillingPortal} disabled={billingBusy} style={{ opacity: billingBusy ? 0.7 : 1 }}>
              {billingBusy ? "Opening..." : "Manage billing"}
            </button>
          ) : (
            <a className="btn btn-primary btn-sm" href="/api/billing/dodo/checkout?plan=starter">Activate Starter</a>
          )}
        </div>
        <div style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--text-dim)" }}>
          {showManageBilling
            ? "Use Dodo Customer Portal to manage subscription, invoices, payment method and cancellation."
            : "No active billing profile found. Activate a plan first."}
        </div>
      </div>

      <div className="p">
        <div className="p-head">
          <h3><LinkIcon size={13} /> Connected accounts</h3>
          <div className="p-meta" style={{ fontSize: 10.5, color: "var(--text-mute)" }}>
            Accounts operators use for approved actions
          </div>
        </div>
        {accountsLoading ? (
          <div style={{ padding: "16px 18px", fontSize: 12.5, color: "var(--text-faint)" }}>Loading...</div>
        ) : connectedAccounts.length === 0 ? (
          <div style={{ padding: "16px 18px", fontSize: 12.5, color: "var(--text-faint)" }}>No connector data available.</div>
        ) : (
          connectedAccounts.map((acct) => {
            const color = acct.connectorKey === "gmail" ? "#EA4335" : "#FF7A59";
            const letter = acct.connectorKey === "gmail" ? "G" : "Hs";
            const authLabel = acct.authType === "native" ? "Native connector" : "Secure connector";
            const isConnected = acct.status === "connected";
            const statusColor = isConnected ? "var(--green)" : acct.status === "error" ? "var(--red, #F2767C)" : "var(--text-faint)";
            const statusLabel = isConnected ? "Connected" : acct.status === "error" ? "Error" : "Not connected";
            const connectedDate = acct.connectedAt
              ? new Date(acct.connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null;
            return (
              <div
                key={acct.connectorKey}
                style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, boxShadow: `inset 0 0 0 1px ${color}45`, display: "grid", placeItems: "center", color, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, flexShrink: 0 }}>
                  {letter}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{acct.displayName}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", marginTop: 2 }}>
                    {isConnected && acct.accountEmail
                      ? acct.accountEmail
                      : isConnected
                        ? "Connected account"
                        : statusLabel}
                    {" · "}{authLabel}
                    {connectedDate && isConnected ? ` · Since ${connectedDate}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>
                    {acct.permissionsLabel.join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: statusColor, marginRight: 4 }}>{statusLabel}</span>
                  <button
                    className="appr-btn edit"
                    style={{ fontSize: 11 }}
                    onClick={() => reconnectAccount(acct.connectorKey)}
                  >
                    {isConnected ? "Reconnect" : "Connect"}
                  </button>
                  <button
                    className="appr-btn deny"
                    style={{ fontSize: 11, opacity: 0.45, cursor: "not-allowed" }}
                    disabled
                    title="Disconnect coming soon"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sections.map((section) => (
        <div className="p" key={section.title}>
          <div className="p-head">
            <h3><SettingsIcon size={13} /> {section.title}</h3>
            <button className="appr-btn edit" onClick={() => startEdit(section.key)}>Edit</button>
          </div>
          <div>
            {Object.entries(section.fields).map(([label, value]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--line)", fontSize: 13, gap: 12 }}>
                <span style={{ color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{formatRowLabel(label)}</span>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {feedback && <div style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}
      {error && <div style={{ color: "#ff8f8f", fontSize: 12 }}>{error}</div>}

      {editing && (
        <div className="os-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="os-modal" style={{ maxWidth: 680, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>Edit {editing === "approvalPolicy" ? "approval policy" : editing}</h3>
              <button className="appr-btn deny" onClick={() => setEditing(null)}>Close</button>
            </div>

            {editing === "workspace" && (
              <div style={{ display: "grid", gap: 10 }}>
                <input value={workspaceDraft.name} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, name: e.target.value }))} className="os-input" placeholder="Workspace name" />
                <select value={workspaceDraft.environment} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, environment: e.target.value }))} className="os-input">
                  {ENV_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={workspaceDraft.region} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, region: e.target.value }))} className="os-input">
                  {REGION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={workspaceDraft.plan} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, plan: e.target.value }))} className="os-input">
                  {PLAN_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {editing === "approvalPolicy" && (
              <div style={{ display: "grid", gap: 10 }}>
                {(Object.keys(approvalDraft) as Array<keyof OSSettings["approvalPolicy"]>).map((key) => (
                  <div key={key} style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-dim)" }}>{APPROVAL_LABELS[key]}</label>
                    <select
                      value={approvalDraft[key]}
                      onChange={(e) => setApprovalDraft((prev) => ({ ...prev, [key]: e.target.value as ApprovalMode }))}
                      className="os-input"
                    >
                      {APPROVAL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {editing === "notifications" && (
              <div style={{ display: "grid", gap: 12 }}>
                {(Object.keys(notificationDraft) as Array<keyof OSSettings["notifications"]>).map((key) => (
                  <div key={key} style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--text-dim)" }}>{NOTIFICATION_LABELS[key]}</label>
                    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
                      <select
                        value={notificationDraft[key].channel}
                        onChange={(e) => setNotificationDraft((prev) => ({ ...prev, [key]: { ...prev[key], channel: e.target.value as NotifyChannel } }))}
                        className="os-input"
                      >
                        <option>Email</option>
                        <option>Slack</option>
                        <option>Slack + email</option>
                        <option>Off</option>
                      </select>
                      <input
                        value={notificationDraft[key].target}
                        onChange={(e) => setNotificationDraft((prev) => ({ ...prev, [key]: { ...prev[key], target: e.target.value } }))}
                        className="os-input"
                        placeholder="Target (e.g. #ops-alerts or Monday 9AM)"
                        disabled={notificationDraft[key].channel === "Off"}
                        style={{ opacity: notificationDraft[key].channel === "Off" ? 0.6 : 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
