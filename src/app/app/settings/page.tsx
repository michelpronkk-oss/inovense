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
import { PageHeader } from "@/components/product-ui/page-primitives";

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
      <PageHeader
        eyebrow="Workspace control"
        title="Settings"
        description="Manage your workspace, connected accounts and notifications."
      />

      {searchParams.get("billing") === "returned" && (
        <p className="t-meta" style={{ color: "#64ffd7" }}>Billing settings updated.</p>
      )}

      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section"><SettingsIcon size={13} /> Billing</h3>
          {showManageBilling && canManageWorkspace ? (
            <button className="btn btn-ghost btn-sm" onClick={openBillingPortal} disabled={billingBusy}>
              {billingBusy ? "Opening…" : "Manage billing"}
            </button>
          ) : canManageWorkspace ? (
            <Link className="btn btn-primary btn-sm" href="/plans">Choose a plan</Link>
          ) : (
            <span className="t-meta">Owner or admin access required</span>
          )}
        </div>
        <div className="card-pad t-compact">
          {!canManageWorkspace
            ? "Only the workspace owner or an admin can manage billing."
            : showManageBilling
            ? "Manage your subscription, invoices and payment details in the billing portal."
            : "No active billing profile found. Activate a plan first."}
        </div>
      </section>

      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section"><LinkIcon size={13} /> Connected accounts</h3>
          <span className="t-meta">Accounts operators use for approved actions</span>
        </div>
        {accountsLoading ? (
          <div className="card-pad t-meta" aria-label="Loading connected accounts">Loading connected accounts…</div>
        ) : visibleConnectedAccounts.length === 0 ? (
          <div className="card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span className="t-meta">No accounts connected.</span>
            <Link className="btn btn-ghost btn-sm" href="/connectors">Connect an account</Link>
          </div>
        ) : (
          <div className="rows">
            {visibleConnectedAccounts.map((acct) => {
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
                <div className="row" key={acct.connectorKey}>
                  <span className="cn grow">
                    <span className="cn-mark lg" style={{ color }}>{IntegrationLogos[acct.displayName] ?? letter}</span>
                    <span className="nm">
                      <b>{acct.displayName}</b>
                      <span>
                        {(isConnected || reconnectRequired) && acct.accountEmail
                          ? acct.accountEmail
                          : isConnected || reconnectRequired
                            ? "Connected account"
                            : statusLabel}
                        {" · "}{authLabel}
                        {connectedDate && isConnected ? ` · Since ${connectedDate}` : ""}
                      </span>
                      <span>{acct.permissionsLabel.join(" · ")}</span>
                    </span>
                  </span>
                  <span className="rt">
                    <span className="t-mono" style={{ color: statusColor }}>{statusLabel}</span>
                    {/* Disconnecting revokes a real credential, so it keeps
                        negative weight rather than reading as a neutral action. */}
                    {canManageWorkspace && <button className="btn btn-ghost btn-sm" onClick={() => reconnectAccount(acct.connectorKey)}>{isConnected ? "Reconnect" : "Connect"}</button>}
                    {canManageWorkspace && <button className="btn btn-danger btn-sm" disabled={!isConnected || disconnectingAccount === acct.connectorKey} onClick={() => void disconnectAccount(acct.connectorKey)}>{disconnectingAccount === acct.connectorKey ? "Disconnecting…" : "Disconnect"}</button>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid3 sec">
        <section className="card">
          <div className="card-head">
            <h3 className="t-section"><SettingsIcon size={13} /> Workspace identity</h3>
            {canManageWorkspace ? <button className="btn btn-ghost btn-sm" onClick={() => startEdit("workspace")}>Edit</button> : <span className="t-meta">Owner or admin access required</span>}
          </div>
          <div className="rows">
            <div className="row">
              <span className="grow"><span className="ttl">Name</span></span>
              <span className="rt t-compact">{state.workspace.name}</span>
            </div>
            <div className="row">
              <span className="grow"><span className="ttl">Workspace ID</span></span>
              <span className="rt t-mono">{state.workspace.id}</span>
            </div>
            <div className="row">
              <span className="grow"><span className="ttl">Access</span></span>
              <span className="rt t-compact">{workspacePlanLabel}</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3 className="t-section"><SettingsIcon size={13} /> Control boundary</h3>
            <Link className="btn btn-ghost btn-sm" href="/policies">Open</Link>
          </div>
          <div className="rows">
            <div className="row">
              <span className="grow"><span className="ttl"><span className="dot dot-cyan" style={{ marginRight: 8 }} />Execution policy</span><span className="sub">Open policy controls for the current live boundary.</span></span>
            </div>
            <div className="row">
              <span className="grow"><span className="ttl">Safety check</span><span className="sub">Each action is re-evaluated immediately before execution.</span></span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3 className="t-section"><SettingsIcon size={13} /> Notifications</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => startEdit("notifications")}>Edit</button>
          </div>
          <div className="rows">
            <div className="row">
              <span className="grow"><span className="ttl">Approval requests</span></span>
              <span className="rt t-compact">{state.currentUser.notifications.approvals ? `On · ${state.currentUser.email}` : "Off"}</span>
            </div>
            <div className="row">
              <span className="grow"><span className="ttl">Control alerts</span></span>
              <span className="rt t-compact">{state.currentUser.notifications.alerts ? `On · ${state.currentUser.email}` : "Off"}</span>
            </div>
          </div>
        </section>
      </div>

      {feedback && <p role="status" className="t-meta" style={{ color: "#64ffd7" }}>{feedback}</p>}
      {error && <p role="alert" className="t-meta" style={{ color: "#ff8f8f" }}>{error}</p>}

      {editing && (
        <OSModal label={`Edit ${editing}`} className="os-modal-backdrop" onClose={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="tt"><h3>Edit {editing === "workspace" ? "workspace" : "notifications"}</h3></div>
              <button className="btn-icon" onClick={() => setEditing(null)} aria-label="Close">
                <XIcon size={13} />
              </button>
            </div>

            {editing === "workspace" && (
              <div className="modal-body stack">
                <div className="field">
                  <label className="label">Workspace emblem</label>
                  <div className="inline">
                    <div className="workspace-logo-preview" style={workspaceLogoPreview ? { backgroundImage: `url(${workspaceLogoPreview})` } : undefined}>
                      {!workspaceLogoPreview && workspaceDraft.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="hint" style={{ marginTop: 0 }}>
                        {workspaceLogoFile ? `${workspaceLogoFile.name} selected. Save workspace to apply it.` : "Use a square PNG, JPG, WebP, or SVG. Maximum 2 MB."}
                      </p>
                      <label className="btn btn-ghost btn-sm workspace-logo-upload">
                        {workspaceLogoPreview ? "Replace logo" : "Upload logo"}
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => selectWorkspaceLogo(event.target.files?.[0])} />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Workspace name</label>
                  <input value={workspaceDraft.name} onChange={(e) => setWorkspaceDraft((p) => ({ ...p, name: e.target.value }))} className="input" aria-label="Workspace name" placeholder="Workspace name" />
                </div>
                <dl className="kv">
                  <div><dt>Workspace access</dt><dd>{workspacePlanLabel}</dd></div>
                </dl>
                <p className="hint">{entitlements.billingStatus === "preview" ? (entitlements.trialEndsAt ? "Your trial has ended. Choose a plan to reactivate real execution." : "This workspace's trial has already been used. Choose a plan to activate real execution.") : "Billing changes are managed securely in the billing portal."}</p>
              </div>
            )}

            {editing === "notifications" && (
              <div className="modal-body stack">
                <div className="attn info" style={{ padding: "12px 14px" }}>
                  <p className="t-meta" style={{ margin: 0 }}>Optional email delivery is sent to <strong className="ink">{state.currentUser.email}</strong>. Billing, security and legal messages remain required when applicable.</p>
                </div>
                <div className="rows">
                  {([
                    ["approvals", "Approval requests", "When work is ready for your decision."],
                    ["alerts", "Control alerts", "When execution needs attention."],
                  ] as const).map(([key, label, detail]) => (
                    <div className="row" key={key}>
                      <span className="grow"><span className="ttl">{label}</span><span className="sub">{detail}</span></span>
                      <span className="rt">
                        <button type="button" className={`swi${emailPreferences[key] ? " on" : ""}`} aria-pressed={emailPreferences[key]} aria-label={label} onClick={() => setEmailPreferences((current) => ({ ...current, [key]: !current[key] }))} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-foot">
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </OSModal>
      )}
    </div>
  );
}
