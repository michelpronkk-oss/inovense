"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { saveProfileSettings } from "@/app/app/profile/actions";
import {
  TargetIcon, CpuIcon, FlowIcon, InboxIcon, DatabaseIcon, LinkIcon,
  DocIcon, ChartIcon, UsersIcon, ShieldIcon, KeyIcon, SettingsIcon, SwapIcon,
} from "@/components/dashboard/icons";

const AuterimMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Auterim">
    <g fill="#ECEFF3">
      <rect x="10" y="10" width="44" height="9"/>
      <rect x="26" y="19" width="12" height="12"/>
      <rect x="26" y="33" width="12" height="12"/>
      <rect x="10" y="45" width="44" height="9"/>
    </g>
  </svg>
);

const ADMIN_NAV = [
  { icon: UsersIcon, label: "Team", href: "/app/team" },
  { icon: ShieldIcon, label: "Policies", href: "/app/policies" },
  { icon: KeyIcon, label: "API keys", href: "/app/api-keys" },
  { icon: SettingsIcon, label: "Settings", href: "/app/settings" },
];

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

  const agentCount = state.agents.length;
  const workflowCount = state.workflows.length;

  const OPS_NAV = [
    { icon: TargetIcon, label: "Overview", href: "/app" },
    { icon: CpuIcon, label: "Agents", href: "/app/agents", badge: String(agentCount) },
    { icon: FlowIcon, label: "Workflows", href: "/app/workflows", badge: String(workflowCount) },
    { icon: InboxIcon, label: "Approvals", href: "/app/approvals", badge: pendingApprovals > 0 ? String(pendingApprovals) : undefined },
    { icon: DatabaseIcon, label: "Memory", href: "/app/memory" },
    { icon: LinkIcon, label: "Connectors", href: "/app/connectors" },
    { icon: DocIcon, label: "Execution logs", href: "/app/logs" },
    { icon: ChartIcon, label: "Insights", href: "/app/insights" },
  ];

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <aside className="os-side">
      <Link href="/app" className="os-brand">
        <AuterimMark size={18} />
        <span>AUTERIM</span>
      </Link>

      <div className="os-side-ws">
        <div className="os-side-ws-mark">{state.workspace.name.charAt(0)}</div>
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
          <div className="os-modal" style={{ maxWidth: 620, width: "92%", paddingBottom: 68 }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>Profile settings</h3>
              <button className="appr-btn deny" onClick={() => setProfileOpen(false)}>Close</button>
            </div>
            <div className="os-prof-tabs">
              <button className={`os-prof-tab ${profileTab === "profile" ? "active" : ""}`} onClick={() => setProfileTab("profile")}>Profile</button>
              <button className={`os-prof-tab ${profileTab === "notifications" ? "active" : ""}`} onClick={() => setProfileTab("notifications")}>Notifications</button>
              <button className={`os-prof-tab ${profileTab === "experience" ? "active" : ""}`} onClick={() => setProfileTab("experience")}>Experience</button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {profileTab === "profile" && (
                <>
                  <input className="os-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  <input className="os-input" value={draft.email} readOnly />
                  <input className="os-input" value={draft.roleLabel} onChange={(e) => setDraft((d) => ({ ...d, roleLabel: e.target.value }))} />
                </>
              )}

              {profileTab === "notifications" && (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><input type="checkbox" checked={draft.notifications.approvals} onChange={(e) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, approvals: e.target.checked } }))} /> Approval inbox</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><input type="checkbox" checked={draft.notifications.digest} onChange={(e) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, digest: e.target.checked } }))} /> Weekly digest</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><input type="checkbox" checked={draft.notifications.alerts} onChange={(e) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, alerts: e.target.checked } }))} /> Error alerts</label>
                </>
              )}

              {profileTab === "experience" && (
                <>
                  <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Default time range</label>
                  <select className="os-input" value={draft.dashboard.timeRange} onChange={(e) => setDraft((d) => ({ ...d, dashboard: { ...d.dashboard, timeRange: e.target.value as "24h" | "7d" | "30d" | "quarter" } }))}>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="quarter">This quarter</option>
                  </select>
                  <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Default view</label>
                  <select className="os-input" value={draft.dashboard.viewMode} onChange={(e) => setDraft((d) => ({ ...d, dashboard: { ...d.dashboard, viewMode: e.target.value as "operator" | "workflow" } }))}>
                    <option value="operator">Operator view</option>
                    <option value="workflow">Workflow view</option>
                  </select>
                </>
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
