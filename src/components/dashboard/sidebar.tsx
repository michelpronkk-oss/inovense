"use client";

import Link from "next/link";
import { OSModal } from "@/components/dashboard/modal";
import { FeedbackDialog, openFeedback } from "@/components/dashboard/feedback-dialog";
import { SupportDialog, openSupport } from "@/components/dashboard/support-dialog";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { APP_NAVIGATION_SECTIONS, isAppNavigationActive, mobileMoreSections, type AppNavigationAction, type AppNavigationIcon } from "@/lib/app-navigation";
import { saveProfileSettings } from "@/app/app/profile/actions";
import {
  TargetIcon, CpuIcon, FlowIcon, InboxIcon, DatabaseIcon, LinkIcon,
  DocIcon, ChartIcon, UsersIcon, ShieldIcon, KeyIcon, SettingsIcon, SwapIcon, MessageIcon,
} from "@/components/dashboard/icons";

const NAVIGATION_ICONS: Record<AppNavigationIcon, typeof TargetIcon> = {
  dashboard: TargetIcon, operators: CpuIcon, workflows: FlowIcon, approvals: InboxIcon,
  connectors: LinkIcon, memory: DatabaseIcon, logs: DocIcon, insights: ChartIcon,
  team: UsersIcon, policies: ShieldIcon, apiKeys: KeyIcon, plans: SettingsIcon,
  settings: SettingsIcon, support: MessageIcon, roadmap: DocIcon,
};

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const runNavigationAction = (action: AppNavigationAction) => {
    if (action === "support") openSupport();
    if (action === "feedback") openFeedback();
  };
  const avatarStyle = state.currentUser.avatarUrl ? { backgroundImage: `url(${state.currentUser.avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined;

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setProfileFeedback("Choose a PNG, JPG, WebP, or SVG under 2 MB.");
      return;
    }
    setUploadingAvatar(true);
    setProfileFeedback("");
    const form = new FormData();
    form.set("workspaceId", state.workspace.id);
    form.set("file", file);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const result = await response.json().catch(() => ({} as { avatarUrl?: string; error?: string }));
      if (!response.ok || !result.avatarUrl) throw new Error(result.error || "Could not upload your photo.");
      updateCurrentUser({ avatarUrl: result.avatarUrl });
      setProfileFeedback("Profile photo saved.");
    } catch (error) {
      setProfileFeedback(error instanceof Error ? error.message : "Could not upload your photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

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

      <nav className="os-side-nav" aria-label="App navigation">
        {APP_NAVIGATION_SECTIONS.map((section) => (
          <section className="os-side-section" data-nav-section={section.label.toLowerCase()} key={section.label}>
            <div className="os-side-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = NAVIGATION_ICONS[item.icon];
              const active = Boolean(item.href && isAppNavigationActive(pathname, item.href));
              const badge = item.badge === "pendingApprovals" && pendingApprovals > 0 ? String(pendingApprovals) : undefined;
              const content = <><span className="ico"><Icon size={14} /></span><span>{item.label}</span>{badge && <span className="badge">{badge}</span>}</>;
              return item.href
                ? <Link key={item.id} href={item.href} data-nav-item={item.id} className={`os-nav${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>{content}</Link>
                : <button key={item.id} type="button" data-nav-item={item.id} className={`os-nav os-nav-utility${item.id === "support" ? " is-primary-utility" : ""}`} onClick={() => runNavigationAction(item.action!)}>{content}</button>;
            })}
          </section>
        ))}
      </nav>

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
        <div className="os-avatar" style={avatarStyle}>{state.currentUser.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{state.currentUser.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{state.currentUser.roleLabel}</div>
        </div>
        <SettingsIcon size={13} style={{ color: "var(--text-mute)" }} />
      </button>

      {profileOpen && (
        <OSModal label="Profile settings" onClose={() => setProfileOpen(false)}>
          <div className="os-modal os-profile-modal" style={{ maxWidth: 620, width: "92%", paddingBottom: 76 }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <div>
                <div className="os-profile-eyebrow">Workspace identity</div>
                <h3>Profile settings</h3>
              </div>
              <button className="appr-btn deny" onClick={() => setProfileOpen(false)}>Close</button>
            </div>
            <div className="os-profile-identity">
              <div className="os-profile-avatar" style={avatarStyle}>{state.currentUser.initials}</div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 4px" }}>
                    <div className="os-profile-avatar" style={{ width: 48, height: 48, ...avatarStyle }}>{state.currentUser.initials}</div>
                    <label className="btn btn-ghost btn-sm" style={{ width: "fit-content", cursor: uploadingAvatar ? "wait" : "pointer" }}>
                      {uploadingAvatar ? "Uploading..." : "Change photo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploadingAvatar} onChange={(event) => void uploadAvatar(event.target.files?.[0])} style={{ display: "none" }} />
                    </label>
                  </div>
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
                      avatarUrl: state.currentUser.avatarUrl,
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
        </OSModal>
      )}
      <FeedbackDialog />
      <SupportDialog />
    </aside>
  );
}

/**
 * The desktop rail deliberately disappears before it becomes cramped. This
 * compact bar preserves the high-frequency routes and puts the full command
 * set one tap away, rather than leaving tablet and phone users without nav.
 */
export function OSMobileNav() {
  const pathname = usePathname();
  const { pendingApprovals } = useOS();
  const [open, setOpen] = useState(false);
  const sheetTouchStartY = useRef<number | null>(null);
  const primary = APP_NAVIGATION_SECTIONS[0].items.filter((item) => item.mobilePrimary);
  const groups = mobileMoreSections();
  const runNavigationAction = (action: AppNavigationAction) => {
    setOpen(false);
    if (action === "support") openSupport();
    if (action === "feedback") openFeedback();
  };

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open]);

  return (
    <nav className={`os-mobile-nav${open ? " is-menu-open" : ""}`} aria-label="Primary navigation">
      {primary.map((item) => {
        const Icon = NAVIGATION_ICONS[item.icon];
        const active = Boolean(item.href && isAppNavigationActive(pathname, item.href));
        const badge = item.badge === "pendingApprovals" ? pendingApprovals : 0;
        return (
          <Link key={item.id} href={item.href!} className={`os-mobile-nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="os-mobile-nav-icon"><Icon size={17} />{badge ? <i>{badge}</i> : null}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button type="button" className={`os-mobile-nav-link${open ? " active" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="os-mobile-more-menu" onClick={() => setOpen((value) => !value)}>
        <span className="os-mobile-nav-icon"><SettingsIcon size={17} /></span>
        <span>More</span>
      </button>
      {open && (
        <OSModal id="os-mobile-more-menu" label="More navigation" className="os-mobile-sheet-backdrop" onClose={() => setOpen(false)}>
          <div
            className="os-mobile-menu"
            onTouchStart={(event) => {
              const target = event.target as HTMLElement;
              sheetTouchStartY.current = target.closest(".os-mobile-menu-head, .os-mobile-menu-handle")
                ? event.touches[0]?.clientY ?? null : null;
            }}
            onTouchEnd={(event) => {
              const startY = sheetTouchStartY.current;
              const endY = event.changedTouches[0]?.clientY;
              sheetTouchStartY.current = null;
              if (startY !== null && endY !== undefined && endY - startY > 48) setOpen(false);
            }}
          >
            <div className="os-mobile-menu-handle" aria-hidden="true" />
            <div className="os-mobile-menu-head"><div><strong>More</strong><span>Workspace navigation</span></div><button type="button" onClick={() => setOpen(false)}>Done</button></div>
            <div className="os-mobile-menu-groups">
            {groups.map((group) => (
                <section key={group.label} className="os-mobile-menu-group" data-nav-section={group.label.toLowerCase()}>
                  <h2>{group.label}</h2>
                  <div>
                    {group.items.map((item) => {
                      const Icon = NAVIGATION_ICONS[item.icon];
                      const active = Boolean(item.href && isAppNavigationActive(pathname, item.href));
                      const content = <><span><Icon size={17} /></span><strong>{item.label}</strong><i aria-hidden="true">›</i></>;
                      return item.href
                        ? <Link key={item.id} href={item.href} data-nav-item={item.id} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{content}</Link>
                        : <button key={item.id} type="button" data-nav-item={item.id} className="os-mobile-menu-feedback" onClick={() => runNavigationAction(item.action!)}>{content}</button>;
                    })}
                  </div>
                </section>
            ))}
            </div>
          </div>
        </OSModal>
      )}
    </nav>
  );
}
