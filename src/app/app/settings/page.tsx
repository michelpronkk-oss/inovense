"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OSModal } from "@/components/dashboard/modal";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkIcon, SettingsIcon, XIcon } from "@/components/dashboard/icons";
import type { ConnectedAccount } from "@/app/api/connectors/accounts/route";
import { useOS } from "@/lib/os/app-provider";
import { saveWorkspaceSettings } from "./actions";
import { saveProfileSettings } from "@/app/app/profile/actions";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel } from "@/lib/os/truth";
import { LOGOS as IntegrationLogos } from "@/components/home-v3/integrations-grid";

type SectionKey = "workspace" | "notifications";

export default function SettingsPage() {
  const { state, updateWorkspace, updateCurrentUser, disconnectConnector, refreshWorkspace } = useOS();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const visibleConnectedAccounts = connectedAccounts.filter((account) =>
    account.status === "connected" || account.status === "healthy" || account.status === "reconnect_required"
  );
  const entitlements = getEntitlements(state.workspace);
  const workspacePlanLabel = entitlements.billingStatus === "preview"
    ? "Preview - no plan activated"
    : `${getPlanLabel(entitlements.planTier)} - ${{ active: "Active", trialing: "Trial active", past_due: "Billing attention", canceled: "Canceled", preview: "Preview" }[entitlements.billingStatus]}`;
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";
  const canManageWorkspace = state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin";

  const [workspaceDraft, setWorkspaceDraft] = useState(state.settings.workspace);
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

    const saveResult = await saveWorkspaceSettings({
      workspace: editing === "workspace" ? workspaceToSave : state.workspace,
    });

    if (!saveResult.success) {
      setError(saveResult.error ?? "Could not persist settings.");
      setSaving(false);
      return;
    }

    if (editing === "workspace") {
      updateWorkspace(workspaceToSave);
      try {
        await refreshWorkspace();
        router.refresh();
      } catch {
        // The confirmed local update keeps the shell current if a follow-up
        // canonical refresh is temporarily unavailable.
      }
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
          <div className="os-page-sub">Manage your workspace, connected accounts and notifications.</div>
        </div>
      </div>

      {searchParams.get("billing") === "returned" && (
        <div style={{ color: "#64ffd7", fontSize: 12 }}>Billing settings updated.</div>
      )}

      <div className="p">
        <div className="p-head">
          <h3><SettingsIcon size={13} /> Billing</h3>
          {showManageBilling && canManageWorkspace ? (
            <button className="btn btn-ghost btn-sm" onClick={openBillingPortal} disabled={billingBusy} style={{ opacity: billingBusy ? 0.7 : 1 }}>
              {billingBusy ? "Opening…" : "Manage billing"}
            </button>
          ) : canManageWorkspace ? (
            <a className="btn btn-primary btn-sm" href="/plans">Choose a plan</a>
          ) : (
            <span className="p-meta">Owner or admin access required</span>
          )}
        </div>
        <div style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--text-dim)" }}>
          {!canManageWorkspace
            ? "Only the workspace owner or an admin can manage billing."
            : showManageBilling
            ? "Manage your subscription, invoices and payment details in the billing portal."
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
          <div className="settings-account-skeleton" aria-label="Loading connected accounts"><span /><span /><span /></div>
        ) : visibleConnectedAccounts.length === 0 ? (
          <div className="settings-accounts-empty" style={{ padding: "16px 18px", fontSize: 12.5, color: "var(--text-faint)" }}>
            <span>No accounts connected.</span>
            <Link className="lnk-open" href="/connectors">Connect an account</Link>
          </div>
        ) : (
          visibleConnectedAccounts.map((acct) => {
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
                  {canManageWorkspace && <button
                    className="appr-btn edit"
                    style={{ fontSize: 11 }}
                    onClick={() => reconnectAccount(acct.connectorKey)}
                  >
                    {isConnected ? "Reconnect" : "Connect"}
                  </button>}
                  {/* Disconnecting revokes a real credential, so it keeps
                      negative weight rather than reading as a neutral action. */}
                  {canManageWorkspace && <button
                    className="appr-btn deny is-negative"
                    style={{ fontSize: 11, opacity: disconnectingAccount === acct.connectorKey ? 0.6 : 1 }}
                    disabled={!isConnected || disconnectingAccount === acct.connectorKey}
                    onClick={() => void disconnectAccount(acct.connectorKey)}
                  >
                    {disconnectingAccount === acct.connectorKey ? "Disconnecting…" : "Disconnect"}
                  </button>}
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
            {canManageWorkspace ? <button className="appr-btn edit" onClick={() => startEdit("workspace")}>Edit workspace</button> : <span className="p-meta">Owner or admin access required</span>}
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
          <div className="settings-workspace-foot">Your workspace name and logo appear across Auterim.</div>
        </section>

        <section className="p settings-policy-surface">
          <div className="p-head">
            <h3><SettingsIcon size={13} /> Control boundary</h3>
            <Link className="appr-btn edit" href="/policies">Open policy controls</Link>
          </div>
          <div className="settings-boundary-lead"><span className="dot dot-cyan" /> Live enforcement, checked again at execution</div>
          <div className="settings-policy-list">
            <div><span>Execution policy</span><strong>Open policy controls for the current live boundary.</strong></div>
            <div><span>Safety check</span><strong>Each action is re-evaluated immediately before execution.</strong></div>
          </div>
        </section>

        <section className="p settings-notifications-surface">
          <div className="p-head">
            <h3><SettingsIcon size={13} /> Notifications</h3>
            <button className="appr-btn edit" onClick={() => startEdit("notifications")}>Email delivery</button>
          </div>
          <div className="settings-notification-list">
            <div><span>Approval requests</span><strong>{state.currentUser.notifications.approvals ? `Email on — ${state.currentUser.email}` : "Email off"}</strong></div>
            <div><span>Control alerts</span><strong>{state.currentUser.notifications.alerts ? `Email on — ${state.currentUser.email}` : "Email off"}</strong></div>
          </div>
        </section>
      </div>

      {feedback && <div role="status" style={{ color: "#64ffd7", fontSize: 12 }}>{feedback}</div>}
      {error && <div role="alert" style={{ color: "#ff8f8f", fontSize: 12 }}>{error}</div>}

      {editing && (
        <OSModal label={`Edit ${editing}`} className="os-modal-backdrop settings-edit-backdrop" onClose={() => setEditing(null)}>
          <div className="os-modal settings-edit-modal" style={{ maxWidth: 680, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            {/* Icon close in the header; Cancel stays in the footer. Same
                modal language as the team and connector dialogs. */}
            <div className="os-modal-head">
              <h3>Edit {editing}</h3>
              <button className="os-iconbtn" onClick={() => setEditing(null)} aria-label="Close">
                <XIcon size={13} />
              </button>
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
                <input value={workspaceDraft.name} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, name: e.target.value }))} className="os-input" aria-label="Workspace name" placeholder="Workspace name" />
                <div className="workspace-plan-note"><span>Workspace access</span><strong>{workspacePlanLabel}</strong><small>{entitlements.billingStatus === "preview" ? "Choose a plan when you are ready. A trial starts only after checkout is completed." : "Billing changes are managed securely in the billing portal."}</small></div>
              </div>
            )}

            {editing === "notifications" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.2)", fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.55 }}>
                  Optional email delivery is sent to <strong style={{ color: "var(--text)" }}>{state.currentUser.email}</strong>. Billing, security and legal messages remain required when applicable.
                </div>
                {([
                  ["approvals", "Approval requests", "When work is ready for your decision."],
                  ["alerts", "Control alerts", "When execution needs attention."],
                ] as const).map(([key, label, detail]) => (
                  <button key={key} type="button" aria-pressed={emailPreferences[key]} onClick={() => setEmailPreferences((current) => ({ ...current, [key]: !current[key] }))} style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px", borderRadius: 12, color: "inherit", background: emailPreferences[key] ? "rgba(77,232,225,0.055)" : "rgba(255,255,255,0.02)", boxShadow: `inset 0 0 0 1px ${emailPreferences[key] ? "rgba(77,232,225,0.28)" : "var(--line)"}`, cursor: "pointer" }}>
                    <span><strong style={{ display: "block", fontSize: 13 }}>{label}</strong><small style={{ display: "block", marginTop: 3, color: "var(--text-mute)", fontSize: 11.5 }}>{detail}</small></span>
                    <span className={`pill ${emailPreferences[key] ? "pill-cyan" : ""}`}>{emailPreferences[key] ? "Email on" : "Off"}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="settings-edit-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </OSModal>
      )}
    </div>
  );
}
