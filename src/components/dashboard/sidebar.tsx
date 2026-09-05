"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { saveProfileSettings } from "@/app/app/profile/actions";
import {
  TargetIcon, CpuIcon, FlowIcon, InboxIcon, DatabaseIcon, LinkIcon,
  DocIcon, ChartIcon, UsersIcon, ShieldIcon, KeyIcon, SettingsIcon, SwapIcon,
} from "@/components/dashboard/icons";

const ADMIN_NAV = [
  { icon: UsersIcon, label: "Team", href: "/team" },
  { icon: ShieldIcon, label: "Policies", href: "/policies" },
  { icon: KeyIcon, label: "API keys", href: "/api-keys" },
  { icon: SettingsIcon, label: "Settings", href: "/settings" },
];

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="os-profile-toggle">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function OSSidebar() {
  const pathname = usePathname();
  const { state, pendingApprovals, updateCurrentUser, setDashboardPrefs } = useOS();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "notifications" | "experience">("profile");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState("");
  const [draft, setDraft] = useState({
    name: state.currentUser.name,
    email: state.currentUser.email,
    roleLabel: state.currentUser.roleLabel,
    notifications: { ...state.currentUser.notifications },
    dashboard: { ...state.dashboard },
  });

  const hasProfileChanges = useMemo(() => (
    draft.name !== state.currentUser.name
    || draft.roleLabel !== state.currentUser.roleLabel
    || draft.notifications.approvals !== state.currentUser.notifications.approvals
    || draft.notifications.digest !== state.currentUser.notifications.digest
    || draft.notifications.alerts !== state.currentUser.notifications.alerts
    || draft.dashboard.timeRange !== state.dashboard.timeRange
    || draft.dashboard.viewMode !== state.dashboard.viewMode
  ), [draft, state]);

  const OPS_NAV = [
    { icon: TargetIcon, label: "Overview", href: "/" },
    { icon: CpuIcon, label: "Agents", href: "/agents" },
    { icon: FlowIcon, label: "Workflows", href: "/workflows" },
    { icon: InboxIcon, label: "Approvals", href: "/approvals", badge: pendingApprovals > 0 ? String(pendingApprovals) : undefined },
    { icon: DatabaseIcon, label: "Memory", href: "/memory" },
    { icon: LinkIcon, label: "Connectors", href: "/connectors" },
    { icon: DocIcon, label: "Execution logs", href: "/logs" },
    { icon: ChartIcon, label: "Insights", href: "/insights" },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname === "/app" : pathname.startsWith(href));

  return (
    <aside className="os-side">
      <Link href="/" className="os-brand">
        <Image className="os-brand-mark" src="/brand/auterim-mark-live.svg" alt="Auterim" width={18} height={18} priority />
        <span>AUTERIM</span>
      </Link>

      <div className="os-side-ws">
        <div className="os-side-ws-mark" style={state.workspace.logoUrl ? { backgroundImage: `url(${state.workspace.logoUrl})` } : undefined}>
          {!state.workspace.logoUrl && state.workspace.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="os-side-ws-name">{state.workspace.name}</div>
          <div className="os-side-ws-sub">{state.workspace.environment}</div>
        </div>
        <SwapIcon size={12} style={{ color: "var(--text-mute)" }} />
      </div>

      <div className="os-side-nav">
      <div className="os-side-label">Operations</div>
      {OPS_NAV.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link key={it.label} href={it.href} className={`os-nav${active ? " active" : ""}`}>
            <span className="ico"><Icon size={14} /></span>
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </Link>
        );
      })}

      <div className="os-side-label">Administration</div>
      {ADMIN_NAV.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link key={it.label} href={it.href} className={`os-nav${active ? " active" : ""}`}>
            <span className="ico"><Icon size={14} /></span>
            <span>{it.label}</span>
          </Link>
        );
      })}
      </div>

      <button className="os-side-bottom" style={{ border: "none", width: "100%", background: "transparent", cursor: "pointer", textAlign: "left" }} onClick={() => {
        setDraft({
          name: state.currentUser.name,
          email: state.currentUser.email,
          roleLabel: state.currentUser.roleLabel,
          notifications: { ...state.currentUser.notifications },
          dashboard: { ...state.dashboard },
        });
        setProfileTab("profile");
        setProfileFeedback("");
        setProfileOpen(true);
      }}>
        <div className="os-avatar">{state.currentUser.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{state.currentUser.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{state.currentUser.roleLabel}</div>
        </div>
        <SettingsIcon size={13} style={{ color: "var(--text-mute)" }} />
      </button>

      {profileOpen && (
        <div className="os-modal-backdrop" onClick={() => setProfileOpen(false)}>
          <div className="os-modal os-profile-modal" style={{ maxWidth: 620, width: "92%", paddingBottom: 76 }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <div>
                <div className="os-profile-eyebrow">Workspace identity</div>
                <h3>Profile settings</h3>
              </div>
              <button className="appr-btn deny" onClick={() => setProfileOpen(false)}>Close</button>
            </div>
            <div className="os-profile-identity">
              <div className="os-profile-avatar">{state.currentUser.initials}</div>
              <div>
                <div className="os-profile-name">{state.currentUser.name}</div>
                <div className="os-profile-email">{state.currentUser.email}</div>
              </div>
              <span className="os-profile-role">{state.currentUser.roleLabel}</span>
            </div>
            <div className="os-prof-tabs">
              <button className={`os-prof-tab ${profileTab === "profile" ? "active" : ""}`} onClick={() => setProfileTab("profile")}>Profile</button>
              <button className={`os-prof-tab ${profileTab === "notifications" ? "active" : ""}`} onClick={() => setProfileTab("notifications")}>Notifications</button>
              <button className={`os-prof-tab ${profileTab === "experience" ? "active" : ""}`} onClick={() => setProfileTab("experience")}>Experience</button>
            </div>

            <div className="os-profile-content">
              {profileTab === "profile" && (
                <div className="os-profile-section">
                  <div className="os-profile-section-head"><strong>Your identity</strong><span>Used across approvals and activity.</span></div>
                  <label className="os-profile-field">
                    <span>Full name</span>
                    <input className="os-input" value={draft.name} autoComplete="name" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </label>
                  <label className="os-profile-field">
                    <span>Account email</span>
                    <input className="os-input" value={draft.email} readOnly aria-readonly="true" />
                    <small>Your sign-in email is managed by your account provider.</small>
                  </label>
                  <div className="os-profile-access"><span>Workspace access</span><strong>{state.currentUser.roleLabel}</strong><small>Access is assigned by the workspace owner.</small></div>
                </div>
              )}

              {profileTab === "notifications" && (
                <div className="os-profile-section">
                  <div className="os-profile-section-head"><strong>Notification routing</strong><span>Only signal that needs your attention.</span></div>
                  <ToggleRow label="Approval inbox" detail="When prepared work is ready for your decision." checked={draft.notifications.approvals} onChange={(checked) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, approvals: checked } }))} />
                  <ToggleRow label="Operating digest" detail="A concise weekly picture of activity and outcomes." checked={draft.notifications.digest} onChange={(checked) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, digest: checked } }))} />
                  <ToggleRow label="Control alerts" detail="Connection or policy issues that need intervention." checked={draft.notifications.alerts} onChange={(checked) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, alerts: checked } }))} />
                </div>
              )}

              {profileTab === "experience" && (
                <div className="os-profile-section">
                  <div className="os-profile-section-head"><strong>Your operating view</strong><span>Set the default context when you return.</span></div>
                  <label className="os-profile-field"><span>Default time range</span><select className="os-input" value={draft.dashboard.timeRange} onChange={(e) => setDraft((d) => ({ ...d, dashboard: { ...d.dashboard, timeRange: e.target.value as "24h" | "7d" | "30d" | "quarter" } }))}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="quarter">This quarter</option></select></label>
                  <label className="os-profile-field"><span>Default focus</span><select className="os-input" value={draft.dashboard.viewMode} onChange={(e) => setDraft((d) => ({ ...d, dashboard: { ...d.dashboard, viewMode: e.target.value as "operator" | "workflow" } }))}><option value="operator">Operators</option><option value="workflow">Workflows</option></select></label>
                </div>
              )}
            </div>

            {profileFeedback && <div style={{ marginTop: 8, fontSize: 12, color: profileFeedback.toLowerCase().includes("could not") ? "#ff8f8f" : "#64ffd7" }}>{profileFeedback}</div>}

            <div className="os-prof-savebar">
              <div style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                {hasProfileChanges ? "Unsaved changes" : "All changes saved"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setProfileOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!hasProfileChanges || savingProfile}
                  style={{ opacity: !hasProfileChanges || savingProfile ? 0.6 : 1 }}
                  onClick={async () => {
                    if (!draft.name.trim()) {
                      setProfileFeedback("Name is required.");
                      return;
                    }
                    setSavingProfile(true);
                    setProfileFeedback("");
                    updateCurrentUser({
                      name: draft.name.trim(),
                      roleLabel: draft.roleLabel.trim(),
                      notifications: { ...draft.notifications },
                    });
                    setDashboardPrefs({ ...draft.dashboard });
                    const result = await saveProfileSettings({
                      workspaceId: state.workspace.id,
                      userId: state.currentUser.id,
                      name: draft.name.trim(),
                      email: draft.email,
                      roleLabel: draft.roleLabel.trim(),
                      initials: draft.name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
                      notifications: draft.notifications,
                      dashboard: draft.dashboard,
                    });
                    setSavingProfile(false);
                    setProfileFeedback(result.message);
                  }}
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
