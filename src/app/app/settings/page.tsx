"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LinkIcon, SettingsIcon } from "@/components/dashboard/icons";
import type { ConnectedAccount } from "@/app/api/connectors/accounts/route";
import { useOS } from "@/lib/os/app-provider";
import type { OSSettings } from "@/lib/os/types";
import { saveWorkspaceSettings } from "./actions";
import { saveProfileSettings } from "@/app/app/profile/actions";
import { getEntitlements } from "@/lib/os/entitlements";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";

type SectionKey = keyof OSSettings;
type ApprovalPolicyEditableKey = "outboundComms" | "proposals" | "internalReports" | "crmWrites";
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
const APPROVAL_EDITABLE_KEYS: ApprovalPolicyEditableKey[] = ["outboundComms", "proposals", "internalReports", "crmWrites"];

const NOTIFICATION_LABELS: Record<keyof OSSettings["notifications"], string> = {
  approvalInbox: "Approval inbox",
  weeklyDigest: "Weekly digest",
  errorAlerts: "Error alerts",
  newAgentDeployed: "New agent deployed",
};

const APPROVAL_LABELS: Record<ApprovalPolicyEditableKey, string> = {
  outboundComms: "Outbound comms",
  proposals: "Proposals",
  internalReports: "Internal reports",
  crmWrites: "CRM writes",
};

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
  const { state, updateSettingsSection, updateWorkspace, updateCurrentUser, disconnectConnector } = useOS();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [workspaceLogoFile, setWorkspaceLogoFile] = useState<File | null>(null);
  const [workspaceLogoPreview, setWorkspaceLogoPreview] = useState("");
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const entitlements = getEntitlements(state.workspace);
  const workspacePlanLabel = entitlements.billingStatus === "preview"
    ? "Preview - no plan activated"
    : `${entitlements.planTier.charAt(0).toUpperCase()}${entitlements.planTier.slice(1)} - ${entitlements.billingStatus}`;
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";

  const [workspaceDraft, setWorkspaceDraft] = useState(state.settings.workspace);
  const [approvalDraft, setApprovalDraft] = useState(state.settings.approvalPolicy);
  const [notificationDraft, setNotificationDraft] = useState<Record<keyof OSSettings["notifications"], NotificationDraftRow>>({
    approvalInbox: parseNotificationValue(state.settings.notifications.approvalInbox),
    weeklyDigest: parseNotificationValue(state.settings.notifications.weeklyDigest),
    errorAlerts: parseNotificationValue(state.settings.notifications.errorAlerts),
    newAgentDeployed: parseNotificationValue(state.settings.notifications.newAgentDeployed),
  });
  const [emailPreferences, setEmailPreferences] = useState({ ...state.currentUser.notifications });

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
    // This effect starts the client-only connector account synchronization.
    setAccountsLoading(true);
    const qs = new URLSearchParams({
      workspaceId: state.workspace.id,
      userId: state.currentUser.id,
      userEmail: state.currentUser.email,
    });
    fetch(`/api/connectors/accounts?${qs.toString()}`)
      .then((r) => r.ok ? r.json() as Promise<ConnectedAccount[]> : Promise.resolve([]))
      .then((data) => setConnectedAccounts(Array.isArray(data) ? data : []))
      .catch(() => setConnectedAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const startEdit = (key: SectionKey) => {
    setEditing(key);
    setError("");
    setFeedback("");
    setWorkspaceDraft(state.settings.workspace);
    setWorkspaceLogoFile(null);
    setWorkspaceLogoPreview(state.settings.workspace.logoUrl ?? "");
    setApprovalDraft(state.settings.approvalPolicy);
    setNotificationDraft({
      approvalInbox: parseNotificationValue(state.settings.notifications.approvalInbox),
      weeklyDigest: parseNotificationValue(state.settings.notifications.weeklyDigest),
      errorAlerts: parseNotificationValue(state.settings.notifications.errorAlerts),
      newAgentDeployed: parseNotificationValue(state.settings.notifications.newAgentDeployed),
    });
    setEmailPreferences({ ...state.currentUser.notifications });
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

    if (editing === "notifications") {
      const result = await saveProfileSettings({
        workspaceId: state.workspace.id,
        userId: state.currentUser.id,
        name: state.currentUser.name,
        email: state.currentUser.email,
        roleLabel: state.currentUser.roleLabel,
        initials: state.currentUser.initials,
        avatarUrl: state.currentUser.avatarUrl,
        notifications: emailPreferences,
        dashboard: state.dashboard,
      });
      if (!result.success) {
        setError(result.message);
        setSaving(false);
        return;
      }
      updateCurrentUser({ notifications: emailPreferences });
      setEditing(null);
      setSaving(false);
      setFeedback("Email notification preferences saved.");
      return;
    }

    let workspaceToSave = { ...state.workspace, ...workspaceDraft };
    if (editing === "workspace" && workspaceLogoFile) {
      const logoUrl = await uploadWorkspaceLogo(workspaceLogoFile);
      if (!logoUrl) {
        setSaving(false);
        return;
      }
      workspaceToSave = { ...workspaceToSave, logoUrl };
      setWorkspaceDraft((current) => ({ ...current, logoUrl }));
      setWorkspaceLogoPreview(logoUrl);
    }

    if (editing === "workspace") {
      updateWorkspace(workspaceToSave);
      updateSettingsSection("workspace", workspaceToSave);
    }

    if (editing === "approvalPolicy") {
      updateSettingsSection("approvalPolicy", approvalDraft);
    }

    const nextSettings: OSSettings = {
      workspace: editing === "workspace" ? workspaceToSave : state.settings.workspace,
      approvalPolicy: editing === "approvalPolicy" ? approvalDraft : state.settings.approvalPolicy,
      notifications: state.settings.notifications,
      activation: state.settings.activation,
    };

    const saveResult = await saveWorkspaceSettings({
      workspace: editing === "workspace" ? workspaceToSave : state.workspace,
      settings: nextSettings,
    });

    if (!saveResult.success) {
      setError(saveResult.error ?? "Could not persist settings.");
      setSaving(false);
      return;
    }

    setEditing(null);
    setSaving(false);
    setWorkspaceLogoFile(null);
    setFeedback(editing === "workspace" ? "Workspace settings saved." : "Settings saved.");
  };

  const reconnectAccount = (connectorKey: string) => {
    if (connectorKey === "gmail") {
      const qs = new URLSearchParams({
        workspaceId: state.workspace.id,
        userEmail: state.currentUser.email,
        userId: state.currentUser.id,
      });
      window.location.assign(`/api/connectors/gmail/auth?${qs.toString()}`);
      return;
    }
    window.location.assign("/connectors");
  };

  const disconnectAccount = async (connectorKey: string) => {
    setDisconnectingAccount(connectorKey);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/connectors/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, connectorKey }),
      });
      const result = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        setError(result.error || "Could not disconnect this account.");
        return;
      }
      disconnectConnector(connectorKey);
      setConnectedAccounts((accounts) => accounts.map((account) => account.connectorKey === connectorKey ? { ...account, status: "not_connected", reconnectRequired: false, accountEmail: null } : account));
      setFeedback("Account disconnected. Auterim no longer has access.");
    } catch {
      setError("Could not disconnect this account.");
    } finally {
      setDisconnectingAccount(null);
    }
  };

  const selectWorkspaceLogo = (file: File | undefined) => {
    if (!file) return;
    const permittedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!permittedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a PNG, JPG, WebP, or SVG under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setWorkspaceLogoFile(file);
      setWorkspaceLogoPreview(typeof reader.result === "string" ? reader.result : "");
      setError("");
      setFeedback("New emblem selected. Save workspace to apply it.");
    };
    reader.readAsDataURL(file);
  };

  const uploadWorkspaceLogo = async (file: File): Promise<string | null> => {
    setError("");
    try {
      const form = new FormData();
      form.set("workspaceId", state.workspace.id);
      form.set("file", file);
      const response = await fetch("/api/workspace/logo", { method: "POST", body: form });
      const result = await response.json().catch(() => ({} as { logoUrl?: string; error?: string }));
      if (!response.ok || !result.logoUrl) {
        setError(result.error || "Could not upload workspace logo.");
        return null;
      }
      return result.logoUrl;
    } catch {
      setError("Could not upload workspace logo.");
      return null;
    }
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
    <div className="os-page settings-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Workspace control</span>
          <h1>Settings</h1>
          <div className="os-page-sub">Shape your workspace identity, guardrails and notification routing.</div>
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
            <a className="btn btn-primary btn-sm" href="/plans">Choose a plan</a>
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
            const isConnected = acct.status === "connected" || acct.status === "healthy";
            const reconnectRequired = acct.status === "reconnect_required" || acct.reconnectRequired;
            const statusColor = isConnected ? "var(--green)" : reconnectRequired ? "var(--amber)" : acct.status === "error" ? "var(--red, #F2767C)" : "var(--text-faint)";
            const statusLabel = isConnected ? "Connected" : reconnectRequired ? "Reconnect required" : acct.status === "error" ? "Error" : "Not connected";
            const connectedDate = acct.connectedAt
              ? new Date(acct.connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null;
            return (
              <div
                key={acct.connectorKey}
                className="settings-account-row"
                style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}
              >
                <div className="connector-brand-logo" style={{ width: 34, height: 34, borderRadius: 10, color, flexShrink: 0 }}>
                  {IntegrationLogos[acct.displayName] ?? letter}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{acct.displayName}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", marginTop: 2 }}>
                    {(isConnected || reconnectRequired) && acct.accountEmail
                      ? acct.accountEmail
                      : isConnected || reconnectRequired
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
                    style={{ fontSize: 11, opacity: disconnectingAccount === acct.connectorKey ? 0.6 : 1 }}
                    disabled={!isConnected || disconnectingAccount === acct.connectorKey}
                    onClick={() => void disconnectAccount(acct.connectorKey)}
                  >
                    {disconnectingAccount === acct.connectorKey ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="settings-studio">
        <section className="p settings-workspace-surface">
          <div className="p-head">
            <h3><SettingsIcon size={13} /> Workspace identity</h3>
            <button className="appr-btn edit" onClick={() => startEdit("workspace")}>Edit workspace</button>
          </div>
          <div className="settings-workspace-body">
            <div className="settings-workspace-mark" style={state.workspace.logoUrl ? { backgroundImage: `url(${state.workspace.logoUrl})` } : undefined}>
              {!state.workspace.logoUrl && state.workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="settings-workspace-name">{state.workspace.name}</div>
              <div className="settings-workspace-id">{state.workspace.id}</div>
            </div>
            <div className="settings-workspace-meta">
              <span>{workspacePlanLabel}</span>
            </div>
          </div>
          <div className="settings-workspace-foot">Your workspace identity appears in the operating rail and shared workspace context.</div>
        </section>

        <section className="p settings-policy-surface">
          <div className="p-head">
            <h3><SettingsIcon size={13} /> Control boundary</h3>
            <Link className="appr-btn edit" href="/policies">Open policy controls</Link>
          </div>
          <div className="settings-boundary-lead"><span className="dot dot-cyan" /> Live enforcement, checked again at execution</div>
          <div className="settings-policy-list">
            <div><span>Customer email</span><strong>{state.settings.approvalPolicy.customerEmailMode === "draft_only" ? "Draft only — Gmail will not send" : "Human approval required"}</strong></div>
            <div><span>CRM and project changes</span><strong>Human approval required</strong></div>
            <div><span>Automatic work</span><strong>{state.settings.approvalPolicy.autonomyMode === "assisted" ? "Low-risk internal comments only" : "System checks and summaries only"}</strong></div>
          </div>
        </section>

        <section className="p settings-notifications-surface">
          <div className="p-head">
            <h3><SettingsIcon size={13} /> Notification routing</h3>
            <button className="appr-btn edit" onClick={() => startEdit("notifications")}>Email preferences</button>
          </div>
          <div className="settings-notification-list">
            <div><span>Approval requests</span><strong>{state.currentUser.notifications.approvals ? `Email on — ${state.currentUser.email}` : "Email off"}</strong></div>
            <div><span>Control alerts</span><strong>{state.currentUser.notifications.alerts ? `Email on — ${state.currentUser.email}` : "Email off"}</strong></div>
            <div><span>Operating digest</span><strong>{state.currentUser.notifications.digest ? "Email preference saved" : "Email off"}</strong></div>
          </div>
        </section>
      </div>

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
              <div style={{ display: "grid", gap: 12 }}>
                <div className="workspace-identity-editor">
                  <div className="workspace-logo-preview" style={workspaceLogoPreview ? { backgroundImage: `url(${workspaceLogoPreview})` } : undefined}>
                    {!workspaceLogoPreview && workspaceDraft.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="workspace-identity-title">Workspace emblem</div>
                    <div className="workspace-identity-copy">
                      {workspaceLogoFile ? `${workspaceLogoFile.name} selected — save workspace to apply it.` : "Use a square PNG, JPG, WebP, or SVG. Maximum 2 MB."}
                    </div>
                    <label className="btn btn-ghost btn-sm workspace-logo-upload">
                      {workspaceLogoPreview ? "Replace logo" : "Upload logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => selectWorkspaceLogo(event.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                <input value={workspaceDraft.name} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, name: e.target.value }))} className="os-input" placeholder="Workspace name" />
                <div className="workspace-plan-note"><span>Workspace access</span><strong>{workspacePlanLabel}</strong><small>{entitlements.billingStatus === "preview" ? "Choose a plan when you are ready. A trial starts only after checkout is completed." : "Billing changes are managed securely in the billing portal."}</small></div>
              </div>
            )}

            {editing === "approvalPolicy" && (
              <div style={{ display: "grid", gap: 10 }}>
                {APPROVAL_EDITABLE_KEYS.map((key) => (
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
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.2)", fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.55 }}>
                  Email is the dependable default. Notifications are sent to <strong style={{ color: "var(--text)" }}>{state.currentUser.email}</strong>; Slack is optional and never required for an approval to reach you.
                </div>
                {([
                  ["approvals", "Approval requests", "When work is ready for your decision."],
                  ["alerts", "Control alerts", "When a policy blocks execution or a run needs attention."],
                  ["digest", "Operating digest", "Your saved preference for scheduled workspace summaries."],
                ] as const).map(([key, label, detail]) => (
                  <button key={key} type="button" onClick={() => setEmailPreferences((current) => ({ ...current, [key]: !current[key] }))} style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px", borderRadius: 12, color: "inherit", background: emailPreferences[key] ? "rgba(77,232,225,0.055)" : "rgba(255,255,255,0.02)", boxShadow: `inset 0 0 0 1px ${emailPreferences[key] ? "rgba(77,232,225,0.28)" : "var(--line)"}`, cursor: "pointer" }}>
                    <span><strong style={{ display: "block", fontSize: 13 }}>{label}</strong><small style={{ display: "block", marginTop: 3, color: "var(--text-mute)", fontSize: 11.5 }}>{detail}</small></span>
                    <span className={`pill ${emailPreferences[key] ? "pill-cyan" : ""}`}>{emailPreferences[key] ? "Email on" : "Off"}</span>
                  </button>
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
